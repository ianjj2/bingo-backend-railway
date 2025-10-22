# 🔧 Solução: SMTP Bloqueado no Railway

## ⚠️ Problema Identificado

O Railway está **bloqueando a porta 587** (TLS), que é comum em plataformas cloud para prevenir spam.

**Erro:**
```
Connection timeout - ETIMEDOUT
```

---

## ✅ SOLUÇÃO 1: Usar Porta 465 (SSL) - RECOMENDADO

### **Passo 1: Atualizar Variável no Railway**

1. Acesse: Railway → Seu Projeto → **Variables**
2. **Altere** a variável `SMTP_PORT`:

```
SMTP_PORT = 465
```

3. **Salvar** → Aguardar redeploy automático

### **Passo 2: Verificar Logs**

Após redeploy, verifique os logs. Deve aparecer:

```
📧 Configurando email com SMTP: smtp.hostinger.com:465 (SSL)
✅ Servidor de email pronto para enviar mensagens
```

### **Passo 3: Testar Novamente**

Execute o teste de produção novamente.

---

## ✅ SOLUÇÃO 2: Usar Serviço de Email Transacional (ALTERNATIVA)

Se a porta 465 também for bloqueada, use um serviço especializado:

### **Opção A: Resend (Recomendado - Mais Simples)**

**Vantagens:**
- ✅ 100 emails grátis/dia
- ✅ Fácil configuração
- ✅ Não bloqueado por cloud
- ✅ API simples

**Setup:**

1. **Criar conta:** https://resend.com
2. **Pegar API Key**
3. **Instalar:**
```bash
npm install resend
```

4. **Código:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({
    from: 'Bravo.Bet <noreply@bravovip.com.br>',
    to,
    subject,
    html,
  });
}
```

---

### **Opção B: SendGrid**

**Vantagens:**
- ✅ 100 emails grátis/dia
- ✅ Muito usado
- ✅ Confiável

**Setup:**

1. **Criar conta:** https://sendgrid.com
2. **Pegar API Key**
3. **Instalar:**
```bash
npm install @sendgrid/mail
```

4. **Código:**
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async sendEmail(to: string, subject: string, html: string) {
  await sgMail.send({
    from: 'noreply@bravovip.com.br',
    to,
    subject,
    html,
  });
}
```

---

### **Opção C: Nodemailer com Gmail**

Use Gmail diretamente (mais simples):

**Variáveis no Railway:**
```
EMAIL_USER = seu.email@gmail.com
EMAIL_PASS = senha_de_app_gmail (16 caracteres)
SMTP_HOST = (deixe vazio, vai detectar Gmail automaticamente)
```

**Nota:** Precisa ativar 2FA e gerar senha de app no Gmail.

---

## 🚀 AÇÃO IMEDIATA

### **Teste Rápido - Porta 465:**

1. **Altere no Railway:**
```
SMTP_PORT = 465
```

2. **Aguarde redeploy** (~2 min)

3. **Verifique logs:**
   - Deve mostrar: `smtp.hostinger.com:465 (SSL)`
   - Se conectar: ✅ Funcionou!
   - Se timeout novamente: ❌ Railway bloqueou também

4. **Se funcionou:**
   - ✅ Problema resolvido!
   - Faça commit da alteração no código

5. **Se não funcionou:**
   - Use **Solução 2** (Resend ou SendGrid)

---

## 📝 Atualizar Código Local

Eu já atualizei o código para usar porta 465 por padrão.

**Faça commit e push:**

```bash
git add src/email/email.service.ts
git commit -m "fix: usar porta 465 (SSL) para SMTP em produção

- Porta 465 funciona melhor em ambientes cloud
- Adicionado timeouts para conexões
- Porta 587 é bloqueada pelo Railway"

git push origin master
```

---

## 🔍 Como Identificar Qual Porta Funciona

### **Teste Local (PowerShell):**

```powershell
# Testar porta 587
Test-NetConnection -ComputerName smtp.hostinger.com -Port 587

# Testar porta 465
Test-NetConnection -ComputerName smtp.hostinger.com -Port 465
```

Se ambas retornarem `TcpTestSucceeded : True`, as portas estão abertas.

---

## ⚡ Resumo das Opções

| Solução | Dificuldade | Custo | Tempo |
|---------|-------------|-------|-------|
| **Porta 465** | ⭐ Fácil | Grátis | 5 min |
| **Resend** | ⭐⭐ Médio | Grátis (100/dia) | 15 min |
| **SendGrid** | ⭐⭐ Médio | Grátis (100/dia) | 15 min |
| **Gmail** | ⭐ Fácil | Grátis (500/dia) | 10 min |

---

## 🎯 Minha Recomendação

### **1º - Tentar Porta 465** (AGORA)
Rápido e pode resolver imediatamente.

### **2º - Se não funcionar, usar Resend**
Mais confiável para produção, API simples, não tem bloqueios.

---

## 📞 Precisa de Ajuda?

Me avise qual solução você quer usar que eu te ajudo a implementar! 🚀

### **Para porta 465:**
- Mude `SMTP_PORT=465` no Railway
- Aguarde redeploy
- Teste novamente

### **Para Resend:**
- Crie conta em resend.com
- Me avise que eu implemento o código

