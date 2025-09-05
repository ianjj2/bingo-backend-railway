import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
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

import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { MatchStatus } from '../types/database.types';

@ApiTags('matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Criar nova partida',
    description: 'Cria uma nova partida de bingo com configurações específicas. Apenas admins.',
  })
  @ApiResponse({
    status: 201,
    description: 'Partida criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['scheduled', 'live', 'paused', 'finished'] },
        num_min: { type: 'number' },
        num_max: { type: 'number' },
        numbers_per_card: { type: 'number' },
        win_pattern: { type: 'string' },
        auto_draw: { type: 'boolean' },
        auto_draw_interval: { type: 'number' },
        max_winners: { type: 'number', nullable: true },
        started_at: { type: 'string', nullable: true },
        ended_at: { type: 'string', nullable: true },
        created_at: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  async create(
    @Body() createMatchDto: CreateMatchDto,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.create(createMatchDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar partidas',
    description: 'Lista todas as partidas com filtros opcionais.',
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: ['scheduled', 'live', 'paused', 'finished'],
    description: 'Filtrar por status da partida'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Limite de resultados (padrão: 50)'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Offset para paginação (padrão: 0)'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de partidas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          num_min: { type: 'number' },
          num_max: { type: 'number' },
          numbers_per_card: { type: 'number' },
          created_at: { type: 'string' },
        }
      }
    }
  })
  async findAll(
    @Query('status') status?: MatchStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.matchesService.findAll({
      status,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter partida por ID',
    description: 'Retorna detalhes de uma partida específica.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da partida',
  })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Atualizar partida',
    description: 'Atualiza configurações de uma partida. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Partida atualizada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  @ApiResponse({ status: 409, description: 'Partida já finalizada' })
  async update(
    @Param('id') id: string,
    @Body() updateMatchDto: UpdateMatchDto,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.update(id, updateMatchDto, user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar partida',
    description: 'Inicia uma partida agendada. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Partida iniciada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        state: {
          type: 'object',
          properties: {
            match_id: { type: 'string' },
            status: { type: 'string' },
            draws: { type: 'array' },
            winners: { type: 'array' },
            total_cards: { type: 'number' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  @ApiResponse({ status: 409, description: 'Partida não pode ser iniciada' })
  async start(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.start(id, user.id);
  }

  @Post(':id/pause')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pausar partida',
    description: 'Pausa uma partida ativa. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Partida pausada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Partida pausada' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async pause(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.pause(id, user.id);
  }

  @Post(':id/resume')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retomar partida',
    description: 'Retoma uma partida pausada. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Partida retomada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Partida retomada' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async resume(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.resume(id, user.id);
  }

  @Post(':id/finish')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar partida',
    description: 'Finaliza uma partida ativa ou pausada. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Partida finalizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Partida finalizada' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async finish(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.finish(id, user.id);
  }

  @Post(':id/draw/next')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sortear próximo número',
    description: 'Sorteia o próximo número da partida. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Número sorteado com sucesso',
    schema: {
      type: 'object',
      properties: {
        draw: {
          type: 'object',
          properties: {
            draw_index: { type: 'number' },
            number: { type: 'number' },
            created_at: { type: 'string' },
          }
        },
        isGameOver: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  @ApiResponse({ status: 409, description: 'Partida não está ativa ou todos os números foram sorteados' })
  async drawNext(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.drawNext(id, user.id);
  }

  @Post(':id/draw/manual')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sortear número manual',
    description: 'Registra um número sorteado manualmente (evento presencial). Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Número manual registrado com sucesso',
    schema: {
      type: 'object',
      properties: {
        draw: {
          type: 'object',
          properties: {
            draw_index: { type: 'number' },
            number: { type: 'number' },
            created_at: { type: 'string' },
          }
        },
        isGameOver: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Número inválido ou já sorteado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  @ApiResponse({ status: 409, description: 'Partida não está ativa' })
  async drawManual(
    @Param('id') id: string,
    @Body() body: { number: number },
    @CurrentUser() user: any,
  ) {
    return this.matchesService.drawManual(id, body.number, user.id);
  }

  @Post(':id/draw/undo')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desfazer último sorteio',
    description: 'Remove o último número sorteado da partida. Apenas admins.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Último sorteio desfeito com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Último sorteio desfeito' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Nenhum número foi sorteado ainda' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async undoLastDraw(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchesService.undoLastDraw(id, user.id);
  }

  @Get(':id/state')
  @ApiOperation({
    summary: 'Obter estado da partida',
    description: 'Retorna o estado atual da partida com números sorteados, vencedores, etc.',
  })
  @ApiParam({ name: 'id', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Estado atual da partida',
    schema: {
      type: 'object',
      properties: {
        match_id: { type: 'string' },
        status: { type: 'string' },
        draws: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              draw_index: { type: 'number' },
              number: { type: 'number' },
              created_at: { type: 'string' },
            }
          }
        },
        winners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              card_id: { type: 'string' },
              draw_index: { type: 'number' },
            }
          }
        },
        total_cards: { type: 'number' },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async getState(@Param('id') id: string) {
    return this.matchesService.getMatchState(id);
  }
}
