import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PedidoEstado } from '../entities/pedido.entity';

export class CreatePedidoDto {
  @IsOptional()
  @IsInt()
  id_cliente?: number;

  @IsOptional()
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
  subtotal_productos?: string;

  @IsOptional()
  @IsNumberString()
  total_trabajos?: string;

  @IsOptional()
  @IsNumberString()
  total?: string;

  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
