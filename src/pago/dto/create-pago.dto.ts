import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PagoMetodo } from '../entities/pago.entity';
import { Type } from 'class-transformer';

export class CreatePagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_pedido: number;

  @IsEnum(PagoMetodo)
  metodo: PagoMetodo;

  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, {
    message: 'El monto debe ser positivo y tener como máximo dos decimales',
  })
  monto: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
