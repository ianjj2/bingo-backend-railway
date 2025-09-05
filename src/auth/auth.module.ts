import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'auth',
          ttl: 60000, // 1 minuto
          limit: 5, // 5 tentativas por minuto
        },
      ],
      inject: [ConfigService],
    }),
    EmailModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
