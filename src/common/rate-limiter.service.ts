import { Injectable } from '@nestjs/common';

interface RateLimitData {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterService {
  private userLimits = new Map<string, RateLimitData>();
  private readonly MAX_MESSAGES_PER_MINUTE = 10; // 10 mensagens por minuto
  private readonly WINDOW_MS = 60 * 1000; // 1 minuto

  isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset ou primeira mensagem
      this.userLimits.set(userId, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return false;
    }

    if (userLimit.count >= this.MAX_MESSAGES_PER_MINUTE) {
      return true; // Rate limited
    }

    // Incrementar contador
    userLimit.count++;
    return false;
  }

  getRemainingMessages(userId: string): number {
    const userLimit = this.userLimits.get(userId);
    if (!userLimit || Date.now() > userLimit.resetTime) {
      return this.MAX_MESSAGES_PER_MINUTE;
    }
    return Math.max(0, this.MAX_MESSAGES_PER_MINUTE - userLimit.count);
  }

  // Limpeza periódica
  cleanup(): void {
    const now = Date.now();
    for (const [userId, data] of this.userLimits.entries()) {
      if (now > data.resetTime) {
        this.userLimits.delete(userId);
      }
    }
  }
}
