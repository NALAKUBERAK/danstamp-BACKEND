import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('tipo_documento')
export class TipoDocumento {
  @PrimaryGeneratedColumn()
  id_tipo_documento: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ type: 'enum', enum: ['activo', 'inactivo'], default: 'activo' })
  estado: 'activo' | 'inactivo';

  @OneToMany(() => User, (user) => user.tipoDocumento)
  usuarios: User[];
}
