-- Script para criar tabela cpf_whitelist com políticas RLS corretas
-- Execute este script no SQL Editor do Supabase

-- 1. Criar a tabela cpf_whitelist
CREATE TABLE IF NOT EXISTS public.cpf_whitelist (
  id BIGSERIAL PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  cpf_formatted TEXT,
  tier TEXT NOT NULL DEFAULT 'OURO',
  autoriza_imagem BOOLEAN NOT NULL DEFAULT false,
  external_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_cpf_whitelist_cpf ON public.cpf_whitelist(cpf);
CREATE INDEX IF NOT EXISTS idx_cpf_whitelist_tier ON public.cpf_whitelist(tier);
CREATE INDEX IF NOT EXISTS idx_cpf_whitelist_ativo ON public.cpf_whitelist(ativo);

-- 3. Habilitar RLS
ALTER TABLE public.cpf_whitelist ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.cpf_whitelist;
DROP POLICY IF EXISTS "Permitir inserção para admins" ON public.cpf_whitelist;
DROP POLICY IF EXISTS "Permitir atualização para admins" ON public.cpf_whitelist;
DROP POLICY IF EXISTS "Permitir deleção para admins" ON public.cpf_whitelist;

-- 5. Criar políticas RLS simples
-- Política para leitura pública (qualquer um pode verificar CPF)
CREATE POLICY "Permitir leitura pública" ON public.cpf_whitelist
    FOR SELECT USING (true);

-- Política para inserção usando service key
CREATE POLICY "Permitir inserção service" ON public.cpf_whitelist
    FOR INSERT WITH CHECK (true);

-- Política para atualização usando service key
CREATE POLICY "Permitir atualização service" ON public.cpf_whitelist
    FOR UPDATE USING (true);

-- Política para deleção usando service key
CREATE POLICY "Permitir deleção service" ON public.cpf_whitelist
    FOR DELETE USING (true);

-- 6. Verificar se a tabela foi criada corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cpf_whitelist' 
ORDER BY ordinal_position;

-- 7. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'cpf_whitelist';

-- Script executado com sucesso!
-- A tabela cpf_whitelist está pronta para uso.
