// Teste do endpoint /auth/forgot-password
const API_URL = 'http://localhost:3001';

console.log('🔍 Testando endpoint do backend...\n');
console.log(`URL: ${API_URL}/auth/forgot-password`);
console.log('Email: vip@bravovip.com.br\n');

fetch(`${API_URL}/auth/forgot-password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'vip@bravovip.com.br',
  }),
})
  .then(response => {
    console.log(`Status: ${response.status} ${response.statusText}\n`);
    return response.json();
  })
  .then(data => {
    console.log('✅ Resposta do servidor:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📬 Verifique sua caixa de entrada em:');
    console.log('   https://webmail.hostinger.com');
    console.log('   Login: vip@bravovip.com.br');
    console.log('\n✨ Procure por: "🔒 Redefinição de Senha - Bingo Live Bravo.Bet"');
  })
  .catch(error => {
    console.error('❌ Erro ao chamar API:');
    console.error(error.message);
    console.log('\n⚠️  O servidor pode não estar rodando.');
    console.log('   Execute: npm run start:dev');
  });


