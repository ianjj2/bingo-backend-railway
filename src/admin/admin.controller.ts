import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obter estatísticas do dashboard',
    description: 'Retorna estatísticas gerais para o painel administrativo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas do dashboard',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            by_role: { type: 'object' },
            by_status: { type: 'object' },
            verified: { type: 'number' },
            recent: { type: 'number' },
          }
        },
        matches: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active: { type: 'number' },
            scheduled: { type: 'number' },
            finished: { type: 'number' },
          }
        },
        cards: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active_matches: { type: 'number' },
          }
        },
        recent_activity: { type: 'array' },
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Verificar saúde do sistema',
    description: 'Retorna status de saúde dos componentes do sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde do sistema',
    schema: {
      type: 'object',
      properties: {
        database: { type: 'boolean' },
        redis: { type: 'boolean' },
        websocket: { type: 'boolean' },
        email: { type: 'boolean' },
        uptime: { type: 'number' },
        memory: { type: 'object' },
        errors: { type: 'array', items: { type: 'string' } },
      }
    }
  })
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('export/match/:matchId')
  @ApiOperation({
    summary: 'Exportar dados da partida',
    description: 'Exporta todos os dados de uma partida para auditoria.',
  })
  @ApiParam({ name: 'matchId', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Dados da partida exportados',
    schema: {
      type: 'object',
      properties: {
        match: { type: 'object' },
        draws: { type: 'array' },
        cards: { type: 'array' },
        seeds: { type: 'array' },
        audit_log: { type: 'array' },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async exportMatch(@Param('matchId') matchId: string) {
    return this.adminService.exportMatchData(matchId);
  }

  @Post('cleanup/tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpar tokens expirados',
    description: 'Remove tokens expirados do banco de dados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens limpos com sucesso',
    schema: {
      type: 'object',
      properties: {
        cleaned: { type: 'number' },
      }
    }
  })
  async cleanupTokens() {
    return this.adminService.cleanupExpiredTokens();
  }

  @Get('audit/logs')
  @ApiOperation({
    summary: 'Obter logs de auditoria',
    description: 'Retorna logs de auditoria com filtros opcionais.',
  })
  @ApiQuery({ 
    name: 'user_id', 
    required: false, 
    description: 'Filtrar por usuário'
  })
  @ApiQuery({ 
    name: 'match_id', 
    required: false, 
    description: 'Filtrar por partida'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    description: 'Filtrar por tipo de evento'
  })
  @ApiQuery({ 
    name: 'start_date', 
    required: false, 
    description: 'Data inicial (ISO string)'
  })
  @ApiQuery({ 
    name: 'end_date', 
    required: false, 
    description: 'Data final (ISO string)'
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
    description: 'Logs de auditoria',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          user_id: { type: 'string', nullable: true },
          match_id: { type: 'string', nullable: true },
          payload: { type: 'object' },
          ip_address: { type: 'string', nullable: true },
          user_agent: { type: 'string', nullable: true },
          created_at: { type: 'string' },
        }
      }
    }
  })
  async getAuditLogs(
    @Query('user_id') userId?: string,
    @Query('match_id') matchId?: string,
    @Query('type') type?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.adminService.getAuditLogs({
      user_id: userId,
      match_id: matchId,
      type,
      start_date: startDate,
      end_date: endDate,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  @Get('security/events')
  @ApiOperation({
    summary: 'Obter eventos de segurança',
    description: 'Retorna eventos relacionados à segurança do sistema.',
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Limite de resultados (padrão: 100)'
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos de segurança',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          user_id: { type: 'string', nullable: true },
          payload: { type: 'object' },
          ip_address: { type: 'string', nullable: true },
          created_at: { type: 'string' },
        }
      }
    }
  })
  async getSecurityEvents(
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getSecurityEvents(
      limit ? parseInt(limit.toString()) : 100
    );
  }
}
