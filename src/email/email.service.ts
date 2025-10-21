import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Configurar transporter do Nodemailer
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPass = this.configService.get('EMAIL_PASS');
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    
    if (!emailUser || !emailPass) {
      console.warn('⚠️ Variáveis EMAIL_USER e EMAIL_PASS não configuradas. Email será desabilitado.');
      // Criar transporter fake para não quebrar a aplicação
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      return;
    }

    // Detectar se é Gmail ou SMTP customizado
    const isGmail = emailUser.includes('@gmail.com');
    
    if (isGmail) {
      // Configuração para Gmail
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log('📧 Configurando email com Gmail...');
    } else {
      // Configuração SMTP genérica (Hostinger, etc)
      this.transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.hostinger.com',
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465', // true para 465, false para outras portas
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false, // Para servidores com certificado autoassinado
        },
      });
      console.log(`📧 Configurando email com SMTP: ${smtpHost || 'smtp.hostinger.com'}:${smtpPort || '587'}`);
    }

    // Verificar conexão
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Erro na configuração do email:', error);
        console.error('   Verifique as credenciais e configurações SMTP');
      } else {
        console.log('✅ Servidor de email pronto para enviar mensagens');
        console.log(`   📨 Emails serão enviados de: ${emailUser}`);
      }
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: {
        name: 'Bravo.Bet',
        address: this.configService.get('EMAIL_USER'),
      },
      to: email,
      subject: '🎯 Verificação de E-mail - Bingo Live Bravo.Bet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificação de E-mail</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px 20px;
              border: 1px solid #e1e5e9;
              border-top: none;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border: 1px solid #e1e5e9;
              border-top: none;
              border-radius: 0 0 10px 10px;
              font-size: 14px;
              color: #6c757d;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .highlight {
              background: #fff3cd;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎯 Bingo Live</div>
            <div>Bravo.Bet</div>
          </div>
          
          <div class="content">
            <h2>Bem-vindo ao Bingo Live!</h2>
            
            <p>Obrigado por se cadastrar no <strong>Bingo Live da Bravo.Bet</strong>! Para completar seu cadastro e começar a jogar, precisamos verificar seu e-mail.</p>
            
            <div class="highlight">
              <strong>⚠️ Importante:</strong> Este link expira em 24 horas por segurança.
            </div>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">
                ✅ Verificar E-mail
              </a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
            
            <h3>🎮 O que te espera:</h3>
            <ul>
              <li><strong>Bingo ao vivo</strong> com transmissão do YouTube</li>
              <li><strong>Cartelas automáticas</strong> de 20 números</li>
              <li><strong>Categoria Ouro:</strong> 1 cartela por partida</li>
              <li><strong>Categoria Diamante:</strong> 2 cartelas + visual exclusivo</li>
              <li><strong>Marcação automática</strong> em tempo real</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Se você não se cadastrou no Bingo Live, pode ignorar este e-mail.</p>
            <p><strong>Bravo.Bet</strong> - A emoção do jogo ao vivo</p>
            <p style="font-size: 12px; margin-top: 15px;">
              Este é um e-mail automático, não responda a esta mensagem.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: {
        name: 'Bravo.Bet - Suporte',
        address: this.configService.get('EMAIL_USER'),
      },
      to: email,
      subject: '🔒 Redefinição de Senha - Bingo Live Bravo.Bet',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinição de Senha</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px 20px;
              border: 1px solid #e1e5e9;
              border-top: none;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border: 1px solid #e1e5e9;
              border-top: none;
              border-radius: 0 0 10px 10px;
              font-size: 14px;
              color: #6c757d;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .alert {
              background: #f8d7da;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #dc3545;
              margin: 20px 0;
              color: #721c24;
            }
            .security-tips {
              background: #d1ecf1;
              padding: 15px;
              border-radius: 5px;
              border-left: 4px solid #17a2b8;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🔒 Redefinição de Senha</div>
            <div>Bingo Live - Bravo.Bet</div>
          </div>
          
          <div class="content">
            <h2>Solicitação de Nova Senha</h2>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Bingo Live da Bravo.Bet</strong>.</p>
            
            <div class="alert">
              <strong>⚠️ Atenção:</strong> Este link expira em <strong>15 minutos</strong> por segurança!
            </div>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">
                🔑 Redefinir Senha
              </a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <div class="security-tips">
              <h4>💡 Dicas de Segurança:</h4>
              <ul>
                <li>Use uma senha forte com pelo menos 8 caracteres</li>
                <li>Combine letras, números e símbolos</li>
                <li>Não use a mesma senha de outros sites</li>
                <li>Evite informações pessoais óbvias</li>
              </ul>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
            
            <p><strong>Não solicitou esta redefinição?</strong></p>
            <p>Se você não solicitou a redefinição de senha, pode ignorar este e-mail. Sua conta permanece segura e nenhuma alteração será feita.</p>
          </div>
          
          <div class="footer">
            <p><strong>Bravo.Bet</strong> - Segurança em primeiro lugar</p>
            <p style="font-size: 12px; margin-top: 15px;">
              Este é um e-mail automático, não responda a esta mensagem.<br>
              Em caso de dúvidas, entre em contato com nosso suporte.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
