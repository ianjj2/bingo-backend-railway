import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Cadastrar novo usuário',
    description: 'Cria uma nova conta de usuário com CPF, e-mail e senha. Envia e-mail de verificação.',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Usuário criado com sucesso. Verifique seu e-mail para ativar a conta.' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou CPF/e-mail já existente' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ) {
    console.log('🚀 Controller registro recebido:', {
      registerDto,
      cpf: registerDto?.cpf,
      email: registerDto?.email,
      passwordLength: registerDto?.password?.length,
      headers: req.headers['content-type']
    });

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Fazer login',
    description: 'Autentica usuário com CPF e senha. Retorna tokens de acesso e refresh.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            cpf: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['ouro', 'diamante', 'admin'] },
            status: { type: 'string', enum: ['active', 'blocked'] },
            email_verified_at: { type: 'string', nullable: true },
            created_at: { type: 'string' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'CPF ou senha incorretos' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas ou conta bloqueada temporariamente' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Renovar token de acesso',
    description: 'Usa o refresh token para obter um novo access token.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token renovado com sucesso',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Solicitar recuperação de senha',
    description: 'Envia e-mail com link para redefinir senha.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'E-mail de recuperação enviado (se o e-mail existir)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 429, description: 'Muitas tentativas' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    return this.authService.forgotPassword(forgotPasswordDto, ipAddress);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Redefinir senha',
    description: 'Redefine a senha usando token recebido por e-mail.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Senha redefinida com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Senha redefinida com sucesso.' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou nova senha inválida' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    return this.authService.resetPassword(resetPasswordDto, ipAddress);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verificar e-mail',
    description: 'Verifica o e-mail usando token recebido por e-mail.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'E-mail verificado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'E-mail verificado com sucesso.' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obter dados do usuário atual',
    description: 'Retorna informações do usuário autenticado.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados do usuário',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        cpf: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['ouro', 'diamante', 'admin'] },
        status: { type: 'string', enum: ['active', 'blocked'] },
        emailVerified: { type: 'boolean' },
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      cpf: user.cpf,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Fazer logout',
    description: 'Invalida o refresh token do usuário.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout realizado com sucesso.' }
      }
    }
  })
  async logout(@CurrentUser() user: any) {
    // Invalidar refresh token no banco
    // TODO: Implementar invalidação no AuthService
    return {
      message: 'Logout realizado com sucesso.',
    };
  }
}
