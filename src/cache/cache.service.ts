import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class CacheService {
  private memoryCache = new Map<string, { data: any; expires: number }>();

  // Cache em memória (para Railway sem Redis)
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.memoryCache.set(key, { data: value, expires });
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  // Cache específico para chat
  async getChatMessages(matchId: string): Promise<any[]> {
    return await this.get(`chat:${matchId}`) || [];
  }

  async setChatMessages(matchId: string, messages: any[]): Promise<void> {
    await this.set(`chat:${matchId}`, messages, 300); // 5 minutos
  }

  // Cache para usuários online
  async getOnlineUsers(matchId: string): Promise<string[]> {
    return await this.get(`online:${matchId}`) || [];
  }

  async setOnlineUsers(matchId: string, userIds: string[]): Promise<void> {
    await this.set(`online:${matchId}`, userIds, 60); // 1 minuto
  }

  // Cache para estado das partidas
  async getMatchState(matchId: string): Promise<any> {
    return await this.get(`match:${matchId}`);
  }

  async setMatchState(matchId: string, state: any): Promise<void> {
    await this.set(`match:${matchId}`, state, 30); // 30 segundos
  }

  // Limpeza automática
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Stats do cache
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}
