import { NestFactory } from '@nestjs/core';
import { AppSimpleModule } from './app-simple.module';

async function bootstrap() {
  console.log('🚀 Iniciando versão simples...');
  
  try {
    console.log('🏗️ Criando aplicação...');
    const app = await NestFactory.create(AppSimpleModule);
    console.log('✅ Aplicação criada!');

    console.log('🌐 Configurando CORS...');
    app.enableCors({
      origin: ['http://localhost:3000'],
      credentials: true,
    });

    const port = 3001;
    console.log(`🚀 Iniciando servidor na porta ${port}...`);
    
    await app.listen(port);
    console.log(`✅ SERVIDOR FUNCIONANDO NA PORTA ${port}!`);
    console.log(`📡 Teste: http://localhost:${port}`);
    
  } catch (error) {
    console.error('❌ ERRO:', error);
    process.exit(1);
  }
}

bootstrap();

