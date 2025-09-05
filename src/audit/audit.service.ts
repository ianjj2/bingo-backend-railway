import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface AuditLogEntry {
  type: string;
  user_id?: string;
  match_id?: string;
  payload: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.supabase
        .from('event_log')
        .insert({
          type: entry.type,
          user_id: entry.user_id || null,
          match_id: entry.match_id || null,
          payload: entry.payload,
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null,
        });
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Não falhar a operação principal por causa do log
    }
  }

  async getLogs(filters?: {
    user_id?: string;
    match_id?: string;
    type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let query = this.supabase
      .from('event_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.match_id) {
      query = query.eq('match_id', filters.match_id);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    return data || [];
  }

  async getEventTypes(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('event_log')
      .select('type')
      .limit(1000);

    if (error) {
      throw new Error(`Erro ao buscar tipos de evento: ${error.message}`);
    }

    // Retornar tipos únicos
    const types = [...new Set(data?.map(item => item.type) || [])];
    return types.sort();
  }

  async getUserActivity(userId: string, limit: number = 50): Promise<any[]> {
    return this.getLogs({
      user_id: userId,
      limit,
    });
  }

  async getMatchActivity(matchId: string, limit: number = 100): Promise<any[]> {
    return this.getLogs({
      match_id: matchId,
      limit,
    });
  }

  async getSecurityEvents(limit: number = 100): Promise<any[]> {
    const securityEventTypes = [
      'failed_login',
      'user_locked',
      'password_reset_requested',
      'password_reset_completed',
      'email_verified',
      'admin_action',
      'suspicious_activity',
    ];

    const { data, error } = await this.supabase
      .from('event_log')
      .select('*')
      .in('type', securityEventTypes)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar eventos de segurança: ${error.message}`);
    }

    return data || [];
  }
}
