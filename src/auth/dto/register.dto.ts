import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeCpf } from '../../utils/cpf.util';

export class RegisterDto {
  @ApiProperty({
    description: 'CPF do usuário (apenas números ou formatado)',
    example: '12345678901',
    pattern: '^[0-9]{11}$',
  })
  @IsString({ message: 'CPF deve ser uma string' })
  @Transform(({ value }) => normalizeCpf(value))
  @Matches(/^[0-9]{11}$/, { message: 'CPF deve conter exatamente 11 dígitos' })
  cpf: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'usuario@email.com',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  email: string;

  @ApiProperty({
    description: 'Senha (mínimo 8 caracteres, deve conter letras e números)',
    example: 'MinhaSenh@123',
    minLength: 8,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter ao menos 8 caracteres' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Senha deve conter ao menos uma letra e um número',
  })
  password: string;
}
