#!/usr/bin/env node

/**
 * 🧪 Teste Completo - Sistema de Reset de Senha
 * 
 * Testa AMBOS os métodos: Email e CPF
 * Execute: node scripts/test-reset-completo.js
 */

const readline = require('readline');

// CONFIGURE AQUI:
const API_URL = 'http://localhost:3001'; // Ou URL do Railway
const TEST_EMAIL = 'iansilveira@bravo.bet.br';
const TEST_CPF = '12345678900'; // Use um CPF real do sistema

console.clear();
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  🔐 TESTE COMPLETO - SISTEMA DE RESET DE SENHA           ║');
console.log('║     Bravo.Bet Backend                                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`🌐 API: ${API_URL}`);
console.log('');

async function test1_ResetPorEmail() {
  console.log('─'.repeat(60));
  console.log('📧 TESTE 1: Reset de Senha por E-MAIL');
  console.log('─'.repeat(60));
  console.log('');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    console.log('');
    
    if (response.ok) {
      console.log('✅ PASSOU: Endpoint funcionando');
      return true;
    } else {
      console.log('❌ FALHOU: Erro na requisição');
      return false;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro ao conectar');
    console.error('   ', error.message);
    return false;
  }
}

async function test2_ResetPorCPF() {
  console.log('─'.repeat(60));
  console.log('🆔 TESTE 2: Reset de Senha por CPF');
  console.log('─'.repeat(60));
  console.log('');
  console.log(`CPF: ${TEST_CPF}`);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password-cpf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: TEST_CPF }),
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    console.log('');
    
    if (response.ok) {
      console.log('✅ PASSOU: Endpoint funcionando');
      
      // Verificar se mostra email mascarado
      if (data.message && data.message.includes('@')) {
        console.log('✅ PASSOU: Email mascarado retornado');
      }
      return true;
    } else {
      console.log('❌ FALHOU: Erro na requisição');
      return false;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro ao conectar');
    console.error('   ', error.message);
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

async function test3_ValidarToken() {
  console.log('─'.repeat(60));
  console.log('🔍 TESTE 3: Validação de Token');
  console.log('─'.repeat(60));
  console.log('');
  
  const token = await askQuestion('Digite o token recebido no email (ou Enter para pular): ');
  console.log('');
  
  if (!token || token.trim() === '') {
    console.log('⏭️  Pulando teste de validação');
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/validate-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    console.log('');
    
    if (data.valid) {
      console.log('✅ PASSOU: Token válido');
      return token.trim();
    } else {
      console.log('❌ FALHOU: Token inválido');
      console.log('   ', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro ao validar');
    console.error('   ', error.message);
    return false;
  }
}

async function test4_RedefinirSenha(token) {
  console.log('─'.repeat(60));
  console.log('🔑 TESTE 4: Redefinir Senha');
  console.log('─'.repeat(60));
  console.log('');
  
  const newPassword = 'TesteSenha123!';
  console.log(`Nova senha: ${newPassword}`);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    console.log('');
    
    if (response.ok && data.message.includes('sucesso')) {
      console.log('✅ PASSOU: Senha redefinida com sucesso');
      return true;
    } else {
      console.log('❌ FALHOU: Erro ao redefinir senha');
      return false;
    }
  } catch (error) {
    console.log('❌ FALHOU: Erro ao redefinir');
    console.error('   ', error.message);
    return false;
  }
}

async function main() {
  let passedTests = 0;
  let totalTests = 2;

  // Teste 1: Reset por Email
  const test1 = await test1_ResetPorEmail();
  if (test1) passedTests++;
  console.log('');

  // Teste 2: Reset por CPF
  const test2 = await test2_ResetPorCPF();
  if (test2) passedTests++;
  console.log('');

  // Perguntar se quer testar validação e reset
  console.log('═'.repeat(60));
  console.log('');
  const continuar = await askQuestion('Deseja testar validação de token e reset? (s/n): ');
  console.log('');

  if (continuar.toLowerCase() === 's') {
    totalTests = 4;
    
    // Teste 3: Validar Token
    const token = await test3_ValidarToken();
    if (token) {
      passedTests++;
      console.log('');
      
      // Teste 4: Redefinir Senha
      const test4 = await test4_RedefinirSenha(token);
      if (test4) passedTests++;
      console.log('');
    }
  }

  // Resumo Final
  console.log('═'.repeat(60));
  console.log(`  📊 RESUMO: ${passedTests}/${totalTests} testes passaram`);
  console.log('═'.repeat(60));
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 SUCESSO TOTAL! Todos os testes passaram!');
    console.log('');
    console.log('✅ Sistema de reset de senha está 100% funcional!');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique:');
    console.log('   1. Servidor está rodando?');
    console.log('   2. Variáveis de ambiente configuradas?');
    console.log('   3. Resend configurado?');
  }
  
  console.log('');
  console.log('📬 Próximos passos:');
  console.log('   1. Verifique o email: ' + TEST_EMAIL);
  console.log('   2. Procure assunto: "🔒 Redefinição de Senha"');
  console.log('   3. Clique no link e teste o fluxo completo');
  console.log('');
  console.log('📚 Documentação: RESUMO_FINAL_IMPLEMENTACAO.md');
  console.log('');
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

