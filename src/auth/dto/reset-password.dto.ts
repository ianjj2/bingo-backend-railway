import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperação de senha',
    example: 'abc123def456',
  })
  @IsString({ message: 'Token deve ser uma string' })
  token: string;

  @ApiProperty({
    description: 'Nova senha (mínimo 8 caracteres, deve conter letras e números)',
    example: 'NovaSenha123',
    minLength: 8,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter ao menos 8 caracteres' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'Senha deve conter ao menos uma letra e um número',
  })
  newPassword: string;
}
