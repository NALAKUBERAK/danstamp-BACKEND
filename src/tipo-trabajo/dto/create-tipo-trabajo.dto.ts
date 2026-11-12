import { IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export enum TipoTrabajoEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

export class CreateTipoTrabajoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  costo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tiempo_estimado_dias?: number;

  @IsOptional()
  @IsEnum(TipoTrabajoEstado)
  estado?: TipoTrabajoEstado;
}
