import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'cpf',
      passwordField: 'password',
    });
  }

  async validate(cpf: string, password: string): Promise<any> {
    try {
      const result = await this.authService.login({ cpf, password });
      return result.user;
    } catch (error) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
  }
}
