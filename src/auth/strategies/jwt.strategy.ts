import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const { sub: userId } = payload;

    // Buscar usuário no banco
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, cpf, email, role, status, email_verified_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Token inválido');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Usuário inativo');
    }

    return {
      id: user.id,
      cpf: user.cpf,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: !!user.email_verified_at,
    };
  }
}
