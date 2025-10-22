// Teste básico SMTP
const nodemailer = require('nodemailer');

console.log('📧 Testando SMTP Hostinger...\n');

const config = {
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

console.log('Configuração:');
console.log('- Host:', config.host);
console.log('- Porta:', config.port);
console.log('- Email:', config.auth.user);
console.log('- Senha:', '*'.repeat(config.auth.pass.length));
console.log('');

console.log('Criando transporter...');
const transporter = nodemailer.createTransport(config);

console.log('Verificando conexão...');
transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ ERRO na conexão SMTP:');
    console.error(error.message);
    console.error('\nDetalhes completos:');
    console.error(error);
    process.exit(1);
  } else {
    console.log('\n✅ Conexão SMTP OK!');
    console.log('Enviando email de teste...\n');
    
    transporter.sendMail({
      from: 'vip@bravovip.com.br',
      to: 'vip@bravovip.com.br',
      subject: '🧪 Teste SMTP - Bravo.Bet',
      html: '<h1>✅ Email Funcionando!</h1><p>Se você recebeu este email, o sistema está OK!</p>',
    }, (err, info) => {
      if (err) {
        console.error('❌ ERRO ao enviar email:');
        console.error(err.message);
        console.error('\nDetalhes completos:');
        console.error(err);
        process.exit(1);
      } else {
        console.log('✅ Email ENVIADO com sucesso!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('\n📬 Verifique sua caixa de entrada em:');
        console.log('   https://webmail.hostinger.com');
        console.log('   Login: vip@bravovip.com.br');
        console.log('\n✨ Procure por: "🧪 Teste SMTP - Bravo.Bet"');
      }
    });
  }
});

