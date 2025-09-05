import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de refresh para renovação do access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token deve ser uma string' })
  refreshToken: string;
}
