import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUrl, Matches, MaxLength, Min } from 'class-validator';

export class CreateProductoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_categoria?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  material?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  talla?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  precio_base?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  imagen_url?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  estado?: boolean;
}
