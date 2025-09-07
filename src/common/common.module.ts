import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { PerformanceMonitorService } from './performance-monitor.service';

@Global()
@Module({
  providers: [RateLimiterService, PerformanceMonitorService],
  exports: [RateLimiterService, PerformanceMonitorService],
})
export class CommonModule {}
