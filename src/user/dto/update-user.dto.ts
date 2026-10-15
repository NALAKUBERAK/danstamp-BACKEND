import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

// PartialType hace que todas las propiedades de CreateUserDto sean opcionales
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  @IsOptional()
  isActive?: boolean;

  @IsIn(['user', 'admin'], { message: 'El rol debe ser "user" o "admin"' })
  @IsOptional()
  role?: string;
}