import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (configService: ConfigService): SupabaseClient => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseKey = configService.get<string>('SUPABASE_SERVICE_KEY');
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase URL e SERVICE KEY são obrigatórios');
        }

        return createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'SUPABASE_CLIENT_ANON',
      useFactory: (configService: ConfigService): SupabaseClient => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = configService.get<string>('SUPABASE_ANON_KEY');
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase URL e ANON KEY são obrigatórios');
        }

        return createClient(supabaseUrl, supabaseAnonKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SUPABASE_CLIENT', 'SUPABASE_CLIENT_ANON'],
})
export class DatabaseModule {}
