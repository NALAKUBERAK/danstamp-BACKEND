import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RoleName } from '../role.enum';

export class CreateRoleDto {
  @IsEnum(RoleName, { message: 'nombre debe ser admin, empleado o cliente' })
  nombre: RoleName;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descripcion: string;
}
