import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHistorialPedidoDto {
  @IsInt()
  id_pedido: number;

  @IsOptional()
  @IsInt()
  id_usuario?: number;

  @IsString()
  @MaxLength(30)
  estado_anterior: string;

  @IsString()
  @MaxLength(30)
  estado_nuevo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comentario?: string;
}
