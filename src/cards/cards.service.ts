import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

import { AuditService } from '../audit/audit.service';
import { BingoCardGenerator } from '../utils/random.util';
import {
  Card,
  CardResponse,
  CardUpdateEvent,
  NearWinEvent,
  BingoValidatedEvent,
  UserRole,
} from '../types/database.types';

@Injectable()
export class CardsService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async generateCardsForMatch(matchId: string): Promise<void> {
    // Buscar dados da partida
    const { data: match, error: matchError } = await this.supabase
      .from('matches')
      .select('num_min, num_max, numbers_per_card, seed_public')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new NotFoundException('Partida não encontrada');
    }

    // Buscar usuários ativos
    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('status', 'active')
      .not('email_verified_at', 'is', null);

    if (usersError) {
      throw new BadRequestException('Erro ao buscar usuários');
    }

    if (!users || users.length === 0) {
      return; // Nenhum usuário ativo
    }

    // Obter seed da partida
    const seeds = JSON.parse(match.seed_public || '[]');
    if (seeds.length === 0) {
      throw new BadRequestException('Seeds da partida não encontradas');
    }

    const baseSeed = seeds[0];
    const cardsToInsert: any[] = [];

    // Gerar cartelas para cada usuário
    for (const user of users) {
      const cardCount = user.role === 'diamante' ? 2 : 1;

      for (let cardIndex = 1; cardIndex <= cardCount; cardIndex++) {
        const numbers = BingoCardGenerator.generateCard(
          user.id,
          matchId,
          cardIndex,
          match.numbers_per_card,
          match.num_min,
          match.num_max,
          baseSeed,
        );

        cardsToInsert.push({
          match_id: matchId,
          user_id: user.id,
          card_index: cardIndex,
          numbers,
          marked: [],
        });
      }
    }

    // Inserir cartelas em lote
    if (cardsToInsert.length > 0) {
      const { error: insertError } = await this.supabase
        .from('cards')
        .insert(cardsToInsert);

      if (insertError) {
        throw new BadRequestException(`Erro ao gerar cartelas: ${insertError.message}`);
      }

      // Log de auditoria
      await this.auditService.log({
        type: 'cards_generated',
        match_id: matchId,
        payload: {
          total_cards: cardsToInsert.length,
          users_count: users.length,
        },
      });
    }
  }

  async getUserCards(userId: string, matchId: string): Promise<CardResponse[]> {
    const { data: cards, error } = await this.supabase
      .from('cards')
      .select('id, card_index, numbers, marked, is_winner, bingo_draw_index')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .order('card_index', { ascending: true });

    if (error) {
      throw new BadRequestException(`Erro ao buscar cartelas: ${error.message}`);
    }

    return cards?.map(card => ({
      id: card.id,
      card_index: card.card_index,
      numbers: card.numbers,
      marked: card.marked,
      is_winner: card.is_winner,
      bingo_draw_index: card.bingo_draw_index,
    })) || [];
  }

  async markNumberInCards(matchId: string, number: number, drawIndex: number): Promise<{
    updatedCards: CardUpdateEvent[];
    nearWinEvents: NearWinEvent[];
    bingoEvents: BingoValidatedEvent[];
  }> {
    // Buscar todas as cartelas da partida que contêm o número
    const { data: cards, error } = await this.supabase
      .from('cards')
      .select('id, user_id, numbers, marked, is_winner')
      .eq('match_id', matchId)
      .contains('numbers', [number])
      .eq('is_winner', false);

    if (error) {
      throw new BadRequestException(`Erro ao buscar cartelas: ${error.message}`);
    }

    if (!cards || cards.length === 0) {
      return {
        updatedCards: [],
        nearWinEvents: [],
        bingoEvents: [],
      };
    }

    const updatedCards: CardUpdateEvent[] = [];
    const nearWinEvents: NearWinEvent[] = [];
    const bingoEvents: BingoValidatedEvent[] = [];
    const cardsToUpdate: any[] = [];

    // Processar cada cartela
    for (const card of cards) {
      const newMarked = [...card.marked];
      
      // Adicionar número se ainda não foi marcado
      if (!newMarked.includes(number)) {
        newMarked.push(number);
      }

      const isBingo = newMarked.length === card.numbers.length;
      const isNearWin = newMarked.length === card.numbers.length - 1;

      // Preparar atualização
      const updateData: any = {
        marked: newMarked,
      };

      if (isBingo) {
        updateData.is_winner = true;
        updateData.bingo_draw_index = drawIndex;
        updateData.bingo_claimed_at = new Date().toISOString();
      }

      cardsToUpdate.push({
        id: card.id,
        ...updateData,
      });

      // Preparar eventos
      updatedCards.push({
        card_id: card.id,
        marked: newMarked,
        is_winner: isBingo,
      });

      if (isBingo) {
        bingoEvents.push({
          user_id: card.user_id,
          card_id: card.id,
          draw_index: drawIndex,
        });
      } else if (isNearWin) {
        nearWinEvents.push({
          user_id: card.user_id,
          card_id: card.id,
          missing: 1,
        });
      }
    }

    // Atualizar cartelas no banco
    for (const cardUpdate of cardsToUpdate) {
      const { id, ...updateData } = cardUpdate;
      
      const { error: updateError } = await this.supabase
        .from('cards')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error(`Erro ao atualizar cartela ${id}:`, updateError);
      }
    }

    // Log de auditoria para bingos
    for (const bingoEvent of bingoEvents) {
      await this.auditService.log({
        type: 'bingo_achieved',
        user_id: bingoEvent.user_id,
        match_id: matchId,
        payload: {
          card_id: bingoEvent.card_id,
          draw_index: bingoEvent.draw_index,
          number,
        },
      });
    }

    return {
      updatedCards,
      nearWinEvents,
      bingoEvents,
    };
  }

  async claimBingo(userId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    // Buscar cartela
    const { data: card, error } = await this.supabase
      .from('cards')
      .select('id, user_id, match_id, numbers, marked, is_winner')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (error || !card) {
      throw new NotFoundException('Cartela não encontrada');
    }

    if (card.is_winner) {
      return {
        success: false,
        message: 'Bingo já foi reivindicado para esta cartela',
      };
    }

    // Verificar se realmente é bingo
    const isBingo = card.marked.length === card.numbers.length;
    
    if (!isBingo) {
      return {
        success: false,
        message: 'Esta cartela ainda não fez bingo',
      };
    }

    // Buscar último draw da partida
    const { data: lastDraw } = await this.supabase
      .from('draws')
      .select('draw_index')
      .eq('match_id', card.match_id)
      .order('draw_index', { ascending: false })
      .limit(1)
      .single();

    // Marcar como vencedora
    const { error: updateError } = await this.supabase
      .from('cards')
      .update({
        is_winner: true,
        bingo_draw_index: lastDraw?.draw_index || 0,
        bingo_claimed_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (updateError) {
      throw new BadRequestException('Erro ao registrar bingo');
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'bingo_claimed',
      user_id: userId,
      match_id: card.match_id,
      payload: {
        card_id: cardId,
        draw_index: lastDraw?.draw_index || 0,
      },
    });

    return {
      success: true,
      message: 'Bingo reivindicado com sucesso!',
    };
  }

  async getMatchCards(matchId: string, userId?: string): Promise<{
    total: number;
    winners: number;
    cards: Array<{
      id: string;
      user_id: string;
      card_index: number;
      numbers: number[];
      marked: number[];
      is_winner: boolean;
      bingo_draw_index: number | null;
    }>;
    players: Array<{
      user_id: string;
      email: string;
      cpf: string;
      card_count: number;
      marked_count: number;
      is_near_win: boolean;
      is_winner: boolean;
    }>;
  }> {
    let query = this.supabase
      .from('cards')
      .select(`
        id, 
        user_id, 
        card_index, 
        numbers, 
        marked, 
        is_winner, 
        bingo_draw_index,
        users!inner(email, cpf)
      `)
      .eq('match_id', matchId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: cards, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Erro ao buscar cartelas: ${error.message}`);
    }

    const total = cards?.length || 0;
    const winners = cards?.filter(card => card.is_winner).length || 0;

    // Processar jogadores únicos com suas estatísticas
    const playersMap = new Map();
    cards?.forEach((card: any) => {
      const userId = card.user_id;
      if (!playersMap.has(userId)) {
        playersMap.set(userId, {
          user_id: userId,
          email: card.users?.email || 'Email não disponível',
          cpf: card.users?.cpf || 'CPF não disponível',
          card_count: 0,
          marked_count: 0,
          is_near_win: false,
          is_winner: false,
        });
      }
      
      const player = playersMap.get(userId);
      player.card_count++;
      player.marked_count += card.marked?.length || 0;
      
      if (card.is_winner) {
        player.is_winner = true;
      }
      
      // Considera "perto de ganhar" se marcou 80% ou mais dos números
      if (card.marked?.length >= (card.numbers?.length * 0.8)) {
        player.is_near_win = true;
      }
    });

    return {
      total,
      winners,
      cards: cards?.map(card => ({
        id: card.id,
        user_id: card.user_id,
        card_index: card.card_index,
        numbers: card.numbers,
        marked: card.marked,
        is_winner: card.is_winner,
        bingo_draw_index: card.bingo_draw_index,
      })) || [],
      players: Array.from(playersMap.values()),
    };
  }

  async getCardDetails(cardId: string, userId?: string): Promise<CardResponse> {
    let query = this.supabase
      .from('cards')
      .select('id, card_index, numbers, marked, is_winner, bingo_draw_index, user_id')
      .eq('id', cardId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: card, error } = await query.single();

    if (error || !card) {
      throw new NotFoundException('Cartela não encontrada');
    }

    return {
      id: card.id,
      card_index: card.card_index,
      numbers: card.numbers,
      marked: card.marked,
      is_winner: card.is_winner,
      bingo_draw_index: card.bingo_draw_index,
    };
  }

  async deleteMatchCards(matchId: string): Promise<void> {
    const { error } = await this.supabase
      .from('cards')
      .delete()
      .eq('match_id', matchId);

    if (error) {
      throw new BadRequestException(`Erro ao deletar cartelas: ${error.message}`);
    }

    await this.auditService.log({
      type: 'cards_deleted',
      match_id: matchId,
      payload: { reason: 'match_cleanup' },
    });
  }

  async getWinners(matchId: string): Promise<Array<{
    user_id: string;
    card_id: string;
    card_index: number;
    bingo_draw_index: number;
    bingo_claimed_at: string;
  }>> {
    const { data: winners, error } = await this.supabase
      .from('cards')
      .select('user_id, id, card_index, bingo_draw_index, bingo_claimed_at')
      .eq('match_id', matchId)
      .eq('is_winner', true)
      .order('bingo_claimed_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Erro ao buscar vencedores: ${error.message}`);
    }

    return winners?.map(winner => ({
      user_id: winner.user_id,
      card_id: winner.id,
      card_index: winner.card_index,
      bingo_draw_index: winner.bingo_draw_index || 0,
      bingo_claimed_at: winner.bingo_claimed_at || '',
    })) || [];
  }

  async validateCardNumbers(
    numbers: number[],
    numMin: number,
    numMax: number,
    numbersPerCard: number,
  ): Promise<boolean> {
    return BingoCardGenerator.validateCard(numbers, numbersPerCard, numMin, numMax);
  }
}
