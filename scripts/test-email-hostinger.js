#!/usr/bin/env node

/**
 * 🔍 Script de Diagnóstico - Email Hostinger
 * 
 * Este script testa a conexão SMTP e envio de email passo a passo
 * Execute: node scripts/test-email-hostinger.js
 */

const nodemailer = require('nodemailer').default || require('nodemailer');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function divider() {
  console.log('='.repeat(60));
}

// Configurações
const CONFIG = {
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'vip@bravovip.com.br',
    pass: 'z;7V?r#@U',
  },
  tls: {
    rejectUnauthorized: false,
  },
};

async function test1_VerifyConnection() {
  divider();
  log('🔍 TESTE 1: Verificando conexão SMTP', 'cyan');
  divider();
  console.log('');
  
  log(`Host: ${CONFIG.host}`, 'blue');
  log(`Porta: ${CONFIG.port}`, 'blue');
  log(`Email: ${CONFIG.auth.user}`, 'blue');
  log(`Senha: ${'*'.repeat(CONFIG.auth.pass.length)}`, 'blue');
  console.log('');

  const transporter = nodemailer.createTransporter(CONFIG);

  return new Promise((resolve) => {
    transporter.verify((error, success) => {
      if (error) {
        log('❌ FALHOU: Erro na conexão SMTP', 'red');
        console.log('');
        console.error('Detalhes do erro:');
        console.error(error);
        console.log('');
        
        // Diagnóstico do erro
        if (error.code === 'EAUTH') {
          log('🔍 Diagnóstico: Erro de autenticação', 'yellow');
          log('   Possíveis causas:', 'yellow');
          log('   - Senha incorreta', 'yellow');
          log('   - Email não existe na Hostinger', 'yellow');
          log('   - Conta de email desabilitada', 'yellow');
          log('', 'yellow');
          log('   Solução:', 'yellow');
          log('   1. Acesse https://hpanel.hostinger.com', 'yellow');
          log('   2. Vá em Emails → Contas de Email', 'yellow');
          log('   3. Verifique/redefina a senha de vip@bravovip.com.br', 'yellow');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
          log('🔍 Diagnóstico: Problema de conexão', 'yellow');
          log('   Possíveis causas:', 'yellow');
          log('   - Firewall bloqueando porta 587', 'yellow');
          log('   - Antivírus bloqueando conexão', 'yellow');
          log('   - Servidor Hostinger indisponível', 'yellow');
          log('', 'yellow');
          log('   Solução:', 'yellow');
          log('   1. Tente porta alternativa (465)', 'yellow');
          log('   2. Desabilite temporariamente firewall/antivírus', 'yellow');
          log('   3. Verifique status: https://www.hostinger.com/status', 'yellow');
        }
        
        resolve({ success: false, error });
      } else {
        log('✅ PASSOU: Conexão SMTP OK!', 'green');
        log('   Servidor respondeu corretamente', 'green');
        resolve({ success: true });
      }
    });
  });
}

