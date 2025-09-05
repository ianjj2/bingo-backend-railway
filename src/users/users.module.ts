import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
