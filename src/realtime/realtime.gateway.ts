import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { RealtimeService } from './realtime.service';
import { MatchesService } from '../matches/matches.service';
import { CardsService } from '../cards/cards.service';
import { AuditService } from '../audit/audit.service';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://bravo.bet',
      'https://bravovip.com.br',
      'https://cheerful-empanada-098370.netlify.app',
      /https:\/\/.*\.netlify\.app$/,
    ],
    credentials: true,
  },
  namespace: '/bingo',
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, { userId: string; userData: any }>();

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly matchesService: MatchesService,
    private readonly cardsService: CardsService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
    this.realtimeService.setupRedisSubscriber();
    this.logger.log('🔌 WebSocket Gateway inicializado');
  }

  async handleConnection(client: Socket) {
    try {
      // Extrair token do handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Conexão rejeitada - token não fornecido: ${client.id}`);
        client.disconnect();
        return;
      }

      // Verificar token
      const payload = this.jwtService.verify(token);
      if (!payload.sub) {
        this.logger.warn(`Conexão rejeitada - token inválido: ${client.id}`);
        client.disconnect();
        return;
      }

      // Buscar dados do usuário
      // TODO: Implementar busca de usuário no database
      const userData = {
        id: payload.sub,
        role: 'ouro', // TODO: buscar do banco
      };

      // Registrar conexão
      this.connectedUsers.set(client.id, { userId: payload.sub, userData });
      
      // Entrar na sala do usuário
      await client.join(`user:${payload.sub}`);
      
      this.logger.log(`👤 Usuário conectado: ${payload.sub} (${client.id})`);

      // Enviar dados de conexão
      client.emit('connection.success', {
        userId: payload.sub,
        timestamp: new Date().toISOString(),
      });

      // Log de auditoria
      await this.auditService.log({
        type: 'websocket_connected',
        user_id: payload.sub,
        payload: { socketId: client.id },
      });

    } catch (error) {
      this.logger.error(`Erro na conexão: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userConnection = this.connectedUsers.get(client.id);
    
    if (userConnection) {
      this.logger.log(`👤 Usuário desconectado: ${userConnection.userId} (${client.id})`);
      
      // Log de auditoria
      await this.auditService.log({
        type: 'websocket_disconnected',
        user_id: userConnection.userId,
        payload: { socketId: client.id },
      });
      
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('match.join')
  async handleJoinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      const { matchId } = data;
      
      // Verificar se a partida existe
      await this.matchesService.findOne(matchId);
      
      // Entrar na sala da partida
      await client.join(`match:${matchId}`);
      
      // Buscar cartelas do usuário
      const userCards = await this.cardsService.getUserCards(userConnection.userId, matchId);
      
      // Buscar estado atual da partida
      const matchState = await this.matchesService.getMatchState(matchId);
      
      // Enviar dados iniciais
      client.emit('match.joined', {
        matchId,
        userCards,
        matchState,
      });

      this.logger.log(`🎯 Usuário ${userConnection.userId} entrou na partida ${matchId}`);

      // Log de auditoria
      await this.auditService.log({
        type: 'match_joined',
        user_id: userConnection.userId,
        match_id: matchId,
        payload: { socketId: client.id },
      });

    } catch (error) {
      this.logger.error(`Erro ao entrar na partida: ${error.message}`);
      client.emit('error', { message: 'Erro ao entrar na partida' });
    }
  }

  @SubscribeMessage('match.leave')
  async handleLeaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) return;

    try {
      const { matchId } = data;
      
      // Sair da sala da partida
      await client.leave(`match:${matchId}`);
      
      client.emit('match.left', { matchId });
      
      this.logger.log(`🚪 Usuário ${userConnection.userId} saiu da partida ${matchId}`);

      // Log de auditoria
      await this.auditService.log({
        type: 'match_left',
        user_id: userConnection.userId,
        match_id: matchId,
        payload: { socketId: client.id },
      });

    } catch (error) {
      this.logger.error(`Erro ao sair da partida: ${error.message}`);
    }
  }

  @SubscribeMessage('bingo.claim')
  async handleBingoClaim(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { cardId: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      const { cardId } = data;
      
      // Tentar reivindicar bingo
      const result = await this.cardsService.claimBingo(userConnection.userId, cardId);
      
      // Enviar resultado para o usuário
      client.emit('bingo.claim_result', result);

      if (result.success) {
        this.logger.log(`🎉 BINGO reivindicado por ${userConnection.userId} na cartela ${cardId}`);
        
        // Notificar outros usuários na partida
        // TODO: Buscar matchId da cartela e notificar sala
      }

    } catch (error) {
      this.logger.error(`Erro ao reivindicar bingo: ${error.message}`);
      client.emit('error', { message: 'Erro ao reivindicar bingo' });
    }
  }

  @SubscribeMessage('match.get_state')
  async handleGetMatchState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) return;

    try {
      const { matchId } = data;
      
      // Buscar estado atual
      const matchState = await this.matchesService.getMatchState(matchId);
      
      // Enviar estado para o usuário
      client.emit('match.state', matchState);

    } catch (error) {
      this.logger.error(`Erro ao buscar estado da partida: ${error.message}`);
      client.emit('error', { message: 'Erro ao buscar estado da partida' });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // ========== FUNCIONALIDADES DE CHAT ==========

  @SubscribeMessage('chat.join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId?: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      const chatRoom = data.matchId ? `chat:match:${data.matchId}` : 'chat:global';
      
      // Entrar na sala de chat
      await client.join(chatRoom);
      
      // Confirmar entrada no chat
      client.emit('chat.joined', { 
        room: chatRoom,
        userId: userConnection.userId 
      });

      this.logger.log(`💬 Usuário ${userConnection.userId} entrou no chat: ${chatRoom}`);

      // Notificar outros usuários (opcional)
      client.to(chatRoom).emit('chat.user_joined', {
        userId: userConnection.userId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Erro ao entrar no chat: ${error.message}`);
      client.emit('error', { message: 'Erro ao entrar no chat' });
    }
  }

  @SubscribeMessage('chat.leave')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId?: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) return;

    try {
      const chatRoom = data.matchId ? `chat:match:${data.matchId}` : 'chat:global';
      
      // Sair da sala de chat
      await client.leave(chatRoom);
      
      // Confirmar saída do chat
      client.emit('chat.left', { room: chatRoom });

      this.logger.log(`💬 Usuário ${userConnection.userId} saiu do chat: ${chatRoom}`);

      // Notificar outros usuários (opcional)
      client.to(chatRoom).emit('chat.user_left', {
        userId: userConnection.userId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Erro ao sair do chat: ${error.message}`);
    }
  }

  @SubscribeMessage('chat.send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      message: string;
      matchId?: string;
    },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      const { message, matchId } = data;

      // Validar mensagem
      if (!message || message.trim().length === 0) {
        client.emit('error', { message: 'Mensagem não pode estar vazia' });
        return;
      }

      if (message.length > 200) {
        client.emit('error', { message: 'Mensagem muito longa (máximo 200 caracteres)' });
        return;
      }

      const chatRoom = matchId ? `chat:match:${matchId}` : 'chat:global';

      // TODO: Buscar dados completos do usuário do banco
      // Por enquanto, usar dados básicos
      const userData = {
        id: userConnection.userId,
        email: 'usuario@exemplo.com', // TODO: buscar do banco
        role: userConnection.userData.role || 'ouro',
      };

      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user: userData.email.split('@')[0],
        message: message.trim(),
        timestamp: new Date().toISOString(),
        userTier: userData.role,
        userId: userConnection.userId,
      };

      // Enviar mensagem para todos na sala (incluindo o remetente)
      this.server.to(chatRoom).emit('chat.new_message', chatMessage);

      this.logger.log(`💬 Mensagem enviada por ${userConnection.userId} no chat ${chatRoom}: ${message.substring(0, 50)}...`);

      // Log de auditoria
      await this.auditService.log({
        type: 'chat_message_sent',
        user_id: userConnection.userId,
        match_id: matchId,
        payload: { 
          message: message.trim(),
          chatRoom,
          messageLength: message.length 
        },
      });

      // Gerar respostas automáticas do sistema (opcional)
      await this.generateSystemResponse(chatRoom, message, matchId);

    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`);
      client.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  }

  @SubscribeMessage('chat.typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      isTyping: boolean;
      matchId?: string;
    },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) return;

    try {
      const { isTyping, matchId } = data;
      const chatRoom = matchId ? `chat:match:${matchId}` : 'chat:global';

      // Notificar outros usuários sobre o status de digitação
      client.to(chatRoom).emit('chat.user_typing', {
        userId: userConnection.userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Erro no indicador de digitação: ${error.message}`);
    }
  }

  // Método auxiliar para gerar respostas automáticas
  private async generateSystemResponse(chatRoom: string, message: string, matchId?: string) {
    const lowerMessage = message.toLowerCase();
    
    // Aguardar um pouco antes de responder
    setTimeout(async () => {
      let systemResponse = null;

      if (lowerMessage.includes('bingo')) {
        systemResponse = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user: 'Sistema',
          message: '🎉 BINGO! Alguém está com sorte hoje! 🍀',
          timestamp: new Date().toISOString(),
          userTier: 'diamante',
          userId: 'system',
        };
      } else if (lowerMessage.includes('sorte') || lowerMessage.includes('boa sorte')) {
        systemResponse = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user: 'Moderador',
          message: '🍀 Boa sorte para você também! Que venham os prêmios! 💰',
          timestamp: new Date().toISOString(),
          userTier: 'diamante',
          userId: 'moderator',
        };
      } else if (lowerMessage.includes('prêmio') || lowerMessage.includes('premio')) {
        systemResponse = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user: 'Sistema',
          message: '💎 Os prêmios estão esperando! Continue jogando! 🎯',
          timestamp: new Date().toISOString(),
          userTier: 'diamante',
          userId: 'system',
        };
      }

      if (systemResponse) {
        // Enviar resposta do sistema
        this.server.to(chatRoom).emit('chat.new_message', systemResponse);
        
        // Log da resposta automática
        await this.auditService.log({
          type: 'chat_system_response',
          user_id: 'system',
          match_id: matchId,
          payload: { 
            originalMessage: message,
            systemResponse: systemResponse.message,
            chatRoom 
          },
        });
      }
    }, 1000 + Math.random() * 2000); // 1-3 segundos
  }

  // Método para admins forçarem atualizações
  @SubscribeMessage('admin.force_update')
  async handleAdminForceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; type: string },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection || userConnection.userData.role !== 'admin') {
      client.emit('error', { message: 'Acesso negado' });
      return;
    }

    try {
      const { matchId, type } = data;

      if (type === 'match_state') {
        const matchState = await this.matchesService.getMatchState(matchId);
        await this.realtimeService.emitMatchState(matchId, matchState);
      }

      client.emit('admin.update_sent', { matchId, type });
      
      this.logger.log(`🔧 Admin ${userConnection.userId} forçou atualização ${type} para partida ${matchId}`);

    } catch (error) {
      this.logger.error(`Erro na atualização forçada: ${error.message}`);
      client.emit('error', { message: 'Erro na atualização forçada' });
    }
  }

  // Obter estatísticas de conexão
  @SubscribeMessage('admin.get_stats')
  handleGetStats(@ConnectedSocket() client: Socket) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection || userConnection.userData.role !== 'admin') {
      client.emit('error', { message: 'Acesso negado' });
      return;
    }

    const stats = this.realtimeService.getConnectionStats();
    client.emit('admin.stats', {
      ...stats,
      connectedUsers: this.connectedUsers.size,
    });
  }
}
