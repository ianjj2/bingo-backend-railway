import {
  Controller,
  Get,
  Post,
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

import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get('my')
  @ApiOperation({
    summary: 'Obter minhas cartelas',
    description: 'Retorna as cartelas do usuário para uma partida específica.',
  })
  @ApiQuery({ 
    name: 'matchId', 
    description: 'ID da partida',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Cartelas do usuário',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          card_index: { type: 'number' },
          numbers: { type: 'array', items: { type: 'number' } },
          marked: { type: 'array', items: { type: 'number' } },
          is_winner: { type: 'boolean' },
          bingo_draw_index: { type: 'number', nullable: true },
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async getMyCards(
    @Query('matchId') matchId: string,
    @CurrentUser() user: any,
  ) {
    return this.cardsService.getUserCards(user.id, matchId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes de uma cartela',
    description: 'Retorna detalhes de uma cartela específica. Usuários só podem ver suas próprias cartelas.',
  })
  @ApiParam({ name: 'id', description: 'ID da cartela' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da cartela',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        card_index: { type: 'number' },
        numbers: { type: 'array', items: { type: 'number' } },
        marked: { type: 'array', items: { type: 'number' } },
        is_winner: { type: 'boolean' },
        bingo_draw_index: { type: 'number', nullable: true },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cartela não encontrada' })
  async getCard(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // Usuários normais só podem ver suas próprias cartelas
    const userId = user.role === 'admin' ? undefined : user.id;
    return this.cardsService.getCardDetails(id, userId);
  }

  @Get('match/:matchId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Obter todas as cartelas de uma partida',
    description: 'Retorna todas as cartelas de uma partida específica. Apenas admins.',
  })
  @ApiParam({ name: 'matchId', description: 'ID da partida' })
  @ApiQuery({ 
    name: 'userId', 
    description: 'Filtrar por usuário específico',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Cartelas da partida',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        winners: { type: 'number' },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              card_index: { type: 'number' },
              numbers: { type: 'array', items: { type: 'number' } },
              marked: { type: 'array', items: { type: 'number' } },
              is_winner: { type: 'boolean' },
              bingo_draw_index: { type: 'number', nullable: true },
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async getMatchCards(
    @Param('matchId') matchId: string,
    @Query('userId') userId?: string,
  ) {
    return this.cardsService.getMatchCards(matchId, userId);
  }

  @Post('generate/:matchId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gerar cartelas para uma partida',
    description: 'Gera cartelas automaticamente para todos os usuários ativos em uma partida. Apenas admins.',
  })
  @ApiParam({ name: 'matchId', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Cartelas geradas com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cartelas geradas com sucesso' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas admins' })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async generateCards(@Param('matchId') matchId: string) {
    await this.cardsService.generateCardsForMatch(matchId);
    return { message: 'Cartelas geradas com sucesso' };
  }

  @Get('winners/:matchId')
  @ApiOperation({
    summary: 'Obter vencedores de uma partida',
    description: 'Retorna lista de vencedores de uma partida específica.',
  })
  @ApiParam({ name: 'matchId', description: 'ID da partida' })
  @ApiResponse({
    status: 200,
    description: 'Lista de vencedores',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          card_id: { type: 'string' },
          card_index: { type: 'number' },
          bingo_draw_index: { type: 'number' },
          bingo_claimed_at: { type: 'string' },
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Partida não encontrada' })
  async getWinners(@Param('matchId') matchId: string) {
    return this.cardsService.getWinners(matchId);
  }
}

// Controller separado para ações de bingo (claim)
@ApiTags('bingo')
@Controller('bingo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BingoController {
  constructor(private readonly cardsService: CardsService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reivindicar bingo',
    description: 'Permite ao usuário reivindicar bingo em uma cartela específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da reivindicação',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Cartela não encontrada' })
  async claimBingo(
    @Body() body: { cardId: string },
    @CurrentUser() user: any,
  ) {
    return this.cardsService.claimBingo(user.id, body.cardId);
  }
}
