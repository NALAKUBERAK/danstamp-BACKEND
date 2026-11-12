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

export enum PagoMetodo {
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
  TARJETA = 'tarjeta',
  NEQUI = 'nequi',
  DAVIPLATA = 'daviplata',
  BRE_B = 'bre-b',
  BANCOLOMBIA = 'bancolombia',
}

export enum PagoEstado {
  PENDIENTE = 'pendiente',
  VALIDADO = 'validado',
  RECHAZADO = 'rechazado',
}

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn()
  id_pago: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.pagos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @Column({ type: 'enum', enum: PagoMetodo })
  metodo: PagoMetodo;

  @Column({ type: 'enum', enum: PagoEstado, default: PagoEstado.PENDIENTE })
  estado: PagoEstado;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: string;

  @CreateDateColumn({ type: 'datetime' })
  fecha_pago: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comprobante_url: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia: string | null;

  @ManyToOne(() => User, (user) => user.pagosValidados, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_operario_valida' })
  operarioValida: User | null;

  @Column({ type: 'datetime', nullable: true })
  fecha_validacion: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;
}
