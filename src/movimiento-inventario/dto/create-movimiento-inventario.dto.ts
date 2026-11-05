import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoMovimientoInventario } from '../entities/movimiento-inventario.entity';

export class CreateMovimientoInventarioDto {
  @IsInt()
  id_producto: number;

  @IsOptional()
  @IsInt()
  id_pedido?: number;

  @IsEnum(TipoMovimientoInventario)
  tipo: TipoMovimientoInventario;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
