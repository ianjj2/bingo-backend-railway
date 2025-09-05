import { 
  Injectable, 
  Inject, 
  BadRequestException, 
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';

import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { AuditService } from '../audit/audit.service';
import { CardsService } from '../cards/cards.service';
import { CommitReveal, NumberDrawer, DrawSigner } from '../utils/random.util';
import { 
  Match, 
  MatchResponse, 
  MatchStatus, 
  Draw, 
  DrawResponse,
  MatchStateEvent,
  DrawNewEvent,
} from '../types/database.types';

@Injectable()
export class MatchesService {
  private activeDrawers = new Map<string, NumberDrawer>();
  private autoDrawIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly cardsService: CardsService,
  ) {}

  async create(createMatchDto: CreateMatchDto, userId: string): Promise<MatchResponse> {
    const {
      name,
      numMin,
      numMax,
      numbersPerCard,
      autoDraw = false,
      autoDrawInterval = 10000,
      maxWinners = null,
      youtubeUrl = null,
    } = createMatchDto;

    console.log('🎥 Debug - YouTube URL recebida:', youtubeUrl);

    // Validações de negócio
    if (numMax <= numMin) {
      throw new BadRequestException('Número máximo deve ser maior que o mínimo');
    }

    if (numbersPerCard > (numMax - numMin + 1)) {
      throw new BadRequestException('Números por cartela não pode ser maior que o range disponível');
    }

    // Gerar seeds para commit-reveal
    const { seeds, commitHash } = CommitReveal.generateMatchSeeds();

    // Criar partida
    const { data: match, error } = await this.supabase
      .from('matches')
      .insert({
        name,
        num_min: numMin,
        num_max: numMax,
        numbers_per_card: numbersPerCard,
        commit_hash: commitHash,
        auto_draw: autoDraw,
        auto_draw_interval: autoDrawInterval,
        max_winners: maxWinners,
        youtube_url: youtubeUrl,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao criar partida: ${error.message}`);
    }

    // Salvar seeds privadas temporariamente (serão reveladas no final)
    await this.supabase
      .from('matches')
      .update({ seed_public: JSON.stringify(seeds) })
      .eq('id', match.id);

    // Log de auditoria
    await this.auditService.log({
      type: 'match_created',
      user_id: userId,
      match_id: match.id,
      payload: {
        name,
        numMin,
        numMax,
        numbersPerCard,
        autoDraw,
        autoDrawInterval,
        maxWinners,
        commitHash,
      },
    });

    return this.formatMatchResponse(match);
  }

  async findAll(filters?: {
    status?: MatchStatus;
    limit?: number;
    offset?: number;
  }): Promise<MatchResponse[]> {
    let query = this.supabase
      .from('matches')
      .select(`
        id, name, status, num_min, num_max, numbers_per_card,
        win_pattern, auto_draw, auto_draw_interval, max_winners,
        started_at, ended_at, created_at, youtube_url
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
    }

    const { data: matches, error } = await query;

    if (error) {
      throw new BadRequestException(`Erro ao buscar partidas: ${error.message}`);
    }

    return matches?.map(match => this.formatMatchResponse(match)) || [];
  }

  async findOne(id: string): Promise<MatchResponse> {
    const { data: match, error } = await this.supabase
      .from('matches')
      .select(`
        id, name, status, num_min, num_max, numbers_per_card,
        win_pattern, auto_draw, auto_draw_interval, max_winners,
        started_at, ended_at, created_at, youtube_url
      `)
      .eq('id', id)
      .single();

    if (error || !match) {
      throw new NotFoundException('Partida não encontrada');
    }

    return this.formatMatchResponse(match);
  }

  async update(id: string, updateMatchDto: UpdateMatchDto, userId: string): Promise<MatchResponse> {
    // Verificar se partida existe e não está finalizada
    const { data: existingMatch } = await this.supabase
      .from('matches')
      .select('status')
      .eq('id', id)
      .single();

    if (!existingMatch) {
      throw new NotFoundException('Partida não encontrada');
    }

    if (existingMatch.status === 'finished') {
      throw new ConflictException('Não é possível atualizar uma partida finalizada');
    }

    // Atualizar apenas campos permitidos
    const allowedUpdates = {
      name: updateMatchDto.name,
      auto_draw: updateMatchDto.autoDraw,
      auto_draw_interval: updateMatchDto.autoDrawInterval,
      max_winners: updateMatchDto.maxWinners,
    };

    // Remover campos undefined
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    const { data: match, error } = await this.supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select(`
        id, name, status, num_min, num_max, numbers_per_card,
        win_pattern, auto_draw, auto_draw_interval, max_winners,
        started_at, ended_at, created_at
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao atualizar partida: ${error.message}`);
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'match_updated',
      user_id: userId,
      match_id: id,
      payload: updates,
    });

    return this.formatMatchResponse(match);
  }

  async start(id: string, userId: string): Promise<{ message: string; state: MatchStateEvent }> {
    // Verificar se partida existe
    const { data: match, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !match) {
      throw new NotFoundException('Partida não encontrada');
    }

    if (match.status !== 'scheduled') {
      throw new ConflictException('Apenas partidas agendadas podem ser iniciadas');
    }

    // Iniciar partida
    const startedAt = new Date().toISOString();
    
    const { error: updateError } = await this.supabase
      .from('matches')
      .update({
        status: 'live',
        started_at: startedAt,
      })
      .eq('id', id);

    if (updateError) {
      throw new BadRequestException(`Erro ao iniciar partida: ${updateError.message}`);
    }

    // Inicializar drawer de números
    const seeds = JSON.parse(match.seed_public || '[]');
    if (seeds.length > 0) {
      const drawer = new NumberDrawer(match.num_min, match.num_max, seeds[0]);
      this.activeDrawers.set(id, drawer);
    }

    // Configurar sorteio automático se ativado
    if (match.auto_draw) {
      this.setupAutoDraw(id, match.auto_draw_interval, userId);
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'match_started',
      user_id: userId,
      match_id: id,
      payload: { startedAt },
    });

    // Obter estado da partida
    const state = await this.getMatchState(id);

    return {
      message: 'Partida iniciada com sucesso',
      state,
    };
  }

  async pause(id: string, userId: string): Promise<{ message: string }> {
    await this.updateMatchStatus(id, 'paused', userId, 'match_paused');
    this.clearAutoDraw(id);
    
    return { message: 'Partida pausada' };
  }

  async resume(id: string, userId: string): Promise<{ message: string }> {
    const { data: match } = await this.supabase
      .from('matches')
      .select('auto_draw, auto_draw_interval')
      .eq('id', id)
      .single();

    await this.updateMatchStatus(id, 'live', userId, 'match_resumed');
    
    if (match?.auto_draw) {
      this.setupAutoDraw(id, match.auto_draw_interval, userId);
    }
    
    return { message: 'Partida retomada' };
  }

  async finish(id: string, userId: string): Promise<{ message: string }> {
    await this.updateMatchStatus(id, 'finished', userId, 'match_finished', {
      ended_at: new Date().toISOString(),
    });
    
    this.clearAutoDraw(id);
    this.activeDrawers.delete(id);
    
    return { message: 'Partida finalizada' };
  }

  async drawNext(id: string, userId: string): Promise<{ draw: DrawResponse; isGameOver: boolean }> {
    // Verificar se partida está ativa
    const { data: match } = await this.supabase
      .from('matches')
      .select('status, num_min, num_max')
      .eq('id', id)
      .single();

    if (!match || match.status !== 'live') {
      throw new ConflictException('Partida não está ativa');
    }

    // Obter drawer
    let drawer = this.activeDrawers.get(id);
    if (!drawer) {
      // Recriar drawer se não existir
      const { data: existingMatch } = await this.supabase
        .from('matches')
        .select('seed_public, num_min, num_max')
        .eq('id', id)
        .single();

      if (existingMatch) {
        const seeds = JSON.parse(existingMatch.seed_public || '[]');
        drawer = new NumberDrawer(existingMatch.num_min, existingMatch.num_max, seeds[0]);
        this.activeDrawers.set(id, drawer);
      }
    }

    if (!drawer) {
      throw new BadRequestException('Erro ao inicializar sorteio');
    }

    // Sortear próximo número
    const number = drawer.drawNext();
    if (number === null) {
      throw new ConflictException('Todos os números já foram sorteados');
    }

    // Obter próximo índice de draw
    const { data: lastDraw } = await this.supabase
      .from('draws')
      .select('draw_index')
      .eq('match_id', id)
      .order('draw_index', { ascending: false })
      .limit(1)
      .single();

    const drawIndex = (lastDraw?.draw_index || 0) + 1;

    // Criar assinatura
    const timestamp = new Date();
    const serverSecret = this.configService.get('JWT_SECRET') || 'fallback-secret';
    const signature = DrawSigner.signDraw(id, drawIndex, number, timestamp, serverSecret);

    // Salvar draw
    const { data: draw, error } = await this.supabase
      .from('draws')
      .insert({
        match_id: id,
        draw_index: drawIndex,
        number,
        server_signature: signature,
        drawn_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao salvar sorteio: ${error.message}`);
    }

    // Marcar automaticamente nas cartelas que têm este número
    try {
      const { updatedCards, nearWinEvents, bingoEvents } = await this.cardsService.markNumberInCards(id, number, drawIndex);
      
      // TODO: Publicar eventos de atualização via WebSocket/Redis quando reabilitarmos
      console.log(`✅ Marcação automática concluída - ${updatedCards.length} cartelas atualizadas`);
      
    } catch (markError) {
      console.error('❌ Erro na marcação automática:', markError);
      // Não falha o sorteio se a marcação der erro
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'number_drawn',
      user_id: userId,
      match_id: id,
      payload: { drawIndex, number, signature },
    });

    const isGameOver = drawer.getRemainingCount() === 0;

    return {
      draw: {
        draw_index: draw.draw_index,
        number: draw.number,
        created_at: draw.created_at,
      },
      isGameOver,
    };
  }

  async drawManual(id: string, number: number, userId: string): Promise<{ draw: DrawResponse; isGameOver: boolean }> {
    // Verificar se partida está ativa
    const { data: match } = await this.supabase
      .from('matches')
      .select('status, num_min, num_max')
      .eq('id', id)
      .single();

    if (!match || match.status !== 'live') {
      throw new ConflictException('Partida não está ativa');
    }

    // Validar número
    if (number < match.num_min || number > match.num_max) {
      throw new BadRequestException(`Número deve estar entre ${match.num_min} e ${match.num_max}`);
    }

    // Verificar se número já foi sorteado
    const { data: existingDraw } = await this.supabase
      .from('draws')
      .select('id')
      .eq('match_id', id)
      .eq('number', number)
      .single();

    if (existingDraw) {
      throw new ConflictException('Este número já foi sorteado');
    }

    // Obter próximo índice de draw
    const { data: lastDraw } = await this.supabase
      .from('draws')
      .select('draw_index')
      .eq('match_id', id)
      .order('draw_index', { ascending: false })
      .limit(1)
      .single();

    const drawIndex = (lastDraw?.draw_index || 0) + 1;

    // Criar assinatura (manual)
    const timestamp = new Date();
    const serverSecret = this.configService.get('JWT_SECRET') || 'fallback-secret';
    const signature = DrawSigner.signDraw(id, drawIndex, number, timestamp, serverSecret);

    // Salvar draw
    const { data: draw, error } = await this.supabase
      .from('draws')
      .insert({
        match_id: id,
        draw_index: drawIndex,
        number,
        server_signature: signature,
        drawn_by: userId,
        // Nota: sorteio manual (registrado via API manual)
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao salvar sorteio manual: ${error.message}`);
    }

    // Marcar automaticamente nas cartelas que têm este número
    try {
      const { updatedCards, nearWinEvents, bingoEvents } = await this.cardsService.markNumberInCards(id, number, drawIndex);
      
      console.log(`✅ Marcação automática concluída (MANUAL) - ${updatedCards.length} cartelas atualizadas`);
      if (bingoEvents.length > 0) {
        console.log(`🎉 ${bingoEvents.length} BINGO(s) detectado(s)!`);
      }
      
    } catch (markError) {
      console.error('❌ Erro na marcação automática:', markError);
      // Não falha o sorteio se a marcação der erro
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'manual_number_drawn',
      user_id: userId,
      match_id: id,
      payload: { drawIndex, number, signature, isManual: true },
    });

    // Verificar se o jogo acabou (todos os números sorteados)
    const { count: totalNumbers } = await this.supabase
      .from('draws')
      .select('*', { count: 'exact' })
      .eq('match_id', id);

    const totalPossible = match.num_max - match.num_min + 1;
    const isGameOver = (totalNumbers || 0) >= totalPossible;

    return {
      draw: {
        draw_index: draw.draw_index,
        number: draw.number,
        created_at: draw.created_at,
      },
      isGameOver,
    };
  }

  async undoLastDraw(id: string, userId: string): Promise<{ message: string }> {
    // Buscar último draw
    const { data: lastDraw } = await this.supabase
      .from('draws')
      .select('*')
      .eq('match_id', id)
      .order('draw_index', { ascending: false })
      .limit(1)
      .single();

    if (!lastDraw) {
      throw new BadRequestException('Nenhum número foi sorteado ainda');
    }

    // Remover draw
    const { error } = await this.supabase
      .from('draws')
      .delete()
      .eq('id', lastDraw.id);

    if (error) {
      throw new BadRequestException(`Erro ao desfazer sorteio: ${error.message}`);
    }

    // Recriar drawer atualizado
    const { data: match } = await this.supabase
      .from('matches')
      .select('seed_public, num_min, num_max')
      .eq('id', id)
      .single();

    if (match) {
      const seeds = JSON.parse(match.seed_public || '[]');
      const drawer = new NumberDrawer(match.num_min, match.num_max, seeds[0]);
      
      // Avançar drawer até o estado atual
      const { data: draws } = await this.supabase
        .from('draws')
        .select('number')
        .eq('match_id', id)
        .order('draw_index', { ascending: true });

      if (draws) {
        for (const draw of draws) {
          drawer.drawNext(); // Consumir números já sorteados
        }
      }

      this.activeDrawers.set(id, drawer);
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'draw_undone',
      user_id: userId,
      match_id: id,
      payload: { 
        undoneDrawIndex: lastDraw.draw_index,
        undoneNumber: lastDraw.number,
      },
    });

    return { message: 'Último sorteio desfeito' };
  }

  async getMatchState(id: string): Promise<MatchStateEvent> {
    // Buscar partida
    const { data: match } = await this.supabase
      .from('matches')
      .select('status')
      .eq('id', id)
      .single();

    if (!match) {
      throw new NotFoundException('Partida não encontrada');
    }

    // Buscar draws
    const { data: draws } = await this.supabase
      .from('draws')
      .select('draw_index, number, created_at')
      .eq('match_id', id)
      .order('draw_index', { ascending: true });

    // Buscar vencedores
    const { data: winners } = await this.supabase
      .from('cards')
      .select('user_id, id, bingo_draw_index')
      .eq('match_id', id)
      .eq('is_winner', true);

    // Contar total de cartelas
    const { count: totalCards } = await this.supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', id);

    return {
      match_id: id,
      status: match.status,
      draws: draws?.map(draw => ({
        draw_index: draw.draw_index,
        number: draw.number,
        created_at: draw.created_at,
      })) || [],
      winners: winners?.map(winner => ({
        user_id: winner.user_id,
        card_id: winner.id,
        draw_index: winner.bingo_draw_index || 0,
      })) || [],
      total_cards: totalCards || 0,
    };
  }

  private async updateMatchStatus(
    id: string,
    status: MatchStatus,
    userId: string,
    auditType: string,
    extraUpdates?: Record<string, any>,
  ): Promise<void> {
    const updates = { status, ...extraUpdates };
    
    const { error } = await this.supabase
      .from('matches')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Erro ao atualizar status: ${error.message}`);
    }

    await this.auditService.log({
      type: auditType,
      user_id: userId,
      match_id: id,
      payload: updates,
    });
  }

  private setupAutoDraw(matchId: string, interval: number, userId: string): void {
    this.clearAutoDraw(matchId);
    
    const intervalId = setInterval(async () => {
      try {
        await this.drawNext(matchId, userId);
      } catch (error) {
        console.error(`Erro no sorteio automático da partida ${matchId}:`, error);
        this.clearAutoDraw(matchId);
      }
    }, interval);

    this.autoDrawIntervals.set(matchId, intervalId);
  }

  private clearAutoDraw(matchId: string): void {
    const intervalId = this.autoDrawIntervals.get(matchId);
    if (intervalId) {
      clearInterval(intervalId);
      this.autoDrawIntervals.delete(matchId);
    }
  }

  private formatMatchResponse(match: any): MatchResponse {
    return {
      id: match.id,
      name: match.name,
      status: match.status,
      num_min: match.num_min,
      num_max: match.num_max,
      numbers_per_card: match.numbers_per_card,
      win_pattern: match.win_pattern,
      auto_draw: match.auto_draw,
      auto_draw_interval: match.auto_draw_interval,
      max_winners: match.max_winners,
      started_at: match.started_at,
      ended_at: match.ended_at,
      created_at: match.created_at,
      youtube_url: match.youtube_url,
    };
  }
}
