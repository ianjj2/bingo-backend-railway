# ⚡ Configuração Rápida - Email System (Hostinger)

## 🔐 Credenciais Recebidas

```
Email: vip@bravovip.com.br
Senha: z;7V?r#@U
Provedor: Hostinger
```

---

## 📝 Passo a Passo

### **1. Criar/Editar `.env.local`**

Crie o arquivo `.env.local` na raiz do projeto com:

```env
# ========================================
# 📧 EMAIL CONFIGURATION (HOSTINGER)
# ========================================
EMAIL_USER=vip@bravovip.com.br
EMAIL_PASS=z;7V?r#@U

# SMTP Settings (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587

# ========================================
# 🌐 FRONTEND URL
# ========================================
FRONTEND_URL=https://bravovip.com.br

# ========================================
# 🗄️ SUPABASE (Já configurado)
# ========================================
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service

# ========================================
# 🔑 JWT (Já configurado)
# ========================================
JWT_SECRET=sua_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ========================================
# 🚀 SERVER
# ========================================
PORT=3001
NODE_ENV=development
HOST=0.0.0.0
```

---

### **2. Verificar Configuração da Hostinger**

✅ **HOSTINGER** detectado! O sistema usará:

- **Host SMTP:** smtp.hostinger.com
- **Porta:** 587 (TLS)
- **Email:** vip@bravovip.com.br
- **Senha:** A senha do painel de controle da Hostinger

⚠️ **IMPORTANTE:** 
- Use a **senha do email** criada no painel da Hostinger
- NÃO é a senha do painel de controle (a menos que sejam iguais)
- Se não funcionar, verifique se a senha está correta no painel da Hostinger

---

### **3. Testar Conexão**

```bash
# Opção 1: Iniciar servidor e verificar logs
npm run start:dev

# Você deve ver no console:
# ✅ Servidor de email (Gmail) pronto para enviar mensagens
```

Se ver erro de autenticação:
```
❌ Erro na configuração do email: Invalid login
```

Significa que as credenciais estão incorretas ou 2FA não está configurado.

---

### **4. Testar Envio de Email**

```bash
# Terminal 1: Servidor rodando
npm run start:dev

# Terminal 2: Testar endpoint
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vip@bravovip.com.br"}'
```

**Verificar:**
1. ✅ Logs do servidor mostram: `✅ Email de reset enviado para vip@bravovip.com.br`
2. ✅ Email chega na caixa de entrada de `vip@bravovip.com.br`

---

### **5. Deploy no Railway**

Quando estiver funcionando localmente, configure no Railway:

```
Settings → Variables → Add Variable:

EMAIL_USER = vip@bravovip.com.br
EMAIL_PASS = z;7V?r#@U
SMTP_HOST = smtp.hostinger.com
SMTP_PORT = 587
FRONTEND_URL = https://bravovip.com.br
```

---

## 🔧 Troubleshooting

### **Erro: "Invalid login" ou "Authentication failed"**

**Soluções:**

1. **Verificar senha no painel da Hostinger:**
   - Login: https://hpanel.hostinger.com
   - Emails → Contas de Email
   - Verificar/redefinir senha de `vip@bravovip.com.br`

2. **Testar credenciais manualmente:**
   ```bash
   # Usar telnet para testar SMTP
   telnet smtp.hostinger.com 587
   ```

3. **Alternativa: Usar porta 465 (SSL):**
   ```env
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   ```

### **Erro: "Connection timeout"**

**Solução:**
- Verificar firewall/antivírus
- Verificar se a porta 587 está aberta
- Tentar porta alternativa (465)

### **Email não chega**

**Verificar:**
1. ✅ Pasta de Spam
2. ✅ Logs do servidor (deve mostrar "Email enviado")
3. ✅ Quota do Gmail (500 emails/dia para contas gratuitas)

---

## ✅ Checklist

- [ ] Criar arquivo `.env.local` com credenciais
- [ ] Verificar 2FA no Gmail
- [ ] Confirmar que senha é de app (não senha principal)
- [ ] Iniciar servidor (`npm run start:dev`)
- [ ] Ver mensagem: "✅ Servidor de email pronto"
- [ ] Testar endpoint `/auth/forgot-password`
- [ ] Verificar email na caixa de entrada
- [ ] Configurar no Railway quando estiver funcionando

---

## 🚀 Próximos Passos

1. **Agora:** Criar `.env.local` com as credenciais acima
2. **Depois:** Testar localmente
3. **Por fim:** Deploy no Railway

---

**Pronto para começar!** 🎉

Execute:
```bash
npm run start:dev
```

E teste o sistema de reset de senha!

