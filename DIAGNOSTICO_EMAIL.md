# 🔍 Diagnóstico - Email Não Está Chegando

## ⚡ Execute o Script de Diagnóstico

Criei um script que vai testar **tudo** e identificar o problema:

```bash
node scripts/test-email-hostinger.js
```

Este script vai:
1. ✅ Testar conexão SMTP com a Hostinger
2. ✅ Enviar um email de teste real
3. ✅ Testar porta alternativa se necessário
4. ✅ Mostrar exatamente onde está o problema

---

## 🔧 Verificações Manuais

Se o script não funcionar, faça estas verificações:

### **1. Verificar Configuração do `.env.local`**

Confirme que está **exatamente** assim:

```env
EMAIL_USER=vip@bravovip.com.br
EMAIL_PASS=z;7V?r#@U
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
FRONTEND_URL=https://bravovip.com.br
```

⚠️ **Importante:**
- Sem espaços extras
- Sem aspas
- Senha exatamente como está acima

---

### **2. Verificar Senha no Painel Hostinger**

A senha pode estar incorreta. Verifique:

1. **Acesse:** https://hpanel.hostinger.com
2. **Login** com suas credenciais do painel
3. **Menu:** Emails → Contas de Email
4. **Localizar:** vip@bravovip.com.br
5. **Ações:** Clique em "⋮" (três pontos) → Gerenciar
6. **Verificar/Redefinir** senha

**Teste a senha no Webmail:**
- Acesse: https://webmail.hostinger.com
- Login: vip@bravovip.com.br
- Senha: z;7V?r#@U

Se não conseguir fazer login no webmail, a senha está incorreta!

---

### **3. Verificar se o Email Existe**

No painel da Hostinger:
1. Emails → Contas de Email
2. Procurar: vip@bravovip.com.br
3. Status deve estar: **Ativo** ✅

Se não existir ou estiver inativo, crie/ative o email.

---

### **4. Testar Porta Alternativa**

A Hostinger suporta duas portas:

**Opção 1 (TLS - Porta 587):**
```env
SMTP_PORT=587
```

**Opção 2 (SSL - Porta 465):**
```env
SMTP_PORT=465
```

Tente mudar de uma para outra no `.env.local` e reiniciar.

---

### **5. Verificar Logs do Servidor**

Quando você executa `npm run start:dev`, deve ver:

✅ **Se estiver OK:**
```
📧 Configurando email com SMTP: smtp.hostinger.com:587
✅ Servidor de email pronto para enviar mensagens
   📨 Emails serão enviados de: vip@bravovip.com.br
```

❌ **Se tiver erro:**
```
❌ Erro na configuração do email: [detalhes do erro]
```

**Copie o erro e me envie** para eu ajudar!

---

### **6. Testar Endpoint Manualmente**

Com o servidor rodando:

```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vip@bravovip.com.br"}'
```

**No console do servidor, deve aparecer:**
```
✅ Email de reset enviado para vip@bravovip.com.br
```

**Se aparecer erro:**
```
❌ Erro ao enviar email de reset: [detalhes]
```

Copie o erro completo!

---

## 🧪 Teste Alternativo (Sem Backend)

Crie um arquivo `test-smtp-simples.js`:

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

// Teste 1: Verificar conexão
console.log('🔍 Testando conexão...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro de conexão:', error);
  } else {
    console.log('✅ Conexão OK! Enviando email...');
    
    // Teste 2: Enviar email
    transporter.sendMail({
      from: 'vip@bravovip.com.br',
      to: 'vip@bravovip.com.br',
      subject: 'Teste SMTP',
      text: 'Email de teste funcionando!',
    }, (err, info) => {
      if (err) {
        console.error('❌ Erro ao enviar:', err);
      } else {
        console.log('✅ Email enviado!', info.messageId);
        console.log('📬 Verifique sua caixa de entrada!');
      }
    });
  }
});
```

Execute:
```bash
node test-smtp-simples.js
```

---

## 📋 Checklist de Verificação

Marque cada item após verificar:

- [ ] `.env.local` criado com as variáveis corretas
- [ ] Servidor reiniciado após criar `.env.local`
- [ ] Console mostra "✅ Servidor de email pronto"
- [ ] Senha testada no webmail (https://webmail.hostinger.com)
- [ ] Email `vip@bravovip.com.br` existe e está ativo
- [ ] Porta 587 ou 465 testada
- [ ] Firewall/antivírus não está bloqueando
- [ ] Endpoint `/auth/forgot-password` testado
- [ ] Logs do servidor verificados
- [ ] Caixa de entrada E pasta Spam verificadas

---

## 🚨 Problemas Comuns e Soluções

### **Erro: "Invalid login" ou "535 Authentication failed"**

**Causa:** Senha incorreta ou email não existe

**Solução:**
1. Verificar senha no painel Hostinger
2. Testar senha no webmail
3. Redefinir senha se necessário

---

### **Erro: "Connection timeout" ou "ETIMEDOUT"**

**Causa:** Firewall/antivírus bloqueando ou porta incorreta

**Solução:**
1. Tentar porta alternativa (465)
2. Desabilitar temporariamente firewall/antivírus
3. Verificar se o servidor Hostinger está online

---

### **Erro: "self signed certificate"**

**Causa:** Problema com certificado SSL

**Solução:** Já está configurado no código com `rejectUnauthorized: false`

---

### **Email não chega mas não dá erro**

**Verificar:**
1. ✅ Pasta de **Spam/Lixo eletrônico**
2. ✅ Aguardar até 5 minutos (pode ter delay)
3. ✅ Verificar quota do email (espaço disponível)
4. ✅ Verificar filtros de email na Hostinger
5. ✅ Verificar logs do servidor SMTP da Hostinger

---

## 📞 Próximos Passos

### **Passo 1: Execute o Script de Diagnóstico**

```bash
node scripts/test-email-hostinger.js
```

### **Passo 2: Me Envie os Resultados**

Copie TODO o output do script e me envie, incluindo:
- ✅ Logs de conexão
- ✅ Erros (se houver)
- ✅ Status de cada teste

### **Passo 3: Verificar Caixa de Entrada**

Acesse: https://webmail.hostinger.com
Login: vip@bravovip.com.br

Procure por:
- Email com assunto: "🧪 Teste SMTP - Hostinger"
- Na pasta Spam também

---

## 💡 Dica Extra

Se nada funcionar, entre em contato com o suporte da Hostinger:
- https://www.hostinger.com.br/contato
- Chat online no painel
- Pergunte: "Meu email SMTP não está funcionando. Porta 587 e 465 não conectam."

Eles podem verificar se há alguma restrição na conta.

---

**Execute o script de diagnóstico e me envie os resultados!** 🚀


