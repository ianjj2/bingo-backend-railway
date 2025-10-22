import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordCpfDto {
  @ApiProperty({
    description: 'CPF do usuário (com ou sem formatação)',
    example: '123.456.789-00',
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, {
    message: 'CPF deve estar no formato válido',
  })
  cpf: string;
}

