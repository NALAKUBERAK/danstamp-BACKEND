import { IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDetallePedidoDto {
  @IsInt()
  id_pedido: number;

  @IsOptional()
  @IsInt()
  id_producto?: number;

  @IsOptional()
  @IsInt()
  id_tipo_trabajo?: number;

  @IsOptional()
  @IsInt()
  id_diseno?: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumberString()
  precio_unitario: string;

  @IsOptional()
  @IsNumberString()
  costo_trabajo_unitario?: string;

  @IsNumberString()
  subtotal: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  ubicacion_estampado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  especificaciones?: string;
}
