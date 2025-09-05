import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        
        const client = createClient({
          url: redisUrl,
        });

        client.on('error', () => {
          // Silenciar erros do Redis - não é crítico
        });

        client.on('connect', () => {
          console.log('✅ Redis conectado com sucesso');
        });

        try {
          await client.connect();
          console.log('✅ Redis conectado com sucesso');
          return client;
        } catch (error) {
          // Redis opcional - continuar silenciosamente
          // Retorna um mock que não faz nada
          return {
            connect: () => Promise.resolve(),
            disconnect: () => Promise.resolve(),
            get: () => Promise.resolve(null),
            set: () => Promise.resolve('OK'),
            del: () => Promise.resolve(0),
            publish: () => Promise.resolve(0),
            subscribe: () => Promise.resolve(),
            on: () => {},
          };
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
