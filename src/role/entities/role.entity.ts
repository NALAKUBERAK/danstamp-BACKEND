import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RoleName } from '../role.enum';

@Entity('rol')
export class Role {
  @PrimaryGeneratedColumn()
  id_role: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: RoleName;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @OneToMany(() => User, (user) => user.role)
  usuarios: User[];
}
