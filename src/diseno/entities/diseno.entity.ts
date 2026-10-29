import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('diseno')
export class Diseno {
  @PrimaryGeneratedColumn()
  id_diseno: number;

  @ManyToOne(() => User, (user) => user.disenos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: User;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  archivo_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  archivo_public_id: string | null;

  @Column({ type: 'varchar', length: 10 })
  formato: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @CreateDateColumn({ type: 'datetime' })
  fecha_carga: Date;
}
