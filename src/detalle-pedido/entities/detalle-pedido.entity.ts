import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pedido } from '../../pedido/entities/pedido.entity';
import { Diseno } from '../../diseno/entities/diseno.entity';
import { TipoTrabajo } from '../../tipo-trabajo/entities/tipo-trabajo.entity';
import { Producto } from '../../producto/entities/producto.entity';

@Entity('detalle_pedido')
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id_detalle: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.detalles, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido;

  @ManyToOne(() => Producto, (producto) => producto.detallesPedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto | null;

  @ManyToOne(() => TipoTrabajo, (tipoTrabajo) => tipoTrabajo.detallesPedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_tipo_trabajo' })
  tipoTrabajo: TipoTrabajo | null;

  @ManyToOne(() => Diseno, (diseno) => diseno.detallesPedido, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_diseno' })
  diseno: Diseno | null;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio_unitario: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  costo_trabajo_unitario: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  ubicacion_estampado: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  especificaciones: string | null;
}
