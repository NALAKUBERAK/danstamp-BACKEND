import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

// PartialType hace que todas las propiedades de CreateUserDto sean opcionales
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  @IsOptional()
  isActive?: boolean;

  @Type(() => Number)
  @IsInt({ message: 'El ID del rol debe ser un número entero' })
  @Min(1)
  @IsOptional()
  id_role?: number;

  @Type(() => Number)
  @IsInt({ message: 'El ID del tipo de documento debe ser un número entero' })
  @Min(1)
  @IsOptional()
  id_tipo_documento?: number;
}