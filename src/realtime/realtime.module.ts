import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { MatchesModule } from '../matches/matches.module';
import { CardsModule } from '../cards/cards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MatchesModule, 
    CardsModule, 
    AuditModule
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
