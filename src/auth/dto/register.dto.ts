import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeCpf } from '../../utils/cpf.util';

export class RegisterDto {
  @ApiProperty({
    description: 'CPF do usuário (aceita formatado ou apenas números)',
    example: '123.456.789-01 ou 12345678901',
  })
  @IsString({ message: 'CPF deve ser uma string' })
  @Transform(({ value }) => normalizeCpf(value))
  cpf: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'usuario@email.com',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  email: string;

  @ApiProperty({
    description: 'Senha (mínimo 6 caracteres)',
    example: 'MinhaSenh@123',
    minLength: 6,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  password: string;
}
