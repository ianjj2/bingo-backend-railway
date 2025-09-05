import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [ConfigModule, AuditModule, UsersModule, MatchesModule, CardsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
