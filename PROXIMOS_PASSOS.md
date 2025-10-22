# 🚀 Próximos Passos - Deploy e Integração

## ✅ Você Acabou de Fazer: Commit

Agora siga estes passos na ordem:

---

## 📋 **PASSO 1: Push para o GitHub**

```bash
git push origin master
```

⏱️ **Tempo:** ~30 segundos

---

## 📋 **PASSO 2: Configurar Variáveis no Railway**

### **2.1. Acessar Railway:**

1. Acesse: https://railway.app
2. Login com sua conta
3. Selecione o projeto: **bingo-backend-railway**

### **2.2. Adicionar Variáveis de Ambiente:**

1. Clique em **Settings** (ou **Variables**)
2. Clique em **+ New Variable**
3. Adicione **UMA POR UMA**:

```
Variable Name: EMAIL_USER
Value: vip@bravovip.com.br
```

```
Variable Name: EMAIL_PASS
Value: z;7V?r#@U
```

```
Variable Name: SMTP_HOST
Value: smtp.hostinger.com
```

```
Variable Name: SMTP_PORT
Value: 587
```

```
Variable Name: FRONTEND_URL
Value: https://bravovip.com.br
```

### **2.3. Verificar Variáveis Existentes:**

Certifique-se que estas também estão configuradas:

```
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_KEY
✅ JWT_SECRET
✅ JWT_ACCESS_EXPIRES_IN
✅ JWT_REFRESH_EXPIRES_IN
```

⏱️ **Tempo:** ~2 minutos

---

## 📋 **PASSO 3: Fazer Deploy (Railway faz automaticamente)**

### **O que acontece:**

1. ✅ Railway detecta o push no GitHub
2. ✅ Inicia build automático
3. ✅ Faz deploy da nova versão
4. ✅ Reinicia o servidor

### **Acompanhar Deploy:**

1. No Railway, vá em **Deployments**
2. Aguarde status: **✅ Success**
3. Verifique os logs para confirmar:

```
📧 Configurando email com SMTP: smtp.hostinger.com:587
✅ Servidor de email pronto para enviar mensagens
   📨 Emails serão enviados de: vip@bravovip.com.br
```

⏱️ **Tempo:** ~3-5 minutos

---

## 📋 **PASSO 4: Testar em Produção**

### **4.1. Obter URL do Backend:**

No Railway, copie a URL do seu backend. Exemplo:
```
https://bingo-backend-railway-production.up.railway.app
```

### **4.2. Testar Endpoint de Reset:**

#### **Opção A: Usar o script (recomendado)**

Crie arquivo `test-producao.js`:

```javascript
const API_URL = 'https://SUA-URL.railway.app'; // ← COLE SUA URL AQUI

fetch(`${API_URL}/auth/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'iansilveira@bravo.bet.br' }),
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Resposta:', data);
    console.log('\n📬 Verifique o email de iansilveira@bravo.bet.br');
  })
  .catch(err => console.error('❌ Erro:', err));
```

Execute:
```bash
node test-producao.js
```

#### **Opção B: Usar Postman/Insomnia**

```
POST https://SUA-URL.railway.app/auth/forgot-password
Content-Type: application/json

{
  "email": "iansilveira@bravo.bet.br"
}
```

#### **Opção C: Usar cURL (PowerShell)**

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://SUA-URL.railway.app/auth/forgot-password" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"iansilveira@bravo.bet.br"}'
```

### **4.3. Verificar Email Chegou:**

1. Acesse: https://webmail.hostinger.com ou seu cliente de email
2. Login: iansilveira@bravo.bet.br
3. Procure: **"🔒 Redefinição de Senha - Bingo Live Bravo.Bet"**
4. Verifique Spam se não aparecer na Entrada

### **4.4. Testar Validação de Token:**

Copie o token do email e teste:

