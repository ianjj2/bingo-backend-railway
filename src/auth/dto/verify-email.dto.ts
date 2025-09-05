import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificação de e-mail',
    example: 'abc123def456',
  })
  @IsString({ message: 'Token deve ser uma string' })
  token: string;
}
