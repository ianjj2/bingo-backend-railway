// Teste do sistema com Resend em produção
// COLE A URL DO SEU RAILWAY AQUI:
const API_URL = 'https://SUA-URL-RAILWAY.up.railway.app';

console.log('🧪 Testando sistema com Resend em produção...\n');
console.log(`API: ${API_URL}\n`);

// Teste: Forgot Password
console.log('📧 Enviando email de reset de senha...');
fetch(`${API_URL}/auth/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'iansilveira@bravo.bet.br' }),
})
  .then(res => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    console.log('\n✅ Resposta do servidor:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📬 VERIFIQUE O EMAIL DE: iansilveira@bravo.bet.br');
    console.log('   Assunto: "🔒 Redefinição de Senha - Bingo Live Bravo.Bet"');
    console.log('\n🎉 Se o email chegou, o Resend está FUNCIONANDO!');
    console.log('\n📊 Ver logs de envio: https://resend.com/emails');
  })
  .catch(err => {
    console.error('\n❌ Erro:', err.message);
    console.log('\n⚠️  Verificar:');
    console.log('   1. URL do Railway está correta?');
    console.log('   2. Deploy foi concluído?');
    console.log('   3. RESEND_API_KEY configurada?');
    console.log('   4. Ver logs do Railway');
  });

