import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMovimientoInventarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
