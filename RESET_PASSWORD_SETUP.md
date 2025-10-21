# 🔐 Sistema de Reset de Senha - Guia Rápido

## ✅ O Que Foi Implementado

Sistema **completo** e **pronto para produção** de reset de senha com:

- ✅ **3 endpoints RESTful** (forgot-password, validate-token, reset-password)
- ✅ **Email HTML profissional** com templates bonitos
- ✅ **Integração com Gmail** via Nodemailer
- ✅ **Tokens seguros** com crypto (32 bytes)
- ✅ **Expiração de 1 hora** por segurança
- ✅ **Rate limiting** (5 tentativas/15min)
- ✅ **Auditoria completa** de eventos
- ✅ **Validação de senha** com argon2
- ✅ **Scripts de teste** automatizados

---

## 🚀 Setup Rápido (3 Minutos)

### **1. Configurar Gmail**

```bash
# 1. Ativar 2FA no Gmail:
#    https://myaccount.google.com/security

# 2. Gerar Senha de App:
#    https://myaccount.google.com/apppasswords
#    → Selecionar "Email" e "Outro (nome personalizado)"
#    → Copiar senha gerada (16 caracteres)
```

### **2. Configurar Variáveis de Ambiente**

Crie/edite `.env.local`:

```env
# Email (Gmail)
EMAIL_USER=seu.email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  # Senha de app (16 chars)

# Frontend
FRONTEND_URL=http://localhost:3000

# Database (Supabase)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service

# JWT
JWT_SECRET=sua_secret_key_min_32_chars
```

### **3. Instalar Dependências**

```bash
npm install
```

> **Nota:** O `nodemailer` já está nas dependências! Não precisa instalar nada extra.

### **4. Executar Backend**

```bash
npm run start:dev
```

### **5. Testar Sistema**

#### **Opção A: Script Automatizado** (Recomendado)

```bash
# Node.js (funciona em todos OS)
node scripts/test-reset-password.js

# Ou Bash (Linux/Mac)
chmod +x scripts/test-reset-password.sh
./scripts/test-reset-password.sh
```

#### **Opção B: Manual com cURL**

```bash
# 1. Solicitar reset
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com"}'

# 2. Verificar email recebido e copiar token

# 3. Validar token
curl -X POST http://localhost:3001/auth/validate-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_DO_EMAIL"}'

# 4. Redefinir senha
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_DO_EMAIL","newPassword":"NovaSenha123!"}'
```

---

## 📧 Email Template

O email enviado possui:

![Email Preview](https://via.placeholder.com/600x400/dc2626/white?text=Email+Preview)

- 🎨 **Design profissional** com gradiente vermelho
- 🔴 **Botão destacado** "🔑 Redefinir Senha"
- ⏰ **Alerta de expiração** (1 hora)
- 🔒 **Dicas de segurança**
- ℹ️ **Aviso caso não tenha solicitado**

---

## 🔌 Endpoints da API

### **POST /auth/forgot-password**

Solicita reset de senha e envia email.

**Request:**
```json
{
  "email": "usuario@email.com"
}
```

**Response:**
```json
{
  "message": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
}
```

**Status Codes:**
- `200` - Sucesso (sempre, por segurança)
- `429` - Rate limit excedido

---

### **POST /auth/validate-reset-token** ⭐ NOVO

Valida se um token é válido antes de mostrar formulário.

**Request:**
```json
{
  "token": "abc123..."
}
```

**Response (Válido):**
```json
{
  "valid": true,
  "message": "Token válido"
}
```

**Response (Inválido):**
```json
{
  "valid": false,
  "message": "Token inválido"
}
```

**Response (Expirado):**
```json
{
  "valid": false,
  "message": "Token expirado. Solicite um novo reset de senha."
}
```

**Status Codes:**
- `200` - Sempre (checar campo `valid`)

---

### **POST /auth/reset-password**

Redefine a senha usando token válido.

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "MinhaNovaSenh@123"
}
```

**Response:**
```json
{
  "message": "Senha redefinida com sucesso."
}
```

**Status Codes:**
- `200` - Senha redefinida
- `400` - Token inválido/expirado ou senha fraca

---

## 🔒 Segurança

### **Tokens**
- Gerados com `crypto.randomBytes(32)` (64 chars hex)
- Únicos e impossíveis de adivinhar
- Expiram em **1 hora**
- Marcados como `used: true` após uso

### **Rate Limiting**
- **5 tentativas** por IP em 15 minutos
- Evita spam de emails
- Aplicado nos endpoints críticos

### **Privacidade**
- Sempre retorna mensagem genérica
- Não revela se email existe no sistema
- Evita enumeração de usuários

### **Hash de Senha**
- Usa **argon2** (mais seguro que bcrypt)
- Salt automático
- Configurável no `password.util.ts`

---

## 🌐 Integração com Frontend

### **Exemplo React/Next.js**

#### **Página: Esqueci Minha Senha**

```typescript
// app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Erro ao solicitar reset. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar Email'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

