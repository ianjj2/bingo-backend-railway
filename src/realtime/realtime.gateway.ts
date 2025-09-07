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
import { ChatService } from '../chat/chat.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { PerformanceMonitorService } from '../common/performance-monitor.service';
import { CacheService } from '../cache/cache.service';

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
  private connectedUsers = new Map<string, { userId: string; userData: any; matchId?: string }>();
  private matchUsers = new Map<string, Set<string>>(); // matchId -> Set<socketId>
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly matchesService: MatchesService,
    private readonly cardsService: CardsService,
    private readonly auditService: AuditService,
    private readonly chatService: ChatService,
    private readonly rateLimiter: RateLimiterService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly cache: CacheService,
    private readonly jwtService: JwtService,
  ) {
    // Limpeza automática e monitoramento a cada 5 minutos
    setInterval(() => {
      this.rateLimiter.cleanup();
      this.cache.cleanup();
      
      // Salvar métricas de performance
      const metrics = this.performanceMonitor.getCurrentMetrics(
        this.connectedUsers.size,
        this.matchUsers.size
      );
      this.performanceMonitor.saveMetrics(metrics);
      
      // Log de alertas se houver
      const alerts = this.performanceMonitor.getPerformanceAlerts(metrics);
      if (alerts.length > 0) {
        this.logger.warn(`⚠️ Performance Alerts: ${alerts.join(', ')}`);
      }
    }, 5 * 60 * 1000);
  }

  afterInit(server: Server) {
    this.realtimeService.setServer(server);
    // Redis removido - funcionando em memória local
    this.logger.log('🔌 WebSocket Gateway inicializado sem Redis');   
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`🔌 Nova conexão WebSocket: ${client.id}`);
      
      // TEMPORÁRIO: Desabilitar autenticação para teste
      const userData = {
        id: 'test-user-' + Date.now(),
        role: 'ouro',
      };

      // Registrar conexão otimizada
      this.connectedUsers.set(client.id, { userId: userData.id, userData });
      this.userSockets.set(userData.id, client.id);
      
      // Entrar na sala do usuário
      await client.join(`user:${userData.id}`);
      
      this.logger.log(`👤 Usuário conectado: ${userData.id} (${client.id}) - Total: ${this.connectedUsers.size}`);

      // Enviar dados de conexão
      client.emit('connection.success', {
        userId: userData.id,
        timestamp: new Date().toISOString(),
      });

      // Log de auditoria
      await this.auditService.log({
        type: 'websocket_connected',
        user_id: userData.id,
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
      // Remover de todas as estruturas de dados
      this.connectedUsers.delete(client.id);
      this.userSockets.delete(userConnection.userId);
      
      // Remover das salas de partidas
      if (userConnection.matchId) {
        const matchUsers = this.matchUsers.get(userConnection.matchId);
        if (matchUsers) {
          matchUsers.delete(client.id);
          if (matchUsers.size === 0) {
            this.matchUsers.delete(userConnection.matchId);
          }
        }
      }
      
      this.logger.log(`👤 Usuário desconectado: ${userConnection.userId} (${client.id}) - Total: ${this.connectedUsers.size}`);
      
      // Log de auditoria
      await this.auditService.log({
        type: 'websocket_disconnected',
        user_id: userConnection.userId,
        payload: { socketId: client.id, totalConnected: this.connectedUsers.size },
      });
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
      
      // 🚀 OTIMIZAÇÃO: Gerenciar salas eficientemente
      
      // Sair da partida anterior se existir
      if (userConnection.matchId) {
        await this.removeUserFromMatch(client.id, userConnection.matchId);
      }
      
      // Entrar na sala da partida
      await client.join(`match:${matchId}`);
      
      // Atualizar estruturas de dados otimizadas
      userConnection.matchId = matchId;
      if (!this.matchUsers.has(matchId)) {
        this.matchUsers.set(matchId, new Set());
      }
      this.matchUsers.get(matchId)!.add(client.id);
      
      // 📊 Cache: Buscar dados em paralelo
      const [userCards, matchState, cachedState] = await Promise.all([
        this.cardsService.getUserCards(userConnection.userId, matchId),
        this.matchesService.getMatchState(matchId),
        this.cache.getMatchState(matchId)
      ]);
      
      // Cache do estado para próximas consultas
      await this.cache.setMatchState(matchId, matchState);
      
      // Enviar dados iniciais otimizados
      client.emit('match.joined', {
        matchId,
        userCards,
        matchState: cachedState || matchState,
        connectedUsers: this.matchUsers.get(matchId)!.size,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`🎯 Usuário ${userConnection.userId} entrou na partida ${matchId} - Participantes: ${this.matchUsers.get(matchId)!.size}`);

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

  private async removeUserFromMatch(socketId: string, matchId: string): Promise<void> {
    const matchUsers = this.matchUsers.get(matchId);
    if (matchUsers) {
      matchUsers.delete(socketId);
      if (matchUsers.size === 0) {
        this.matchUsers.delete(matchId);
        // Limpar cache da partida vazia
        await this.cache.del(`match:${matchId}`);
        this.logger.log(`🏁 Partida ${matchId} esvaziou - removida do cache`);
      }
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
    @MessageBody() data: { matchId: string }, // ✅ OBRIGATÓRIO: Apenas chat de partidas
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    // 🚨 VALIDAÇÃO: Chat apenas em partidas específicas
    if (!data.matchId) {
      client.emit('error', { message: 'Chat disponível apenas dentro de partidas' });
      return;
    }

    try {
      const { matchId } = data;
      const chatRoom = `chat:match:${matchId}`;
      
      // Verificar se usuário está na partida (aviso, mas permite conexão)
      if (userConnection.matchId !== matchId) {
        this.logger.warn(`Usuário ${userConnection.userId} tentando acessar chat da partida ${matchId} sem estar nela`);
        client.emit('chat.warning', { message: 'Você deve estar na partida para participar do chat' });
        // Continuar para permitir visualização do histórico
      }
      
      // Entrar na sala de chat
      await client.join(chatRoom);
      
      // 📚 CARREGAR HISTÓRICO DO BANCO DE DADOS
      const startTime = Date.now();
      try {
        const chatHistory = await this.chatService.getMatchMessages(matchId, 50); // Últimas 50 mensagens
        
        // Enviar histórico para o cliente
        client.emit('chat.history', {
          messages: chatHistory,
          matchId,
          total: chatHistory.length,
          timestamp: new Date().toISOString(),
        });
        
        this.performanceMonitor.recordResponseTime(startTime);
        this.logger.log(`📚 Histórico carregado: ${chatHistory.length} mensagens para usuário ${userConnection.userId} na partida ${matchId}`);
      } catch (error) {
        this.logger.error(`❌ Erro ao carregar histórico: ${error.message}`);
        // Continuar mesmo se histórico falhar
        client.emit('chat.history', { messages: [], matchId, total: 0 });
      }
      
      // Confirmar entrada no chat
      client.emit('chat.joined', { 
        room: chatRoom,
        matchId,
        userId: userConnection.userId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`💬 Usuário ${userConnection.userId} entrou no chat da partida ${matchId}`);

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
      matchId: string; // ✅ OBRIGATÓRIO: Apenas chat de partidas
    },
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (!userConnection) {
      client.emit('error', { message: 'Usuário não autenticado' });
      return;
    }

    try {
      const { message, matchId } = data;

      // 🚨 VALIDAÇÃO: Chat apenas em partidas específicas
      if (!matchId) {
        client.emit('error', { message: 'Chat disponível apenas dentro de partidas' });
        return;
      }

      // Verificar se usuário está na partida (obrigatório para enviar mensagens)
      if (userConnection.matchId !== matchId) {
        client.emit('error', { message: 'Você deve estar na partida para enviar mensagens' });
        return;
      }

      // 🚦 RATE LIMITING
      if (this.rateLimiter.isRateLimited(userConnection.userId)) {
        const remaining = this.rateLimiter.getRemainingMessages(userConnection.userId);
        client.emit('error', { 
          message: `Muitas mensagens! Aguarde. Restam: ${remaining}`,
          type: 'rate_limit' 
        });
        return;
      }

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

      // 💾 SALVAR MENSAGEM NO BANCO DE DADOS
      let savedMessage;
      if (matchId) {
        try {
          savedMessage = await this.chatService.createMessage({
            match_id: matchId,
            user_id: userConnection.userId,
            user_name: userData.email.split('@')[0],
            user_tier: userData.role,
            message: message.trim(),
            type: 'text',
          });
          this.logger.log(`💾 Mensagem salva no banco: ${savedMessage.id}`);
        } catch (error) {
          this.logger.error(`❌ Erro ao salvar mensagem: ${error.message}`);
        }
      }

      const chatMessage = {
        id: savedMessage?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user: userData.email.split('@')[0],
        message: message.trim(),
        timestamp: savedMessage?.created_at || new Date().toISOString(),
        userTier: userData.role,
        userId: userConnection.userId,
      };

      // 🚀 BROADCAST OTIMIZADO: Apenas para usuários da mesma partida
      if (matchId) {
        const matchUsers = this.matchUsers.get(matchId);
        if (matchUsers && matchUsers.size > 0) {
          // Enviar para usuários específicos da partida (MUITO mais eficiente)
          matchUsers.forEach(socketId => {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('chat.new_message', chatMessage);
            }
          });
          this.logger.log(`💬 Mensagem enviada para ${matchUsers.size} usuários da partida ${matchId}`);
        }
      } else {
        // Chat global (fallback)
        this.server.to(chatRoom).emit('chat.new_message', chatMessage);
      }

      // 📊 Registrar métricas de performance
      this.performanceMonitor.recordMessage();

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

    // 📊 Stats avançados com performance monitoring
    const performanceStats = this.performanceMonitor.getStatsForAdmin(
      this.connectedUsers.size,
      this.matchUsers.size
    );
    
    client.emit('admin.stats', {
      ...performanceStats,
      matchUsers: Object.fromEntries(
        Array.from(this.matchUsers.entries()).map(([matchId, sockets]) => [
          matchId, 
          sockets.size
        ])
      ),
      cacheStats: this.cache.getStats(),
    });
  }
}
