# 📧 Configuração do Sistema de Email

## ✅ Sistema Implementado

O sistema de reset de senha está **100% funcional** e pronto para uso!

### Endpoints Disponíveis:

```bash
POST /auth/forgot-password      # Solicitar reset de senha
POST /auth/validate-reset-token # Validar token antes de resetar
POST /auth/reset-password        # Redefinir senha com token válido
```

---

## 🔧 Configuração do Gmail

### **Passo 1: Ativar 2FA no Gmail**

1. Acesse: https://myaccount.google.com/security
2. Em "Como fazer login no Google", clique em "Verificação em duas etapas"
3. Siga as instruções para ativar

### **Passo 2: Gerar Senha de App**

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione:
   - **App:** Email
   - **Dispositivo:** Outro (nome personalizado)
   - **Nome:** Bravo.Bet Backend
3. Clique em "Gerar"
4. **Copie a senha de 16 caracteres gerada**

### **Passo 3: Configurar Variáveis de Ambiente**

#### **Desenvolvimento Local** (`.env.local`):

```env
# Email Configuration
EMAIL_USER=seu.email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # Senha de app gerada (com espaços)

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Outras variáveis necessárias
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service
JWT_SECRET=sua_secret_key_min_32_chars
```

#### **Produção Railway**:

1. Acesse seu projeto no Railway
2. Vá em **Settings → Variables**
3. Adicione as variáveis:

```
EMAIL_USER = seu.email@gmail.com
EMAIL_PASS = xxxxxxxxxxxxxxxx
FRONTEND_URL = https://cheerful-empanada-098370.netlify.app
```

---

## 🧪 Como Testar

### **1. Solicitar Reset de Senha**

```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com"
  }'
```

**Resposta Esperada:**
```json
{
  "message": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
}
```

**Email Enviado:**
- ✅ Template HTML bonito
- ✅ Link para reset: `https://seu-frontend.com/auth/reset-password?token=abc123...`
- ✅ Token expira em **1 hora**

---

### **2. Validar Token (NOVO!)**

```bash
curl -X POST http://localhost:3001/auth/validate-reset-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token_recebido_no_email"
  }'
```

**Resposta Esperada (Token Válido):**
```json
{
  "valid": true,
  "message": "Token válido"
}
```

**Resposta Esperada (Token Inválido):**
```json
{
  "valid": false,
  "message": "Token inválido"
}
```

**Resposta Esperada (Token Expirado):**
```json
{
  "valid": false,
  "message": "Token expirado. Solicite um novo reset de senha."
}
```

---

### **3. Redefinir Senha**

```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "token_recebido_no_email",
    "newPassword": "MinhaNovaSenh@123"
  }'
```

**Resposta Esperada:**
```json
{
  "message": "Senha redefinida com sucesso."
}
```

---

## 📱 Fluxo Completo (Frontend)

### **Passo 1: Usuário Esqueceu a Senha**

```javascript
// Página: /auth/forgot-password
const handleForgotPassword = async (email) => {
  const response = await fetch('http://localhost:3001/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  // Mostrar: "Email enviado! Confira sua caixa de entrada"
};
```

### **Passo 2: Usuário Clica no Link do Email**

```javascript
// Página: /auth/reset-password?token=abc123
const [token, setToken] = useState(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  setToken(tokenFromUrl);
  
  // Validar token antes de mostrar o formulário
  validateToken(tokenFromUrl);
}, []);

const validateToken = async (token) => {
  const response = await fetch('http://localhost:3001/auth/validate-reset-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  
  const data = await response.json();
  
  if (!data.valid) {
    // Mostrar: "Token inválido ou expirado"
    // Redirecionar para /auth/forgot-password
  }
};
```

### **Passo 3: Usuário Define Nova Senha**

```javascript
const handleResetPassword = async (newPassword) => {
  const response = await fetch('http://localhost:3001/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      newPassword,
    }),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Mostrar: "Senha redefinida com sucesso!"
    // Redirecionar para /auth/login
  }
};
```

---

## 🎨 Template do Email

O email enviado possui:

- ✅ **Design profissional** com gradiente vermelho
- ✅ **Botão grande e visível** "🔑 Redefinir Senha"
- ✅ **Link alternativo** para copiar/colar
- ✅ **Alerta de expiração** destacado (1 hora)
- ✅ **Dicas de segurança** para senha forte
- ✅ **Aviso de segurança** caso não tenha solicitado
- ✅ **Rodapé com branding** Bravo.Bet

---

## 🔒 Segurança Implementada

### ✅ **Rate Limiting**

- Máximo **5 tentativas** de reset por IP em 15 minutos
- Evita spam de emails

### ✅ **Token Único e Seguro**

```javascript
// Gerado com crypto.randomBytes (32 bytes = 64 chars hex)
const token = crypto.randomBytes(32).toString('hex');
```

### ✅ **Expiração**

- Token válido por **60 minutos** (1 hora)
- Após uso, o token é marcado como `used: true`

### ✅ **Validação de Senha**

- Mínimo **4 caracteres** (pode ser aumentado)
- Hash com **argon2** (mais seguro que bcrypt)

### ✅ **Privacidade**

- Sempre retorna mensagem genérica (não revela se email existe)
- Evita enumeração de usuários

### ✅ **Auditoria Completa**

Todos os eventos são logados:
- `password_reset_requested` - Quando solicitado
- `password_reset_completed` - Quando completado
- Inclui: IP, timestamp, user_id

---

## 📊 Estrutura do Banco de Dados

### **Tabela: `password_reset_tokens`**

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

---

## 🐛 Troubleshooting

### **Erro: "Erro ao enviar email"**

**Causa:** Credenciais do Gmail inválidas

**Solução:**
1. Verificar se `EMAIL_USER` e `EMAIL_PASS` estão corretos
2. Confirmar que a senha de app foi gerada corretamente
3. Verificar se 2FA está ativado no Gmail

### **Erro: "Token inválido"**

**Causa:** Token não existe no banco ou foi digitado errado

**Solução:**
1. Usar o endpoint `/auth/validate-reset-token` para debugar
2. Verificar se o token no email corresponde ao enviado na requisição

### **Erro: "Token expirado"**

**Causa:** Passou mais de 1 hora desde a solicitação

**Solução:**
1. Solicitar novo reset de senha
2. Tokens antigos são invalidados automaticamente

### **Email não chega**

**Verificar:**
1. ✅ Pasta de Spam
2. ✅ Logs do servidor: `console.log` mostra "Email enviado"
3. ✅ Quota do Gmail (500 emails/dia para contas gratuitas)
4. ✅ Conexão com internet do servidor

---

## 📈 Melhorias Futuras (Opcional)

### **1. Templates de Email Customizáveis**

Criar arquivos `.hbs` (Handlebars) separados para cada tipo de email.

### **2. Múltiplos Provedores de Email**

Implementar fallback: Gmail → SendGrid → AWS SES

### **3. Notificações de Segurança**

Enviar email quando a senha for alterada com sucesso.

### **4. Histórico de Resets**

Mostrar no perfil do usuário quando foi o último reset de senha.

---

## ✅ Status: **PRONTO PARA PRODUÇÃO**

O sistema está **100% funcional** e pronto para uso em produção!

Apenas configure as variáveis de ambiente e tudo funcionará automaticamente. 🚀