#### **Página: Redefinir Senha**

```typescript
// app/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      router.push('/auth/forgot-password');
      return;
    }
    
    setToken(tokenFromUrl);
    validateToken(tokenFromUrl);
  }, [searchParams]);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      setIsValidToken(data.valid);
      
      if (!data.valid) {
        setMessage(data.message || 'Token inválido');
      }
    } catch (error) {
      setIsValidToken(false);
      setMessage('Erro ao validar token');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Senha redefinida com sucesso!');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setMessage(data.message || 'Erro ao redefinir senha');
      }
    } catch (error) {
      setMessage('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return <div>Validando token...</div>;
  }

  if (!isValidToken) {
    return (
      <div>
        <p>{message}</p>
        <button onClick={() => router.push('/auth/forgot-password')}>
          Solicitar Novo Reset
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Nova senha"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        minLength={4}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

---

## 🚀 Deploy (Railway)

### **Configurar Variáveis de Ambiente**

1. Acesse seu projeto no Railway
2. Vá em **Settings → Variables**
3. Adicione:

```
EMAIL_USER = seu.email@gmail.com
EMAIL_PASS = xxxx xxxx xxxx xxxx
FRONTEND_URL = https://seu-frontend.netlify.app
```

4. **Redeploy** automático

### **Verificar Health Check**

```bash
curl https://seu-backend.railway.app/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 123.456
}
```

---

## 🐛 Troubleshooting

### **Problema: Email não chega**

**Soluções:**
1. ✅ Verificar pasta de **Spam**
2. ✅ Conferir se `EMAIL_USER` e `EMAIL_PASS` estão corretos
3. ✅ Verificar logs do servidor: `console.log` mostra "Email enviado"
4. ✅ Confirmar que **2FA está ativado** no Gmail
5. ✅ Verificar **quota do Gmail** (500 emails/dia grátis)

### **Problema: "Token inválido"**

**Soluções:**
1. ✅ Usar `/auth/validate-reset-token` para debugar
2. ✅ Verificar se token no email == token na requisição
3. ✅ Verificar tabela `password_reset_tokens` no Supabase

### **Problema: "Token expirado"**

**Solução:**
- Tokens expiram em **1 hora**
- Solicitar novo reset de senha

### **Problema: Servidor não conecta com Gmail**

**Verificar:**
```bash
# Testar autenticação do Gmail
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'seu@gmail.com',
    pass: 'sua_senha_app'
  }
});
transporter.verify((err, success) => {
  if (err) console.error('❌ Erro:', err);
  else console.log('✅ Gmail conectado!');
});
"
```

---

## 📚 Documentação Completa

- 📖 [Setup Detalhado](./docs/EMAIL_SETUP.md)
- 🧪 [Scripts de Teste](./scripts/)
- 🔐 [Swagger Docs](http://localhost:3001/api/docs)

---

## ✅ Checklist de Produção

Antes de colocar em produção:

- [ ] ✅ Configurar `EMAIL_USER` e `EMAIL_PASS` no Railway
- [ ] ✅ Configurar `FRONTEND_URL` correto
- [ ] ✅ Testar endpoints em ambiente de staging
- [ ] ✅ Verificar se emails chegam corretamente
- [ ] ✅ Validar templates de email em diferentes clients
- [ ] ✅ Configurar monitoramento de envio de emails
- [ ] ✅ Documentar processo para equipe

---

## 🎯 Pronto para Uso!

O sistema está **100% funcional** e pronto para produção!

**Próximos passos:**
1. Configure as variáveis de ambiente
2. Execute os scripts de teste
3. Deploy no Railway
4. 🚀 Sistema funcionando!

---

**Desenvolvido com ❤️ para Bravo.Bet**

