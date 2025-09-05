import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

interface WhitelistEntry {
  id?: number;
  cpf: string;
  cpf_formatted?: string;
  tier: string;
  autoriza_imagem: boolean;
  external_id?: string;
  ativo: boolean;
}

interface ImportCpfDto {
  cpfs: Array<{
    cpf: string;
    tier: string;
    external_id?: string;
    autoriza_imagem?: boolean;
  }>;
}

@Injectable()
export class WhitelistService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  // Função para limpar CPF (apenas números)
  private cleanCpf(cpf: string): string {
    return cpf.replace(/[^0-9]/g, '');
  }

  // Função para formatar CPF
  private formatCpf(cpf: string): string {
    const clean = this.cleanCpf(cpf);
    if (clean.length === 11) {
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
    }
    return clean;
  }

  // Verificar se CPF está na whitelist
  async checkCpfWhitelist(cpf: string): Promise<WhitelistEntry | null> {
    const cleanCpf = this.cleanCpf(cpf);
    
    const { data, error } = await this.supabase
      .from('cpf_whitelist')
      .select('*')
      .eq('cpf', cleanCpf)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  // Adicionar CPF à whitelist
  async addCpfToWhitelist(cpfData: Partial<WhitelistEntry>): Promise<WhitelistEntry> {
    const cleanCpf = this.cleanCpf(cpfData.cpf);
    const formattedCpf = this.formatCpf(cpfData.cpf);

    const { data, error } = await this.supabase
      .from('cpf_whitelist')
      .insert({
        cpf: cleanCpf,
        cpf_formatted: formattedCpf,
        tier: cpfData.tier || 'BRONZE',
        autoriza_imagem: cpfData.autoriza_imagem || false,
        external_id: cpfData.external_id,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Erro ao adicionar CPF: ${error.message}`);
    }

    return data;
  }

  // Importar múltiplos CPFs
  async importCpfs(importData: ImportCpfDto): Promise<{ success: number; errors: string[] }> {
    const results = { success: 0, errors: [] };

    for (const cpfData of importData.cpfs) {
      try {
        const cleanCpf = this.cleanCpf(cpfData.cpf);
        const formattedCpf = this.formatCpf(cpfData.cpf);

        // Verificar se já existe
        const existing = await this.checkCpfWhitelist(cleanCpf);
        
        if (existing) {
          // Atualizar existente
          await this.supabase
            .from('cpf_whitelist')
            .update({
              tier: cpfData.tier,
              autoriza_imagem: cpfData.autoriza_imagem || false,
              external_id: cpfData.external_id,
              ativo: true,
            })
            .eq('cpf', cleanCpf);
        } else {
          // Criar novo
          await this.supabase
            .from('cpf_whitelist')
            .insert({
              cpf: cleanCpf,
              cpf_formatted: formattedCpf,
              tier: cpfData.tier,
              autoriza_imagem: cpfData.autoriza_imagem || false,
              external_id: cpfData.external_id,
              ativo: true,
            });
        }

        results.success++;
      } catch (error) {
        results.errors.push(`CPF ${cpfData.cpf}: ${error.message}`);
      }
    }

    return results;
  }

  // Listar CPFs da whitelist
  async getWhitelist(page = 1, limit = 50, tier?: string): Promise<{
    data: WhitelistEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let query = this.supabase
      .from('cpf_whitelist')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new BadRequestException(`Erro ao buscar whitelist: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  // Remover CPF da whitelist (desativar)
  async removeCpfFromWhitelist(cpf: string): Promise<void> {
    const cleanCpf = this.cleanCpf(cpf);

    const { error } = await this.supabase
      .from('cpf_whitelist')
      .update({ ativo: false })
      .eq('cpf', cleanCpf);

    if (error) {
      throw new BadRequestException(`Erro ao remover CPF: ${error.message}`);
    }
  }

  // Estatísticas da whitelist
  async getWhitelistStats(): Promise<{
    total: number;
    byTier: Record<string, number>;
    active: number;
  }> {
    const { data: allData, error: allError } = await this.supabase
      .from('cpf_whitelist')
      .select('tier, ativo');

    if (allError) {
      throw new BadRequestException(`Erro ao buscar estatísticas: ${allError.message}`);
    }

    const stats = {
      total: allData?.length || 0,
      byTier: {} as Record<string, number>,
      active: 0,
    };

    allData?.forEach(item => {
      if (item.ativo) {
        stats.active++;
      }
      
      if (!stats.byTier[item.tier]) {
        stats.byTier[item.tier] = 0;
      }
      stats.byTier[item.tier]++;
    });

    return stats;
  }
}
