import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { PagoMetodo } from '../entities/pago.entity';

export class CreatePagoDto {
  @IsInt()
  id_pedido: number;

  @IsEnum(PagoMetodo)
  metodo: PagoMetodo;

  @IsNumberString()
  monto: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  comprobante_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsInt()
  id_operario_valida?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
