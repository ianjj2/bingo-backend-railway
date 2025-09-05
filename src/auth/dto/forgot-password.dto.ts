import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'E-mail do usuário para recuperação de senha',
    example: 'usuario@email.com',
  })
  @IsEmail({}, { message: 'E-mail deve ter um formato válido' })
  email: string;
}
