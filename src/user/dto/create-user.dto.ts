import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/, {
    message:
      'La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @Type(() => Number)
  @IsInt({ message: 'El ID del tipo de documento debe ser un número entero' })
  @Min(1)
  id_tipo_documento: number;

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
