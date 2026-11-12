import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';
import { PedidoEstado } from '../entities/pedido.entity';

export class CreatePedidoDto {
  @IsOptional()
  @Min(1)
  @IsInt()
  id_cliente?: number;

  @IsOptional()
  @Min(1)
  @IsInt()
  id_operario?: number;

  @IsOptional()
  @IsDateString()
  fecha_entrega_estimada?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  direccion_entrega: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  subtotal_productos?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  total_trabajos?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  total?: string;

  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
