import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_tipo_documento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero_documento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  telefono?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  apellidos?: string;
}
