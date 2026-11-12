import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PagoEstado } from '../entities/pago.entity';

export class UpdatePagoDto {
  @IsEnum(PagoEstado)
  estado: PagoEstado;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
