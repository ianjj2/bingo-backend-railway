import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async query(sql: string, params?: any[]): Promise<any[]> {
    try {
      // Para Supabase, vamos usar RPC ou tabelas diretamente
      // Por enquanto, vou simular uma interface SQL-like
      console.log('🗄️ Database Query:', sql, params);
      
      // Aqui implementaríamos a lógica específica do Supabase
      // Por simplicidade, vou retornar array vazio por enquanto
      return [];
    } catch (error) {
      console.error('❌ Database Error:', error);
      throw error;
    }
  }

  // Métodos específicos para cada tabela
  async insertChatMessage(data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from('chat_messages')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async getChatMessages(matchId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async getRecentChatMessages(matchId: string, since: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .gt('created_at', since)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deleteChatMessage(messageId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    return !error;
  }

  async getChatMessageCount(matchId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    if (error) throw error;
    return count || 0;
  }
}
