import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMatchDto {
  @ApiProperty({
    description: 'Nome da partida',
    example: 'Bingo Live - Sexta Especial',
    minLength: 3,
    maxLength: 120,
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
  @MaxLength(120, { message: 'Nome não pode ter mais de 120 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Número mínimo do range de sorteio',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Número mínimo deve ser um número' })
  @Min(1, { message: 'Número mínimo deve ser pelo menos 1' })
  numMin: number;

  @ApiProperty({
    description: 'Número máximo do range de sorteio',
    example: 75,
    minimum: 2,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Número máximo deve ser um número' })
  @Min(2, { message: 'Número máximo deve ser pelo menos 2' })
  numMax: number;

  @ApiProperty({
    description: 'Quantidade de números por cartela',
    example: 20,
    minimum: 5,
    maximum: 50,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Números por cartela deve ser um número' })
  @Min(5, { message: 'Deve haver pelo menos 5 números por cartela' })
  @Max(50, { message: 'Não pode haver mais de 50 números por cartela' })
  numbersPerCard: number;

  @ApiProperty({
    description: 'Sorteio automático ativo',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sorteio automático deve ser true ou false' })
  autoDraw?: boolean;

  @ApiProperty({
    description: 'Intervalo entre sorteios automáticos (em ms)',
    example: 10000,
    minimum: 5000,
    maximum: 60000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Intervalo deve ser um número' })
  @Min(5000, { message: 'Intervalo mínimo é 5 segundos' })
  @Max(60000, { message: 'Intervalo máximo é 60 segundos' })
  autoDrawInterval?: number;

  @ApiProperty({
    description: 'Número máximo de vencedores (null = ilimitado)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Máximo de vencedores deve ser um número' })
  @Min(1, { message: 'Deve haver pelo menos 1 vencedor possível' })
  maxWinners?: number;

  @ApiProperty({
    description: 'URL da live do YouTube para exibir durante o jogo',
    example: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'URL do YouTube deve ser uma string' })
  youtubeUrl?: string;
}
