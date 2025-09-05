import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
