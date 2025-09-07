-- 💬 Tabela de Mensagens do Chat
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS chat_messages (
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
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para leitura: usuários podem ler mensagens de partidas que participam
CREATE POLICY "Users can read chat messages" ON chat_messages
    FOR SELECT 
    USING (true); -- Por enquanto, permitir leitura para todos

-- Política para inserção: usuários podem inserir suas próprias mensagens
CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT 
    WITH CHECK (auth.uid()::text = user_id);

-- Política para admin: admin pode fazer tudo
CREATE POLICY "Admin can do everything" ON chat_messages
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Comentários
COMMENT ON TABLE chat_messages IS 'Armazena mensagens do chat das partidas de bingo';
COMMENT ON COLUMN chat_messages.id IS 'ID único da mensagem';
COMMENT ON COLUMN chat_messages.match_id IS 'ID da partida (FK para matches.id)';
COMMENT ON COLUMN chat_messages.user_id IS 'ID do usuário (FK para users.id)';
COMMENT ON COLUMN chat_messages.user_name IS 'Nome do usuário no momento da mensagem';
COMMENT ON COLUMN chat_messages.user_tier IS 'Tier do usuário (ouro, diamante, admin)';
COMMENT ON COLUMN chat_messages.message IS 'Conteúdo da mensagem';
COMMENT ON COLUMN chat_messages.type IS 'Tipo da mensagem (text, system, announcement)';
COMMENT ON COLUMN chat_messages.created_at IS 'Data/hora de criação da mensagem';
