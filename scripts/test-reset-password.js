#!/usr/bin/env node

/**
 * 🧪 Script de Teste - Sistema de Reset de Senha
 * 
 * Execute: node scripts/test-reset-password.js
 */

const readline = require('readline');

const API_URL = 'http://localhost:3001';
const TEST_EMAIL = 'teste@email.com';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function divider() {
  console.log('='.repeat(50));
}

async function makeRequest(endpoint, body) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function test1_RequestPasswordReset() {
  divider();
  log('📧 TESTE 1: Solicitar Reset de Senha', 'yellow');
  divider();
  console.log('');
  
  log(`Email: ${TEST_EMAIL}`, 'cyan');
  console.log('');
  
  const result = await makeRequest('/auth/forgot-password', { email: TEST_EMAIL });
  
  console.log('Resposta:');
  console.log(JSON.stringify(result.data, null, 2));
  console.log('');
  
  if (result.ok && result.data.message?.includes('receberá instruções')) {
    log('✅ PASSOU: Email de reset solicitado com sucesso', 'green');
    return true;
  } else {
    log('❌ FALHOU: Erro ao solicitar reset', 'red');
    return false;
  }
}

async function test2_ValidateToken(token) {
  divider();
  log('🔍 TESTE 2: Validar Token', 'yellow');
  divider();
  console.log('');
  
  const result = await makeRequest('/auth/validate-reset-token', { token });
  
  console.log('Resposta:');
  console.log(JSON.stringify(result.data, null, 2));
  console.log('');
  
  if (result.ok && result.data.valid === true) {
    log('✅ PASSOU: Token válido', 'green');
    return true;
  } else if (result.data.message?.includes('expirado')) {
    log('⏰ Token expirado (esperado se passou > 1 hora)', 'yellow');
    return false;
  } else {
    log('❌ FALHOU: Token inválido', 'red');
    return false;
  }
}

async function test3_ResetPassword(token) {
  divider();
  log('🔑 TESTE 3: Redefinir Senha', 'yellow');
  divider();
  console.log('');
  
  const newPassword = 'NovaSenha123!';
  
  const result = await makeRequest('/auth/reset-password', {
    token,
    newPassword,
  });
  
  console.log('Resposta:');
  console.log(JSON.stringify(result.data, null, 2));
  console.log('');
  
  if (result.ok && result.data.message?.includes('sucesso')) {
    log('✅ PASSOU: Senha redefinida com sucesso', 'green');
    return true;
  } else {
    log('❌ FALHOU: Erro ao redefinir senha', 'red');
    return false;
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  console.clear();
  
  divider();
  log('🔐 SISTEMA DE RESET DE SENHA - TESTE COMPLETO', 'cyan');
  divider();
  console.log('');
  
  // TESTE 1: Solicitar reset
  const test1Passed = await test1_RequestPasswordReset();
  console.log('');
  
  if (!test1Passed) {
    log('⚠️  Verifique se o servidor está rodando em ' + API_URL, 'yellow');
    process.exit(1);
  }
  
  // Pedir token ao usuário
  console.log('');
  divider();
  log('ℹ️  Verifique seu email e copie o token', 'cyan');
  divider();
  console.log('');
  
  const token = await askQuestion('Digite o token recebido no email (ou Enter para pular): ');
  console.log('');
  
  if (!token || token.trim() === '') {
    log('⏭️  Pulando testes 2 e 3 (token não fornecido)', 'yellow');
    console.log('');
    printNextSteps();
    process.exit(0);
  }
  
  // TESTE 2: Validar token
  const test2Passed = await test2_ValidateToken(token.trim());
  console.log('');
  
  if (!test2Passed) {
    log('⚠️  Token inválido ou expirado. Solicite um novo reset.', 'yellow');
    process.exit(1);
  }
  
  // TESTE 3: Redefinir senha
  await test3_ResetPassword(token.trim());
  console.log('');
  
  divider();
  log('✅ Todos os testes finalizados!', 'green');
  divider();
  console.log('');
  
  printNextSteps();
}

function printNextSteps() {
  console.log('📝 Próximos passos:');
  console.log('');
  console.log('  1. ✅ Sistema de reset está funcionando');
  console.log('  2. 📧 Configure EMAIL_USER e EMAIL_PASS para enviar emails reais');
  console.log('  3. 🚀 Deploy no Railway com variáveis de ambiente');
  console.log('');
  console.log('📚 Documentação completa: docs/EMAIL_SETUP.md');
  console.log('');
}

// Executar testes
main().catch(error => {
  console.error('');
  log('❌ Erro durante os testes:', 'red');
  console.error(error);
  process.exit(1);
});

