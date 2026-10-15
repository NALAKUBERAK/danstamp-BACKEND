import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  tipo_documento: string;

  @Type(() => Number)
  @IsInt({ message: 'El número de documento debe ser un número entero' })
  @Min(1, { message: 'El número de documento debe ser mayor que cero' })
  numero_documento: number;

  @Type(() => Number)
  @IsInt({ message: 'El teléfono debe ser un número entero' })
  @Min(1, { message: 'El teléfono debe ser mayor que cero' })
  telefono: number;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  direccion: string;

  @IsString({ message: 'Los nombres deben ser una cadena de texto' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres: string;

  @IsString({ message: 'Los apellidos deben ser una cadena de texto' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;
}
