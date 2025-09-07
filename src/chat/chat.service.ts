import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ChatMessage, ChatMessageCreate } from '../types/database.types';

@Injectable()
export class ChatService {
  constructor(private readonly database: DatabaseService) {}

  async createMessage(data: ChatMessageCreate): Promise<ChatMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message: ChatMessage = {
      id,
      match_id: data.match_id,
      user_id: data.user_id,
      user_name: data.user_name,
      user_tier: data.user_tier,
      message: data.message,
      type: data.type || 'text',
      created_at: new Date().toISOString(),
    };

    // Salvar no Supabase
    const result = await this.database.insertChatMessage(message);
    return result;
  }

  async getMatchMessages(matchId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    const messages = await this.database.getChatMessages(matchId, limit, offset);
    return messages.reverse(); // Mais antigas primeiro para exibição
  }

  async getRecentMessages(matchId: string, since: string): Promise<ChatMessage[]> {
    return await this.database.getRecentChatMessages(matchId, since);
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    // TODO: Implementar verificação de permissão (admin ou próprio usuário)
    return await this.database.deleteChatMessage(messageId);
  }

  async getMessageCount(matchId: string): Promise<number> {
    return await this.database.getChatMessageCount(matchId);
  }

  // Limpar mensagens antigas (executar periodicamente)
  async cleanOldMessages(daysOld: number = 30): Promise<number> {
    // TODO: Implementar limpeza de mensagens antigas no Supabase
    console.log(`🧹 Limpeza de mensagens antigas (${daysOld} dias) - TODO`);
    return 0;
  }
}
