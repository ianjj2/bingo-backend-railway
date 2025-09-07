import { Injectable } from '@nestjs/common';

interface PerformanceMetrics {
  connectedUsers: number;
  activeMatches: number;
  messagesPerSecond: number;
  averageResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

@Injectable()
export class PerformanceMonitorService {
  private metrics: PerformanceMetrics[] = [];
  private messageCount = 0;
  private lastMessageTime = Date.now();
  private responseTimes: number[] = [];

  // Métricas atuais
  getCurrentMetrics(connectedUsers: number, activeMatches: number): PerformanceMetrics {
    const now = Date.now();
    const timeDiff = (now - this.lastMessageTime) / 1000; // segundos
    const messagesPerSecond = timeDiff > 0 ? this.messageCount / Math.max(timeDiff, 1) : 0;
    
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    return {
      connectedUsers,
      activeMatches,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  // Registrar mensagem enviada
  recordMessage(): void {
    this.messageCount++;
    
    // Reset counter a cada minuto
    const now = Date.now();
    if (now - this.lastMessageTime > 60000) { // 1 minuto
      this.messageCount = 1;
      this.lastMessageTime = now;
    }
  }

  // Registrar tempo de resposta
  recordResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.responseTimes.push(responseTime);
    
    // Manter apenas últimas 100 medições
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  // Salvar métricas históricas (últimas 24h)
  saveMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Manter apenas últimas 24 horas (1440 minutos)
    if (this.metrics.length > 1440) {
      this.metrics.shift();
    }
  }

  // Obter histórico de métricas
  getMetricsHistory(hours: number = 1): PerformanceMetrics[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this.metrics.filter(m => new Date(m.timestamp) > cutoff);
  }

  // Alertas de performance
  getPerformanceAlerts(metrics: PerformanceMetrics): string[] {
    const alerts: string[] = [];
    
    if (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > 0.85) {
      alerts.push('🚨 ALERTA: Uso de memória > 85%');
    }
    
    if (metrics.averageResponseTime > 500) {
      alerts.push('⏱️ ALERTA: Tempo de resposta > 500ms');
    }
    
    if (metrics.messagesPerSecond > 50) {
      alerts.push('📢 ALERTA: Muitas mensagens por segundo');
    }
    
    if (metrics.connectedUsers > 350) {
      alerts.push('👥 ALERTA: Aproximando do limite de usuários');
    }
    
    return alerts;
  }

  // Stats resumidas para admin
  getStatsForAdmin(connectedUsers: number, activeMatches: number): any {
    const current = this.getCurrentMetrics(connectedUsers, activeMatches);
    const alerts = this.getPerformanceAlerts(current);
    
    return {
      current,
      alerts,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