```javascript
// test-validacao-producao.js
const API_URL = 'https://SUA-URL.railway.app';
const TOKEN = 'cole_o_token_do_email_aqui';

fetch(`${API_URL}/auth/validate-reset-token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: TOKEN }),
})
  .then(res => res.json())
  .then(data => console.log('Validação:', data))
  .catch(err => console.error('Erro:', err));
```

⏱️ **Tempo:** ~5 minutos

---

## 📋 **PASSO 5: Integrar com Frontend**

### **5.1. Configurar URL do Backend no Frontend:**

No seu projeto frontend (Next.js/React), adicione a URL do backend:

```env
# .env.local (frontend)
NEXT_PUBLIC_API_URL=https://SUA-URL.railway.app
```

### **5.2. Implementar Página "Esqueci Minha Senha":**

```typescript
// app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Esqueci Minha Senha</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
```

### **5.3. Implementar Página "Redefinir Senha":**

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/validate-reset-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();
      setIsValidToken(data.valid);
      
      if (!data.valid) {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Erro ao validar token');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 4) {
      setMessage('Senha deve ter pelo menos 4 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Senha redefinida com sucesso!');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setMessage(data.message || 'Erro ao redefinir senha');
      }
    } catch (error) {
      setMessage('Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return <div>Validando token...</div>;
  }

  if (!isValidToken) {
    return (
      <div className="error-container">
        <h1>Token Inválido</h1>
        <p>{message}</p>
        <button onClick={() => router.push('/auth/forgot-password')}>
          Solicitar Novo Reset
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Redefinir Senha</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
```

### **5.4. Adicionar Link na Página de Login:**

```tsx
// app/auth/login/page.tsx
<Link href="/auth/forgot-password">
  Esqueci minha senha
</Link>
```

⏱️ **Tempo:** ~15-20 minutos

---

## 📋 **PASSO 6: Testar Fluxo Completo**

### **Teste End-to-End:**

1. **Frontend:** Acesse `/auth/forgot-password`
2. **Digite:** iansilveira@bravo.bet.br
3. **Clique:** "Enviar Email"
4. **Verifique:** Email chegou
5. **Clique:** No link do email
6. **Frontend:** Deve abrir `/auth/reset-password?token=...`
7. **Digite:** Nova senha
8. **Confirme:** Senha
9. **Clique:** "Redefinir Senha"
10. **Resultado:** Redirecionado para `/auth/login`
11. **Teste:** Login com nova senha

⏱️ **Tempo:** ~5 minutos

---

## ✅ **Checklist Final:**

- [ ] Push para GitHub
- [ ] Variáveis configuradas no Railway
- [ ] Deploy concluído (status Success)
- [ ] Logs mostram "Servidor de email pronto"
- [ ] Teste em produção funcionou
- [ ] Email chegou
- [ ] Frontend configurado com URL do backend
- [ ] Páginas de reset implementadas
- [ ] Fluxo completo testado
- [ ] Login funciona com nova senha

---

## 🎯 **Resultado Esperado:**

Ao finalizar, você terá:

✅ Sistema de reset de senha **funcionando em produção**  
✅ Emails sendo enviados **de verdade**  
✅ Frontend integrado e **testado**  
✅ Fluxo completo **end-to-end** operacional  

---

## 📞 **Se Algo Der Errado:**

### **Email não chega em produção:**

1. Verificar logs do Railway
2. Verificar se variáveis estão corretas
3. Testar SMTP manualmente (script test-smtp-basico.js)

### **Erro 500 no endpoint:**

1. Verificar logs do Railway
2. Verificar se todas as variáveis estão configuradas
3. Verificar se banco de dados está acessível

### **Token inválido:**

1. Verificar se tabela `password_reset_tokens` existe
2. Verificar se token foi salvo no banco
3. Verificar expiração (1 hora)

---

## 🚀 **Vamos Começar!**

**AGORA EXECUTE:**

```bash
git push origin master
```

Depois me avise quando o deploy no Railway terminar! 🎯


