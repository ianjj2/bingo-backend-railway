-- Script RÁPIDO para corrigir RLS da tabela cpf_whitelist
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cpf_whitelist'
);

-- 2. Se não existir, criar a tabela
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

-- 3. Desabilitar RLS temporariamente para teste
ALTER TABLE public.cpf_whitelist DISABLE ROW LEVEL SECURITY;

-- 4. Ou criar políticas mais permissivas
-- ALTER TABLE public.cpf_whitelist ENABLE ROW LEVEL SECURITY;

-- 5. Remover todas as políticas existentes
-- DROP POLICY IF EXISTS "Permitir leitura pública" ON public.cpf_whitelist;
-- DROP POLICY IF EXISTS "Permitir inserção para admins" ON public.cpf_whitelist;
-- DROP POLICY IF EXISTS "Permitir atualização para admins" ON public.cpf_whitelist;
-- DROP POLICY IF EXISTS "Permitir deleção para admins" ON public.cpf_whitelist;

-- 6. Criar políticas mais simples (comentado por enquanto)
-- CREATE POLICY "allow_all_for_service_role" ON public.cpf_whitelist
--     FOR ALL USING (true) WITH CHECK (true);

-- 7. Garantir que o service role tem acesso total
GRANT ALL ON public.cpf_whitelist TO service_role;
GRANT ALL ON SEQUENCE cpf_whitelist_id_seq TO service_role;

-- 8. Testar inserção de um CPF de exemplo
INSERT INTO public.cpf_whitelist (cpf, cpf_formatted, tier, autoriza_imagem, ativo)
VALUES ('12345678901', '123.456.789-01', 'OURO', true, true)
ON CONFLICT (cpf) DO NOTHING;

-- 9. Verificar se funcionou
SELECT COUNT(*) as total_cpfs FROM public.cpf_whitelist;

-- Script concluído! A tabela deve estar funcionando agora.
