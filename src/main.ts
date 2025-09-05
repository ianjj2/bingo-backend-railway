import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  console.log('🚀 Iniciando bootstrap...');
  
  try {
    console.log('📝 Configurando logger...');
    // Configurar Winston Logger
    const logger = WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });

    console.log('🏗️ Criando aplicação NestJS...');
    const app = await NestFactory.create(AppModule, {
      logger,
    });
    console.log('✅ Aplicação NestJS criada com sucesso!');
    console.log('📦 Todos os módulos foram inicializados!');

    console.log('🔒 Configurando segurança...');
    // Configurações de segurança
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    console.log('🌐 Configurando CORS...');
    // CORS - Configuração específica para Netlify
    const allowedOrigins = [
      'http://localhost:3000',
      'http://192.168.3.114:3000',
      'http://192.168.15.50:3000',
      'https://bravo.bet',
      'https://bravovip.com.br',
      'https://www.bravovip.com.br',
      'https://cheerful-empanada-098370.netlify.app',
      'https://*.netlify.app',
    ];
    
    console.log('🌐 Configurando CORS com origens permitidas:', allowedOrigins);
    
    app.enableCors({
      origin: (origin, callback) => {
        // Permitir requisições sem origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Verificar se a origin está na lista permitida
        const isAllowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin.replace('*', '.*');
            return new RegExp(pattern).test(origin);
          }
          return allowedOrigin === origin;
        });
        
        if (isAllowed) {
          console.log(`✅ Origin permitida: ${origin}`);
          callback(null, true);
        } else {
          console.log(`❌ Origin bloqueada: ${origin}`);
          callback(new Error('Não permitido pelo CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    console.log('🔧 Configurando pipes...');
    // Pipes globais
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    console.log('📚 Configurando Swagger...');
    // Configurar Swagger
    const config = new DocumentBuilder()
      .setTitle('Bingo Live API')
      .setDescription('API do sistema de Bingo ao vivo da Bravo.Bet')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticação e cadastro')
      .addTag('users', 'Gerenciamento de usuários')
      .addTag('matches', 'Gerenciamento de partidas')
      .addTag('cards', 'Cartelas de bingo')
      .addTag('admin', 'Painel administrativo')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0'; // Escutar em todas as interfaces
    
    console.log(`🚀 Iniciando servidor em ${host}:${port}...`);
    await app.listen(port, host);
    console.log(`✅ Servidor rodando em ${host}:${port}`);
    console.log(`📚 Documentação disponível em http://localhost:${port}/api/docs`);
    console.log(`🌐 Acesso local disponível em http://192.168.3.114:${port}/api/docs`);
    console.log(`🎮 Sistema Bingo Live iniciado com sucesso!`);
    
  } catch (error) {
    console.error('❌ Erro durante bootstrap:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

bootstrap();
