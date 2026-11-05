import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { HistorialPedido } from '../../historial-pedido/entities/historial-pedido.entity';
import { Pago } from '../../pago/entities/pago.entity';
import { DetallePedido } from '../../detalle-pedido/entities/detalle-pedido.entity';
import { MovimientoInventario } from '../../movimiento-inventario/entities/movimiento-inventario.entity';

export enum PedidoEstado {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  TERMINADO = 'terminado',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

@Entity('pedido')
export class Pedido {
  @PrimaryGeneratedColumn()
  id_pedido: number;

  @ManyToOne(() => User, (user) => user.pedidosCliente, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cliente' })
  cliente: User;

  @ManyToOne(() => User, (user) => user.pedidosOperario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_operario' })
  operario: User | null;

  @CreateDateColumn({ type: 'datetime' })
  fecha_pedido: Date;

  @Column({ type: 'date', nullable: true })
  fecha_entrega_estimada: string | null;

  @Column({ type: 'varchar', length: 200 })
  direccion_entrega: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal_productos: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_trabajos: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'enum', enum: PedidoEstado, default: PedidoEstado.PENDIENTE })
  estado: PedidoEstado;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @OneToMany(() => HistorialPedido, (historial) => historial.pedido)
  historial: HistorialPedido[];

  @OneToMany(() => Pago, (pago) => pago.pedido)
  pagos: Pago[];

  @OneToMany(() => DetallePedido, (detalle) => detalle.pedido)
  detalles: DetallePedido[];

  @OneToMany(() => MovimientoInventario, (movimiento) => movimiento.pedido)
  movimientosInventario: MovimientoInventario[];
}
