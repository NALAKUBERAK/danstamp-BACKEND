import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DisenoEstado } from '../entities/diseno.entity';

export class CreateDisenoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  formato?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;

  @IsOptional()
  @IsEnum(DisenoEstado)
  estado?: DisenoEstado;
}
