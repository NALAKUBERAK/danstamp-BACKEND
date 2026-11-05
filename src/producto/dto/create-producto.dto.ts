import { IsBoolean, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateProductoDto {
  @IsOptional()
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
  precio_base?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  imagen_url?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
