import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
  @ApiProperty({
    description: 'Token de reset de senha recebido por email',
    example: 'abc123-token-uuid',
  })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @IsString({ message: 'Token deve ser uma string' })
  token: string;
}

