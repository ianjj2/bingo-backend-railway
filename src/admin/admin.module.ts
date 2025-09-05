import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [ConfigModule, AuditModule, UsersModule, MatchesModule, CardsModule],
  controllers: [AdminController, WhitelistController],
  providers: [AdminService, WhitelistService],
  exports: [AdminService, WhitelistService],
})
export class AdminModule {}
