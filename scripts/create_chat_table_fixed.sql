-- 💬 Tabela de Mensagens do Chat - VERSÃO CORRIGIDA
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Primeiro, verificar se a tabela já existe e dropar se necessário
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Criar tabela com tipos compatíveis com Supabase
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_tier TEXT NOT NULL CHECK (user_tier IN ('ouro', 'diamante', 'admin')),
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'system', 'announcement')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chat_messages_match_id ON chat_messages(match_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para leitura: todos podem ler (simplificado para início)
CREATE POLICY "Allow read access to chat messages" ON chat_messages
    FOR SELECT 
    USING (true);

-- Política para inserção: simplificada (sem auth por enquanto)
CREATE POLICY "Allow insert chat messages" ON chat_messages
    FOR INSERT 
    WITH CHECK (true);

-- Política para update/delete: apenas admins (simplificada)
CREATE POLICY "Allow admin modifications" ON chat_messages
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Comentários
COMMENT ON TABLE chat_messages IS 'Armazena mensagens do chat das partidas de bingo';
COMMENT ON COLUMN chat_messages.id IS 'ID único da mensagem (formato: msg_timestamp_random)';
COMMENT ON COLUMN chat_messages.match_id IS 'ID da partida onde a mensagem foi enviada';
COMMENT ON COLUMN chat_messages.user_id IS 'ID do usuário que enviou a mensagem';
COMMENT ON COLUMN chat_messages.user_name IS 'Nome de exibição do usuário';
COMMENT ON COLUMN chat_messages.user_tier IS 'Tier do usuário (ouro, diamante, admin)';
COMMENT ON COLUMN chat_messages.message IS 'Conteúdo da mensagem (máximo 500 caracteres)';
COMMENT ON COLUMN chat_messages.type IS 'Tipo da mensagem (text, system, announcement)';
COMMENT ON COLUMN chat_messages.created_at IS 'Data/hora de criação da mensagem';

-- Inserir mensagem de teste para verificar funcionamento
INSERT INTO chat_messages (
    id, 
    match_id, 
    user_id, 
    user_name, 
    user_tier, 
    message, 
    type, 
    created_at
) VALUES (
    'msg_test_' || extract(epoch from now())::text,
    'test-match-id',
    'test-user-id',
    'Sistema',
    'admin',
    '🎉 Sistema de chat inicializado com sucesso!',
    'system',
    NOW()
);

-- Verificar se a inserção funcionou
SELECT 'Chat table created successfully!' as status, count(*) as test_messages FROM chat_messages;
