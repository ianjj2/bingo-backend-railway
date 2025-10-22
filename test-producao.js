// Teste do sistema em produção
// COLE SUA URL DO RAILWAY AQUI:
const API_URL = 'https://SUA-URL-RAILWAY.up.railway.app';

console.log('🧪 Testando sistema em PRODUÇÃO...\n');
console.log(`API: ${API_URL}\n`);

// Teste 1: Health Check
console.log('1️⃣ Testando health check...');
fetch(`${API_URL}/health`)
  .then(res => res.json())
  .then(data => {
    console.log('✅ Backend está online:', data);
    console.log('');
    
    // Teste 2: Forgot Password
    console.log('2️⃣ Testando forgot-password...');
    return fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'iansilveira@bravo.bet.br' }),
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Resposta:', data);
    console.log('');
    console.log('📬 VERIFIQUE O EMAIL DE: iansilveira@bravo.bet.br');
    console.log('   Assunto: "🔒 Redefinição de Senha"');
    console.log('');
    console.log('✨ Se o email chegou, está TUDO FUNCIONANDO! 🎉');
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    console.log('');
    console.log('⚠️  Verificar:');
    console.log('   1. URL do Railway está correta?');
    console.log('   2. Deploy foi concluído?');
    console.log('   3. Variáveis de ambiente configuradas?');
  });


