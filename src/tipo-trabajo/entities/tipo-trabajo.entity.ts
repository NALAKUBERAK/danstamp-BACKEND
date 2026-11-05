import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DetallePedido } from '../../detalle-pedido/entities/detalle-pedido.entity';

@Entity('tipo_trabajo')
export class TipoTrabajo {
  @PrimaryGeneratedColumn()
  id_tipo_trabajo: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  costo: string;

  @Column({ type: 'int', nullable: true })
  tiempo_estimado_dias: number | null;

  @Column({ type: 'enum', enum: ['activo', 'inactivo'], default: 'activo' })
  estado: 'activo' | 'inactivo';

  @OneToMany(() => DetallePedido, (detalle) => detalle.tipoTrabajo)
  detallesPedido: DetallePedido[];
}
