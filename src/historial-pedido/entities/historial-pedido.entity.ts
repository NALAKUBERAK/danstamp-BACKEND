import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pedido } from '../../pedido/entities/pedido.entity';
import { User } from '../../user/entities/user.entity';

@Entity('historial_pedido')
export class HistorialPedido {
  @PrimaryGeneratedColumn()
  id_historial: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.historial, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @ManyToOne(() => User, (user) => user.historialPedidos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'varchar', length: 30 })
  estado_anterior: string;

  @Column({ type: 'varchar', length: 30 })
  estado_nuevo: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comentario: string | null;
}
