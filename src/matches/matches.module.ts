import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { AuditModule } from '../audit/audit.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [ConfigModule, AuditModule, CardsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
