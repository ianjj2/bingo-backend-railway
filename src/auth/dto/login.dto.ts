import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeCpf } from '../../utils/cpf.util';

export class LoginDto {
  @ApiProperty({
    description: 'CPF do usuário (apenas números ou formatado)',
    example: '12345678901',
  })
  @IsString({ message: 'CPF deve ser uma string' })
  @Transform(({ value }) => normalizeCpf(value))
  @Matches(/^[0-9]{11}$/, { message: 'CPF deve conter exatamente 11 dígitos' })
  cpf: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'MinhaSenh@123',
  })
  @IsString({ message: 'Senha deve ser uma string' })
  password: string;
}
