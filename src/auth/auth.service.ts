import { 
  Injectable, 
  Inject, 
  ConflictException, 
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

import { hashPassword, verifyPassword, validatePassword } from '../utils/password.util';
import { validateCpf } from '../utils/cpf.util';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

import { User, UserResponse } from '../types/database.types';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<{ message: string }> {
    const { cpf, email, password } = registerDto;

    console.log('🔍 Debug registro:', { cpf, email, passwordLength: password?.length });

    // Apenas limpar CPF, sem validar por enquanto
    console.log('✅ CPF recebido:', cpf);

    // Validar se CPF está na whitelist
    const cleanCpf = cpf.replace(/[^0-9]/g, ''); // Remove formatação
    const whitelistCheck = await this.supabase
      .from('cpf_whitelist')
      .select('cpf, tier, ativo')
      .eq('cpf', cleanCpf)
      .eq('ativo', true)
      .single();

    if (whitelistCheck.error || !whitelistCheck.data) {
      console.log('❌ CPF não autorizado:', cleanCpf, whitelistCheck.error);
      throw new UnauthorizedException('CPF não autorizado para cadastro. Entre em contato com o suporte.');
    }

    const userTier = whitelistCheck.data.tier;
    console.log('✅ CPF autorizado:', cleanCpf, 'Tier:', userTier);

    // Validação de senha simplificada
    if (!password || password.length < 4) {
      console.log('❌ Senha muito simples');
      throw new BadRequestException('Senha deve ter pelo menos 4 caracteres.');
    }
    console.log('✅ Senha aceita');

    // Verificar se CPF já existe
    const { data: existingCpf } = await this.supabase
      .from('users')
      .select('id')
      .eq('cpf', cpf)
      .single();

    if (existingCpf) {
      throw new ConflictException('Já existe uma conta com este CPF.');
    }

    // Verificar se e-mail já existe
    const { data: existingEmail } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      throw new ConflictException('E-mail já em uso.');
    }

    // Hash da senha
    const passwordHash = await hashPassword(password);

    // Criar usuário
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        cpf,
        email,
        password_hash: passwordHash,
        role: 'user',
        tier: userTier, // Tier da whitelist (DIAMANTE, etc)
        status: 'active',
      })
      .select('id, cpf, email, role, tier, status, created_at')
      .single();

    if (error) {
      throw new BadRequestException('Erro ao criar usuário.');
    }

    // Gerar token de verificação de e-mail
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

    await this.supabase
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    // Enviar e-mail de verificação
    await this.emailService.sendEmailVerification(email, token);

    // Log de auditoria
    await this.auditService.log({
      type: 'user_registered',
      user_id: user.id,
      payload: { cpf, email, role: 'ouro' },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return {
      message: 'Usuário criado com sucesso. Verifique seu e-mail para ativar a conta.',
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }> {
    const { cpf, password } = loginDto;

    // Verificar rate limiting (TEMPORARIAMENTE DESABILITADO)
    // await this.checkRateLimit(cpf, 'login');

    // Buscar usuário
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (error || !user) {
      await this.recordFailedLogin(cpf, ipAddress);
      throw new UnauthorizedException('CPF ou senha incorretos.');
    }

    // Verificar se a conta está bloqueada
    if (user.status === 'blocked') {
      throw new UnauthorizedException('Sua conta está bloqueada. Entre em contato com o suporte.');
    }

    // Verificar se a conta está temporariamente bloqueada (TEMPORARIAMENTE DESABILITADO)
    // if (user.locked_until && new Date() < new Date(user.locked_until)) {
    //   const remainingTime = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    //   throw new HttpException(
    //     `Sua conta está temporariamente bloqueada por tentativas excessivas. Tente novamente em ${remainingTime} minutos.`,
    //     HttpStatus.TOO_MANY_REQUESTS
    //   );
    // }

    // Verificar senha
    const isPasswordValid = await verifyPassword(user.password_hash, password);
    if (!isPasswordValid) {
      await this.recordFailedLogin(cpf, ipAddress);
      throw new UnauthorizedException('CPF ou senha incorretos.');
    }

    // Verificar se e-mail foi verificado
    if (!user.email_verified_at) {
      throw new UnauthorizedException('Confirme seu e-mail para continuar.');
    }

    // Reset dos failed attempts
    if (user.failed_login_attempts > 0) {
      await this.supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
        })
        .eq('id', user.id);
    }

    // Gerar tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    // Salvar refresh token
    await this.supabase
      .from('users')
      .update({ refresh_token: refreshToken })
      .eq('id', user.id);

    // Log de auditoria
    await this.auditService.log({
      type: 'user_login',
      user_id: user.id,
      payload: { cpf },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        cpf: user.cpf,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const { refreshToken } = refreshTokenDto;

    // Buscar usuário pelo refresh token
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, status')
      .eq('refresh_token', refreshToken)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Token de refresh inválido.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Usuário inativo.');
    }

    // Gerar novos tokens
    const tokens = await this.generateTokens(user.id);

    // Atualizar refresh token no banco
    await this.supabase
      .from('users')
      .update({ refresh_token: tokens.refreshToken })
      .eq('id', user.id);

    return tokens;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, ipAddress?: string): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Verificar rate limiting
    await this.checkRateLimit(email, 'forgot_password');

    // Buscar usuário
    const { data: user } = await this.supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    // Sempre retornar sucesso por segurança (não revelar se e-mail existe)
    if (!user) {
      return {
        message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
      };
    }

    // Gerar token de reset
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos

    await this.supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    // Enviar e-mail de reset
    await this.emailService.sendPasswordReset(email, token);

    // Log de auditoria
    await this.auditService.log({
      type: 'password_reset_requested',
      user_id: user.id,
      payload: { email },
      ip_address: ipAddress,
    });

    return {
      message: 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto, ipAddress?: string): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Validar nova senha
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.errors.join('. '));
    }

    // Buscar token válido
    const { data: resetToken, error } = await this.supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !resetToken) {
      throw new BadRequestException('Token de reset inválido.');
    }

    if (resetToken.used) {
      throw new BadRequestException('Token já foi utilizado.');
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      throw new BadRequestException('Token expirado.');
    }

    // Buscar usuário
    const { data: user } = await this.supabase
      .from('users')
      .select('password_hash')
      .eq('id', resetToken.user_id)
      .single();

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await verifyPassword(user.password_hash, newPassword);
    if (isSamePassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual.');
    }

    // Hash da nova senha
    const newPasswordHash = await hashPassword(newPassword);

    // Atualizar senha e invalidar refresh tokens
    await this.supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        refresh_token: null,
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', resetToken.user_id);

    // Marcar token como usado
    await this.supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id);

    // Log de auditoria
    await this.auditService.log({
      type: 'password_reset_completed',
      user_id: resetToken.user_id,
      payload: { token_id: resetToken.id },
      ip_address: ipAddress,
    });

    return {
      message: 'Senha redefinida com sucesso.',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { token } = verifyEmailDto;

    // Buscar token válido
    const { data: verificationToken, error } = await this.supabase
      .from('email_verification_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !verificationToken) {
      throw new BadRequestException('Token de verificação inválido.');
    }

    if (verificationToken.used) {
      throw new BadRequestException('Token já foi utilizado.');
    }

    if (new Date() > new Date(verificationToken.expires_at)) {
      throw new BadRequestException('Token expirado.');
    }

    // Marcar e-mail como verificado
    await this.supabase
      .from('users')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', verificationToken.user_id);

    // Marcar token como usado
    await this.supabase
      .from('email_verification_tokens')
      .update({ used: true })
      .eq('id', verificationToken.id);

    // Log de auditoria
    await this.auditService.log({
      type: 'email_verified',
      user_id: verificationToken.user_id,
      payload: { token_id: verificationToken.id },
    });

    return {
      message: 'E-mail verificado com sucesso.',
    };
  }

  private async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
      }
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }
    );

    return { accessToken, refreshToken };
  }

  private async recordFailedLogin(cpf: string, ipAddress?: string): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, failed_login_attempts')
      .eq('cpf', cpf)
      .single();

    if (user) {
      const newAttempts = user.failed_login_attempts + 1;
      let lockedUntil = null;

      // Bloquear temporariamente após 5 tentativas
      if (newAttempts >= 5) {
        lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + Math.pow(2, newAttempts - 4) * 5); // Backoff exponencial
      }

      await this.supabase
        .from('users')
        .update({
          failed_login_attempts: newAttempts,
          locked_until: lockedUntil?.toISOString(),
        })
        .eq('id', user.id);

      // Log de auditoria
      await this.auditService.log({
        type: 'failed_login',
        user_id: user.id,
        payload: { attempts: newAttempts, cpf },
        ip_address: ipAddress,
      });
    }
  }

  private async checkRateLimit(identifier: string, endpoint: string): Promise<void> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + 60 * 1000); // 1 minuto

    // Tentar incrementar tentativas
    const { data: rateLimit } = await this.supabase
      .from('rate_limits')
      .select('attempts, reset_at')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .single();

    if (rateLimit) {
      if (new Date() < new Date(rateLimit.reset_at)) {
        if (rateLimit.attempts >= 5) {
          throw new HttpException('Muitas tentativas. Tente novamente em alguns minutos.', HttpStatus.TOO_MANY_REQUESTS);
        }
        
        await this.supabase
          .from('rate_limits')
          .update({ attempts: rateLimit.attempts + 1 })
          .eq('identifier', identifier)
          .eq('endpoint', endpoint);
      } else {
        // Reset contador
        await this.supabase
          .from('rate_limits')
          .update({
            attempts: 1,
            reset_at: resetAt.toISOString(),
          })
          .eq('identifier', identifier)
          .eq('endpoint', endpoint);
      }
    } else {
      // Criar novo registro
      await this.supabase
        .from('rate_limits')
        .insert({
          identifier,
          endpoint,
          attempts: 1,
          reset_at: resetAt.toISOString(),
        });
    }
  }
}
