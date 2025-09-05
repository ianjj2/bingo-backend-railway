import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from '../types/database.types';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar usuários',
    description: 'Lista todos os usuários com filtros opcionais. Apenas admins.',
  })
  @ApiQuery({ 
    name: 'role', 
    required: false, 
    enum: ['ouro', 'diamante', 'admin'],
    description: 'Filtrar por role'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['active', 'blocked'],
    description: 'Filtrar por status'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Limite de resultados'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Offset para paginação'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários',
    schema: {
      type: 'array',
      items: {
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
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  async findAll(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.usersService.findAll({
      role,
      status,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Obter estatísticas de usuários',
    description: 'Retorna estatísticas gerais dos usuários. Apenas admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de usuários',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        by_role: {
          type: 'object',
          properties: {
            ouro: { type: 'number' },
            diamante: { type: 'number' },
            admin: { type: 'number' },
          }
        },
        by_status: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            blocked: { type: 'number' },
          }
        },
        verified: { type: 'number' },
        recent: { type: 'number' },
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  async getStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Obter usuário por ID',
    description: 'Retorna detalhes de um usuário específico. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do usuário',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        cpf: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        email_verified_at: { type: 'string', nullable: true },
        created_at: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Atualizar role do usuário',
    description: 'Altera o role de um usuário (ouro/diamante/admin). Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Role atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        cpf: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        email_verified_at: { type: 'string', nullable: true },
        created_at: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @CurrentUser() admin: any,
  ) {
    return this.usersService.updateRole(id, body.role, admin.id);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Atualizar status do usuário',
    description: 'Altera o status de um usuário (active/blocked). Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        cpf: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        email_verified_at: { type: 'string', nullable: true },
        created_at: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
    @CurrentUser() admin: any,
  ) {
    return this.usersService.updateStatus(id, body.status, admin.id);
  }
}
