import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';

@Global()
@Module({
  providers: [RateLimiterService],
  exports: [RateLimiterService],
})
export class CommonModule {}
