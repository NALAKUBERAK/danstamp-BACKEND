import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../producto/entities/producto.entity';
import { User } from '../../user/entities/user.entity';
import { Pedido } from '../../pedido/entities/pedido.entity';

export enum TipoMovimientoInventario {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE = 'ajuste',
}

@Entity('movimiento_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id_movimiento: number;

  @ManyToOne(() => Producto, (producto) => producto.movimientosInventario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @ManyToOne(() => User, (user) => user.movimientosInventario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @ManyToOne(() => Pedido, (pedido) => pedido.movimientosInventario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_pedido' })
  pedido: Pedido | null;

  @Column({ type: 'enum', enum: TipoMovimientoInventario })
  tipo: TipoMovimientoInventario;

  @Column({ type: 'int' })
  cantidad: number;

  @CreateDateColumn({ type: 'datetime' })
  fecha: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;
}
