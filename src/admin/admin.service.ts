import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { MatchesService } from '../matches/matches.service';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly matchesService: MatchesService,
    private readonly cardsService: CardsService,
  ) {}

  async getDashboardStats(): Promise<{
    users: any;
    matches: {
      total: number;
      active: number;
      scheduled: number;
      finished: number;
    };
    cards: {
      total: number;
      active_matches: number;
    };
    recent_activity: any[];
  }> {
    // Estatísticas de usuários
    const userStats = await this.usersService.getUserStats();

    // Estatísticas de partidas
    const { count: totalMatches } = await this.supabase
      .from('matches')
      .select('*');

    const { count: activeMatches } = await this.supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'live');

    const { count: scheduledMatches } = await this.supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    const { count: finishedMatches } = await this.supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'finished');

    // Estatísticas de cartelas
    const { count: totalCards } = await this.supabase
      .from('cards')
      .select('*');

    const { data: activeMatchesData } = await this.supabase
      .from('matches')
      .select('id')
      .in('status', ['live', 'paused']);

    const activeMatchIds = activeMatchesData?.map(m => m.id) || [];
    
    let activeCardsCount = 0;
    if (activeMatchIds.length > 0) {
      const { count } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .in('match_id', activeMatchIds);
      activeCardsCount = count || 0;
    }

    // Atividade recente
    const recentActivity = await this.auditService.getLogs({
      limit: 20,
    });

    return {
      users: userStats,
      matches: {
        total: totalMatches || 0,
        active: activeMatches || 0,
        scheduled: scheduledMatches || 0,
        finished: finishedMatches || 0,
      },
      cards: {
        total: totalCards || 0,
        active_matches: activeCardsCount,
      },
      recent_activity: recentActivity,
    };
  }

  async exportMatchData(matchId: string): Promise<{
    match: any;
    draws: any[];
    cards: any[];
    seeds: string[];
    audit_log: any[];
  }> {
    // Dados da partida
    const { data: match } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    // Sorteios
    const { data: draws } = await this.supabase
      .from('draws')
      .select('*')
      .eq('match_id', matchId)
      .order('draw_index', { ascending: true });

    // Cartelas
    const { data: cards } = await this.supabase
      .from('cards')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    // Seeds reveladas
    const seeds = match?.seed_public ? JSON.parse(match.seed_public) : [];

    // Log de auditoria da partida
    const auditLog = await this.auditService.getMatchActivity(matchId, 1000);

    return {
      match,
      draws: draws || [],
      cards: cards || [],
      seeds,
      audit_log: auditLog,
    };
  }

  async getSystemHealth(): Promise<{
    database: boolean;
    redis: boolean;
    websocket: boolean;
    email: boolean;
    uptime: number;
    memory: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    const startTime = Date.now();

    // Testar database
    let databaseHealthy = false;
    try {
      const { error } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);
      databaseHealthy = !error;
      if (error) errors.push(`Database: ${error.message}`);
    } catch (error) {
      errors.push(`Database: ${error.message}`);
    }

    // Testar Redis
    let redisHealthy = false;
    try {
      // TODO: Implementar teste de Redis
      redisHealthy = true;
    } catch (error) {
      errors.push(`Redis: ${error.message}`);
    }

    // Status WebSocket
    let websocketHealthy = true; // TODO: Implementar verificação real

    // Status Email
    let emailHealthy = true; // TODO: Implementar verificação real

    // Informações do sistema
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    return {
      database: databaseHealthy,
      redis: redisHealthy,
      websocket: websocketHealthy,
      email: emailHealthy,
      uptime,
      memory,
      errors,
    };
  }

  async cleanupExpiredTokens(): Promise<{ cleaned: number }> {
    const now = new Date().toISOString();
    
    // Limpar tokens de email expirados
    const { count: emailTokens } = await this.supabase
      .from('email_verification_tokens')
      .delete()
      .lt('expires_at', now)
      .select('*');

    // Limpar tokens de reset de senha expirados
    const { count: resetTokens } = await this.supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', now)
      .select('*');

    // Limpar rate limits expirados
    const { count: rateLimits } = await this.supabase
      .from('rate_limits')
      .delete()
      .lt('reset_at', now)
      .select('*');

    const totalCleaned = (emailTokens || 0) + (resetTokens || 0) + (rateLimits || 0);

    return { cleaned: totalCleaned };
  }

  async getAuditLogs(filters?: {
    user_id?: string;
    match_id?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return this.auditService.getLogs(filters);
  }

  async getSecurityEvents(limit: number = 100): Promise<any[]> {
    return this.auditService.getSecurityEvents(limit);
  }
}