async function test2_SendTestEmail() {
  divider();
  log('📧 TESTE 2: Enviando email de teste', 'cyan');
  divider();
  console.log('');

  const transporter = nodemailer.createTransport(CONFIG);

  const mailOptions = {
    from: {
      name: 'Bravo.Bet - Teste',
      address: CONFIG.auth.user,
    },
    to: CONFIG.auth.user, // Envia para o mesmo email
    subject: '🧪 Teste SMTP - Hostinger',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #059669;">✅ Email de Teste Funcionando!</h1>
        <p>Este é um email de teste do sistema Bravo.Bet.</p>
        <p><strong>Servidor SMTP:</strong> ${CONFIG.host}</p>
        <p><strong>Porta:</strong> ${CONFIG.port}</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Se você recebeu este email, significa que o sistema de envio está funcionando corretamente!
        </p>
      </body>
      </html>
    `,
  };

  log('Enviando para: ' + mailOptions.to, 'blue');
  log('Assunto: ' + mailOptions.subject, 'blue');
  console.log('');

  return new Promise((resolve) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        log('❌ FALHOU: Erro ao enviar email', 'red');
        console.log('');
        console.error('Detalhes do erro:');
        console.error(error);
        resolve({ success: false, error });
      } else {
        log('✅ PASSOU: Email enviado com sucesso!', 'green');
        console.log('');
        log('📋 Informações do envio:', 'blue');
        log(`   Message ID: ${info.messageId}`, 'blue');
        log(`   Response: ${info.response}`, 'blue');
        console.log('');
        log('📬 Verifique sua caixa de entrada:', 'yellow');
        log('   1. Acesse: https://webmail.hostinger.com', 'yellow');
        log('   2. Login: vip@bravovip.com.br', 'yellow');
        log('   3. Procure email com assunto: "🧪 Teste SMTP - Hostinger"', 'yellow');
        log('   4. Se não estiver na entrada, verifique SPAM/LIXEIRA', 'yellow');
        resolve({ success: true, info });
      }
    });
  });
}

async function test3_TestPortAlternative() {
  divider();
  log('🔄 TESTE 3: Testando porta alternativa (465 SSL)', 'cyan');
  divider();
  console.log('');

  const alternativeConfig = {
    ...CONFIG,
    port: 465,
    secure: true,
  };

  log(`Host: ${alternativeConfig.host}`, 'blue');
  log(`Porta: ${alternativeConfig.port} (SSL)`, 'blue');
  console.log('');

  const transporter = nodemailer.createTransport(alternativeConfig);

  return new Promise((resolve) => {
    transporter.verify((error, success) => {
      if (error) {
        log('❌ Porta 465 também não funcionou', 'red');
        console.log('');
        console.error('Erro:', error.message);
        resolve({ success: false, error });
      } else {
        log('✅ Porta 465 está funcionando!', 'green');
        log('', 'green');
        log('💡 Use esta configuração no .env.local:', 'yellow');
        log('   SMTP_PORT=465', 'yellow');
        resolve({ success: true });
      }
    });
  });
}

async function main() {
  console.clear();
  
  divider();
  log('🔐 DIAGNÓSTICO COMPLETO - EMAIL HOSTINGER', 'cyan');
  log('   Bravo.Bet Backend', 'cyan');
  divider();
  console.log('');

  // TESTE 1: Verificar conexão
  const test1Result = await test1_VerifyConnection();
  console.log('');

  if (!test1Result.success) {
    log('⚠️  Conexão SMTP falhou. Tentando porta alternativa...', 'yellow');
    console.log('');
    
    // TESTE 3: Porta alternativa
    await test3_TestPortAlternative();
    console.log('');
    
    divider();
    log('❌ Não foi possível estabelecer conexão', 'red');
    divider();
    console.log('');
    printTroubleshooting();
    process.exit(1);
  }

  // TESTE 2: Enviar email
  const test2Result = await test2_SendTestEmail();
  console.log('');

  if (!test2Result.success) {
    log('⚠️  Falha no envio. Tentando porta alternativa...', 'yellow');
    console.log('');
    
    // TESTE 3: Porta alternativa
    await test3_TestPortAlternative();
    console.log('');
    
    printTroubleshooting();
    process.exit(1);
  }

  // Sucesso!
  divider();
  log('✅ TODOS OS TESTES PASSARAM!', 'green');
  divider();
  console.log('');
  printSuccess();
}

function printTroubleshooting() {
  console.log('🔧 TROUBLESHOOTING:');
  console.log('');
  console.log('1️⃣  Verificar senha no painel:');
  console.log('   https://hpanel.hostinger.com → Emails → Contas de Email');
  console.log('');
  console.log('2️⃣  Verificar se o email existe:');
  console.log('   Login no webmail: https://webmail.hostinger.com');
  console.log('   Email: vip@bravovip.com.br');
  console.log('   Senha: (a mesma do .env.local)');
  console.log('');
  console.log('3️⃣  Testar porta alternativa:');
  console.log('   Edite .env.local e mude: SMTP_PORT=465');
  console.log('');
  console.log('4️⃣  Verificar firewall/antivírus:');
  console.log('   Pode estar bloqueando portas 587 ou 465');
  console.log('');
  console.log('5️⃣  Entrar em contato com suporte Hostinger:');
  console.log('   Se nada funcionar, o problema pode ser na conta');
  console.log('');
}

function printSuccess() {
  console.log('🎉 Sistema de email está funcionando!');
  console.log('');
  console.log('📝 Próximos passos:');
  console.log('');
  console.log('1. ✅ Verifique sua caixa de entrada (vip@bravovip.com.br)');
  console.log('2. ✅ Se recebeu o email de teste, está tudo OK!');
  console.log('3. ✅ Agora teste o endpoint /auth/forgot-password');
  console.log('4. ✅ Configure as mesmas variáveis no Railway');
  console.log('');
  console.log('📧 Para testar o endpoint:');
  console.log('   curl -X POST http://localhost:3001/auth/forgot-password \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"email":"vip@bravovip.com.br"}\'');
  console.log('');
}

// Executar testes
main().catch(error => {
  console.error('');
  log('❌ Erro fatal durante os testes:', 'red');
  console.error(error);
  process.exit(1);
});

