import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PedidoLineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_producto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_tipo_trabajo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_diseno?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  ubicacion_estampado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  especificaciones?: string;
}
