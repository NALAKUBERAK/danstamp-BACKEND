import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DetallePedido } from '../../detalle-pedido/entities/detalle-pedido.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { MovimientoInventario } from '../../movimiento-inventario/entities/movimiento-inventario.entity';

@Entity('producto')
export class Producto {
  @PrimaryGeneratedColumn()
  id_producto: number;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria | null;

  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  material: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  talla: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_base: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  stock_minimo: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imagen_url: string | null;

  @Column({ type: 'tinyint', default: 1 })
  estado: boolean;

  @OneToMany(() => DetallePedido, (detalle) => detalle.producto)
  detallesPedido: DetallePedido[];

  @OneToMany(() => MovimientoInventario, (movimiento) => movimiento.producto)
  movimientosInventario: MovimientoInventario[];
}
