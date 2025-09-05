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
