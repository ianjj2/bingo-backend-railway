# 📧 Configuração Email Hostinger - Bravo.Bet

## ✅ Sistema Atualizado para Hostinger

O código foi **atualizado** para funcionar com emails da Hostinger!

---

## 🔐 Suas Credenciais

```
Email: vip@bravovip.com.br
Senha: z;7V?r#@U
SMTP: smtp.hostinger.com
Porta: 587 (TLS)
Frontend: https://bravovip.com.br
```

---

## ⚡ Configuração Rápida (3 Passos)

### **1. Criar/Atualizar `.env.local`**

Crie ou edite o arquivo `.env.local` na raiz do projeto:

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
# 🗄️ SUPABASE (já configurado)
# ========================================
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave
SUPABASE_SERVICE_KEY=sua_chave_service

# ========================================
# 🔑 JWT (já configurado)
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

### **2. Reiniciar o Servidor**

```bash
# Parar servidor (Ctrl+C)
# Iniciar novamente
npm run start:dev
```

**Você deve ver:**
```
📧 Configurando email com SMTP: smtp.hostinger.com:587
✅ Servidor de email pronto para enviar mensagens
   📨 Emails serão enviados de: vip@bravovip.com.br
```

---

### **3. Testar Envio**

```bash
# Em outro terminal
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vip@bravovip.com.br"}'
```

**Verificar:**
1. ✅ Console mostra: `✅ Email de reset enviado para vip@bravovip.com.br`
2. ✅ Email chega em `vip@bravovip.com.br`
3. ✅ Verificar pasta de Spam se não aparecer na caixa de entrada

---

## 🔍 Configuração SMTP da Hostinger

### **Configurações Padrão:**

| Configuração | Valor |
|-------------|-------|
| **Servidor SMTP** | smtp.hostinger.com |
| **Porta (TLS)** | 587 |
| **Porta (SSL)** | 465 |
| **Segurança** | TLS/STARTTLS |
| **Autenticação** | Obrigatória |

### **Alternativa (SSL - Porta 465):**

Se a porta 587 não funcionar, tente:

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
```

---

## 🛠️ Verificar Senha no Painel Hostinger

Se o email não estiver sendo enviado, verifique a senha:

1. **Acessar:** https://hpanel.hostinger.com
2. **Login** com suas credenciais
3. **Emails** → **Contas de Email**
4. **Localizar:** vip@bravovip.com.br
5. **Verificar/Redefinir** senha se necessário

⚠️ **IMPORTANTE:** A senha do email pode ser diferente da senha do painel!

---

## 🧪 Testar Conexão SMTP Manualmente

### **Teste 1: Verificar Porta Aberta**

```bash
telnet smtp.hostinger.com 587
```

**Resultado esperado:**
```
220 smtp.hostinger.com ESMTP
```

### **Teste 2: Script Node.js**

Crie um arquivo `test-smtp.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'vip@bravovip.com.br',
    pass: 'z;7V?r#@U',
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ SMTP OK! Pronto para enviar emails');
  }
});

// Testar envio
transporter.sendMail({
  from: 'vip@bravovip.com.br',
  to: 'vip@bravovip.com.br',
  subject: 'Teste SMTP Hostinger',
  text: 'Email de teste funcionando!',
}, (err, info) => {
  if (err) {
    console.error('❌ Erro ao enviar:', err);
  } else {
    console.log('✅ Email enviado:', info.messageId);
  }
});
```

Executar:
```bash
node test-smtp.js
```

---

## 🚀 Deploy no Railway

### **Configurar Variáveis de Ambiente:**

1. **Acessar:** Railway Dashboard → Seu Projeto
2. **Ir em:** Settings → Variables
3. **Adicionar:**

```
EMAIL_USER = vip@bravovip.com.br
EMAIL_PASS = z;7V?r#@U
SMTP_HOST = smtp.hostinger.com
SMTP_PORT = 587
FRONTEND_URL = https://bravovip.com.br
```

4. **Salvar** → Aguardar redeploy automático

### **Testar Produção:**

```bash
curl -X POST https://seu-backend.railway.app/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vip@bravovip.com.br"}'
```

---

## 🐛 Troubleshooting

### **Problema: "Invalid login"**

**Causas possíveis:**
1. Senha incorreta
2. Email não existe na Hostinger
3. Conta de email desabilitada

**Soluções:**
1. Verificar senha no painel Hostinger
2. Redefinir senha da conta de email
3. Garantir que `vip@bravovip.com.br` está ativo

---

### **Problema: "Connection timeout"**

**Causas possíveis:**
1. Firewall bloqueando porta 587
2. Antivírus bloqueando conexão SMTP
3. Servidor Hostinger temporariamente indisponível

**Soluções:**
1. Tentar porta alternativa (465):
   ```env
   SMTP_PORT=465
   ```
2. Desabilitar temporariamente firewall/antivírus
3. Verificar status da Hostinger: https://www.hostinger.com/status

---

### **Problema: Email não chega**

**Checklist:**
- [ ] ✅ Console mostra "Email enviado"
- [ ] ✅ Verificar pasta de **Spam**
- [ ] ✅ Verificar **Lixeira**
- [ ] ✅ Adicionar `noreply@bravovip.com.br` nos contatos
- [ ] ✅ Verificar filtros de email
- [ ] ✅ Aguardar até 5 minutos (pode haver delay)

---

### **Problema: "Error: self signed certificate"**

**Solução:**
O código já inclui `rejectUnauthorized: false`. Se ainda assim der erro, tente:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## 📊 Logs Úteis

### **Console do Servidor:**

```
📧 Configurando email com SMTP: smtp.hostinger.com:587
✅ Servidor de email pronto para enviar mensagens
   📨 Emails serão enviados de: vip@bravovip.com.br
```

### **Ao Enviar Email:**

```
✅ Email de reset enviado para usuario@email.com
```

### **Se Houver Erro:**

```
❌ Erro ao enviar email de reset: [detalhes do erro]
```

---

## ✅ Checklist de Verificação

Antes de testar, certifique-se:

- [ ] `.env.local` criado com todas as variáveis
- [ ] Servidor reiniciado após criar/atualizar `.env.local`
- [ ] Console mostra "✅ Servidor de email pronto"
- [ ] Email `vip@bravovip.com.br` existe e está ativo na Hostinger
- [ ] Senha está correta (verificar no painel)
- [ ] Porta 587 não está bloqueada
- [ ] Frontend URL está correta (`https://bravovip.com.br`)

---

## 🎯 Próximos Passos

1. ✅ **Agora:** Criar `.env.local` com as configurações acima
2. ✅ **Depois:** Reiniciar servidor (`npm run start:dev`)
3. ✅ **Testar:** Enviar email de teste
4. ✅ **Verificar:** Email chegou na caixa de entrada
5. ✅ **Deploy:** Configurar no Railway

---

## 📞 Suporte

Se continuar com problemas após seguir este guia:

1. Verificar senha no painel Hostinger
2. Tentar porta alternativa (465)
3. Testar com script Node.js standalone
4. Verificar logs do servidor para erros detalhados

---

**Sistema configurado para Hostinger!** 🚀  
Qualquer dúvida, consulte este guia.

