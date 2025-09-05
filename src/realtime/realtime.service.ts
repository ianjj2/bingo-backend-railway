import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
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

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClientType,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  // Enviar estado completo da partida
  async emitMatchState(matchId: string, state: MatchStateEvent) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('match.state', state);

    // Publicar no Redis para outros servidores
    await this.publishToRedis('match.state', {
      room,
      data: state,
    });
  }

  // Notificar novo número sorteado
  async emitDrawNew(matchId: string, event: DrawNewEvent) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('draw.new', event);

    // Publicar no Redis
    await this.publishToRedis('draw.new', {
      room,
      data: event,
    });
  }

  // Notificar cartelas atualizadas
  async emitCardUpdates(matchId: string, updates: CardUpdateEvent[]) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    
    for (const update of updates) {
      this.server.to(room).emit('card.update', update);
    }

    // Publicar no Redis
    await this.publishToRedis('card.updates', {
      room,
      data: updates,
    });
  }

  // Notificar usuários próximos do bingo (faltando 1 número)
  async emitNearWinEvents(matchId: string, events: NearWinEvent[]) {
    if (!this.server) return;

    for (const event of events) {
      // Enviar apenas para o usuário específico
      const userRoom = `user:${event.user_id}`;
      this.server.to(userRoom).emit('near_win', event);
    }

    // Publicar no Redis
    await this.publishToRedis('near_win.events', {
      data: events,
    });
  }

  // Notificar bingos validados
  async emitBingoEvents(matchId: string, events: BingoValidatedEvent[]) {
    if (!this.server) return;

    const room = `match:${matchId}`;

    for (const event of events) {
      // Enviar para toda a sala
      this.server.to(room).emit('bingo.validated', event);
      
      // Enviar celebração especial para o usuário vencedor
      const userRoom = `user:${event.user_id}`;
      this.server.to(userRoom).emit('bingo.celebration', {
        ...event,
        message: '🎉 BINGO! Parabéns, você ganhou!',
      });
    }

    // Publicar no Redis
    await this.publishToRedis('bingo.validated', {
      room,
      data: events,
    });
  }

  // Notificar mudança de status da partida
  async emitMatchStatusChange(matchId: string, status: string, data?: any) {
    if (!this.server) return;

    const room = `match:${matchId}`;
    this.server.to(room).emit('match.status_change', {
      match_id: matchId,
      status,
      ...data,
    });

    // Publicar no Redis
    await this.publishToRedis('match.status_change', {
      room,
      data: { match_id: matchId, status, ...data },
    });
  }

  // Notificar erro/aviso para usuários específicos
  async emitUserNotification(userId: string, type: 'info' | 'warning' | 'error', message: string, data?: any) {
    if (!this.server) return;

    const userRoom = `user:${userId}`;
    this.server.to(userRoom).emit('notification', {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  // Notificar avisos globais (manutenção, etc.)
  async emitGlobalNotification(type: 'info' | 'warning' | 'error', message: string, data?: any) {
    if (!this.server) return;

    this.server.emit('global.notification', {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    });

    // Publicar no Redis
    await this.publishToRedis('global.notification', {
      data: { type, message, timestamp: new Date().toISOString(), ...data },
    });
  }

  // Obter estatísticas de conexões
  getConnectionStats(): {
    totalConnections: number;
    rooms: { [room: string]: number };
  } {
    if (!this.server) {
      return { totalConnections: 0, rooms: {} };
    }

    const totalConnections = this.server.sockets.sockets.size;
    const rooms: { [room: string]: number } = {};

    // Contar usuários por sala
    this.server.sockets.adapter.rooms.forEach((sockets, room) => {
      // Filtrar salas que não são IDs de socket individuais
      if (!room.includes(':')) return;
      rooms[room] = sockets.size;
    });

    return { totalConnections, rooms };
  }

  // Forçar desconexão de um usuário
  async disconnectUser(userId: string, reason?: string) {
    if (!this.server) return;

    const userRoom = `user:${userId}`;
    
    // Enviar notificação antes de desconectar
    if (reason) {
      await this.emitUserNotification(userId, 'warning', reason);
    }

    // Desconectar todos os sockets do usuário
    const socketsInRoom = await this.server.in(userRoom).fetchSockets();
    for (const socket of socketsInRoom) {
      socket.disconnect(true);
    }
  }

  // Publicar evento no Redis para outros servidores
  private async publishToRedis(event: string, data: any) {
    try {
      await this.redis.publish('bingo:events', JSON.stringify({
        event,
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Erro ao publicar no Redis:', error);
    }
  }

  // Processar eventos recebidos do Redis
  async handleRedisEvent(event: string, data: any) {
    if (!this.server) return;

    switch (event) {
      case 'match.state':
        this.server.to(data.room).emit('match.state', data.data);
        break;
        
      case 'draw.new':
        this.server.to(data.room).emit('draw.new', data.data);
        break;
        
      case 'card.updates':
        for (const update of data.data) {
          this.server.to(data.room).emit('card.update', update);
        }
        break;
        
      case 'near_win.events':
        for (const nearWinEvent of data.data) {
          const userRoom = `user:${nearWinEvent.user_id}`;
          this.server.to(userRoom).emit('near_win', nearWinEvent);
        }
        break;
        
      case 'bingo.validated':
        for (const bingoEvent of data.data) {
          this.server.to(data.room).emit('bingo.validated', bingoEvent);
          
          const userRoom = `user:${bingoEvent.user_id}`;
          this.server.to(userRoom).emit('bingo.celebration', {
            ...bingoEvent,
            message: '🎉 BINGO! Parabéns, você ganhou!',
          });
        }
        break;
        
      case 'match.status_change':
        this.server.to(data.room).emit('match.status_change', data.data);
        break;
        
      case 'global.notification':
        this.server.emit('global.notification', data.data);
        break;
    }
  }

  // Configurar subscriber do Redis (opcional)
  async setupRedisSubscriber() {
    try {
      // Verificar se o Redis é um mock (não conectado)
      if (!this.redis || typeof this.redis.duplicate !== 'function') {
        console.log('⚠️ Redis não disponível - WebSocket funcionará apenas localmente');
        return;
      }

      const subscriber = this.redis.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe('bingo:events', (message) => {
        try {
          const { event, data } = JSON.parse(message);
          this.handleRedisEvent(event, data);
        } catch (error) {
          console.error('Erro ao processar evento do Redis:', error);
        }
      });

      console.log('✅ Redis subscriber configurado');
    } catch (error) {
      console.log('⚠️ Redis não disponível - WebSocket funcionará apenas localmente');
      // Não lançar erro - continuar sem Redis
    }
  }
}
