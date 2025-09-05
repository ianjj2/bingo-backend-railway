import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMatchDto {
  @ApiProperty({
    description: 'Nome da partida',
    example: 'Bingo Live - Sexta Especial (Atualizado)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
  @MaxLength(120, { message: 'Nome não pode ter mais de 120 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'Sorteio automático ativo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sorteio automático deve ser true ou false' })
  autoDraw?: boolean;

  @ApiProperty({
    description: 'Intervalo entre sorteios automáticos (em ms)',
    example: 15000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Intervalo deve ser um número' })
  @Min(5000, { message: 'Intervalo mínimo é 5 segundos' })
  @Max(60000, { message: 'Intervalo máximo é 60 segundos' })
  autoDrawInterval?: number;

  @ApiProperty({
    description: 'Número máximo de vencedores',
    example: 3,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Máximo de vencedores deve ser um número' })
  @Min(1, { message: 'Deve haver pelo menos 1 vencedor possível' })
  maxWinners?: number;
}
