import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

// Decorador @Entity define que esta clase es una entidad de base de datos
@Entity('users')
export class User {
  // Clave primaria auto-incremental
  @PrimaryGeneratedColumn()
  id_usuario: number;

  // Columna de email única y no nula
  @Column({ unique: true, nullable: false })
  email: string;

  // El tipo de documento puede repetirse; el número identifica al usuario
  @Column({ nullable: false })
  tipo_documento: string;

  @Exclude()
  @Column({ nullable: false, select: false })
  password: string;

  @Exclude()
  @Column({ unique: true, nullable: false, select: false })
  telefono: number;

  @Exclude()
  @Column({ nullable: false, select: false })
  direccion: string;

  @Exclude()
  @Column({ unique: true, nullable: false, select: false })
  numero_documento: number;

  // Nombres completos del usuario
  @Column({ nullable: false })
  nombres: string;

  // Apellidos completos del usuario
  @Column({ nullable: false })
  apellidos: string;

  // Estado activo del usuario
  @Column({ default: true })
  isActive: boolean;

  // Rol del usuario (por defecto 'user')
  @Column({ default: 'user' })
  role: string;

  // Fecha de creación automática
  @CreateDateColumn()
  createdAt: Date;

  // Fecha de actualización automática
  @UpdateDateColumn()
  updatedAt: Date;
}