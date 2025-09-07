import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  MatchStateEvent,
  DrawNewEvent,
  CardUpdateEvent,
  NearWinEvent,
  BingoValidatedEvent,
} from '../types/database.types';

@Injectable()
export class RealtimeService {
  private server: Server;
  private chatMessages: Map<string, any[]> = new Map(); // Chat em memória sem Redis

  constructor() {
    console.log('✅ RealtimeService inicializado sem Redis');
  }

  setServer(server: Server) {
    this.server = server;
  }

  // Emitir estado da partida
  async emitMatchState(matchId: string, state: MatchStateEvent) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('match.state', state);
    console.log(`📡 Broadcast local: match.state para room ${room}`);
  }

  // Notificar novo número sorteado
  async emitDrawNew(matchId: string, event: DrawNewEvent) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('draw.new', event);
    console.log(`📡 Broadcast local: draw.new para room ${room}`);
  }

  // Notificar atualizações de cartelas
  async emitCardUpdates(matchId: string, updates: CardUpdateEvent[]) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('card.updates', updates);
    console.log(`📡 Broadcast local: card.updates para room ${room}`);
  }

  // Notificar eventos de near win
  async emitNearWinEvents(matchId: string, events: NearWinEvent[]) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('near_win', events);
    console.log(`📡 Broadcast local: near_win para room ${room}`);
  }

  // Notificar bingo validado
  async emitBingoValidated(matchId: string, event: BingoValidatedEvent) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('bingo.validated', event);
    console.log(`📡 Broadcast local: bingo.validated para room ${room}`);
  }

  // Notificar mudança de status da partida
  async emitMatchStatusChange(
    matchId: string,
    status: 'waiting' | 'started' | 'finished' | 'cancelled',
    data?: any,
  ) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('match.status_change', { status, data });
    console.log(`📡 Broadcast local: status_change para room ${room}`);
  }

  // Emitir notificação global
  async emitGlobalNotification(
    type: 'info' | 'warning' | 'success' | 'error',
    message: string,
    data?: any,
  ) {
    if (!this.server) return;

    this.server.emit('global.notification', { 
      type, 
      message, 
      timestamp: new Date().toISOString(), 
      ...data 
    });
    console.log(`📡 Broadcast global: ${type} - ${message}`);
  }

  // Chat em memória - substituindo Redis
  saveChatMessage(room: string, message: any) {
    if (!this.chatMessages.has(room)) {
      this.chatMessages.set(room, []);
    }
    this.chatMessages.get(room)!.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
    
    // Manter apenas últimas 100 mensagens por room
    const messages = this.chatMessages.get(room)!;
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
  }

  getChatMessages(room: string): any[] {
    return this.chatMessages.get(room) || [];
  }

  // Emitir mensagem de chat
  async emitChatMessage(room: string, message: any) {
    if (!this.server) return;

    this.saveChatMessage(room, message);
    this.server.to(room).emit('chat.message', message);
    console.log(`💬 Chat message para room ${room}: ${message.content}`);
  }
}