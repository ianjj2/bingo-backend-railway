import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditService } from '../audit/audit.service';
import { UserResponse, UserRole, UserStatus } from '../types/database.types';

@Injectable()
export class UsersService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters?: {
    role?: UserRole;
    status?: UserStatus;
    limit?: number;
    offset?: number;
  }): Promise<UserResponse[]> {
    let query = this.supabase
      .from('users')
      .select('id, cpf, email, role, status, email_verified_at, created_at')
      .order('created_at', { ascending: false });

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
    }

    const { data: users, error } = await query;

    if (error) {
      throw new BadRequestException(`Erro ao buscar usuários: ${error.message}`);
    }

    return users || [];
  }

  async findOne(id: string): Promise<UserResponse> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, cpf, email, role, status, email_verified_at, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async updateRole(id: string, newRole: UserRole, adminId: string): Promise<UserResponse> {
    // Verificar se usuário existe
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualizar role
    const { data: updatedUser, error: updateError } = await this.supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', id)
      .select('id, cpf, email, role, status, email_verified_at, created_at')
      .single();

    if (updateError) {
      throw new BadRequestException(`Erro ao atualizar role: ${updateError.message}`);
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'user_role_changed',
      user_id: adminId,
      payload: {
        target_user_id: id,
        old_role: user.role,
        new_role: newRole,
      },
    });

    return updatedUser;
  }

  async updateStatus(id: string, newStatus: UserStatus, adminId: string): Promise<UserResponse> {
    // Verificar se usuário existe
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, status')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualizar status
    const { data: updatedUser, error: updateError } = await this.supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', id)
      .select('id, cpf, email, role, status, email_verified_at, created_at')
      .single();

    if (updateError) {
      throw new BadRequestException(`Erro ao atualizar status: ${updateError.message}`);
    }

    // Log de auditoria
    await this.auditService.log({
      type: 'user_status_changed',
      user_id: adminId,
      payload: {
        target_user_id: id,
        old_status: user.status,
        new_status: newStatus,
      },
    });

    return updatedUser;
  }

  async getUserStats(): Promise<{
    total: number;
    by_role: { [key in UserRole]: number };
    by_status: { [key in UserStatus]: number };
    verified: number;
    recent: number;
  }> {
    // Total de usuários
    const { count: total } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Por role
    const { data: roleStats } = await this.supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);

    // Por status
    const { data: statusStats } = await this.supabase
      .from('users')
      .select('status')
      .not('status', 'is', null);

    // Verificados
    const { count: verified } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('email_verified_at', 'is', null);

    // Recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recent } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Contar por role
    const by_role = {
      ouro: 0,
      diamante: 0,
      admin: 0,
    } as { [key in UserRole]: number };

    roleStats?.forEach(user => {
      by_role[user.role]++;
    });

    // Contar por status
    const by_status = {
      active: 0,
      blocked: 0,
    } as { [key in UserStatus]: number };

    statusStats?.forEach(user => {
      by_status[user.status]++;
    });

    return {
      total: total || 0,
      by_role,
      by_status,
      verified: verified || 0,
      recent: recent || 0,
    };
  }
}
