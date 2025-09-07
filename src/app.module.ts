import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MatchesModule } from './matches/matches.module';
import { CardsModule } from './cards/cards.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuditModule } from './audit/audit.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuração de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Módulos da aplicação
    DatabaseModule,
    // RedisModule, // DESABILITADO - CAUSA TRAVAMENTO SEM REDIS INSTALADO
    EmailModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MatchesModule,
    CardsModule,
    AdminModule,
    RealtimeModule, // ✅ HABILITADO - AGORA SEM REDIS
  ],
  controllers: [AppController], // ✅ ADICIONADO CONTROLLER PRINCIPAL
})
export class AppModule {}
