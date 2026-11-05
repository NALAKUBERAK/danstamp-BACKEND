import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../role/entities/role.entity';
import { TipoDocumento } from '../../tipo-documento/entities/tipo-documento.entity';
import { Diseno } from '../../diseno/entities/diseno.entity';
import { Pedido } from '../../pedido/entities/pedido.entity';
import { HistorialPedido } from '../../historial-pedido/entities/historial-pedido.entity';
import { Pago } from '../../pago/entities/pago.entity';
import { MovimientoInventario } from '../../movimiento-inventario/entities/movimiento-inventario.entity';

// Decorador @Entity define que esta clase es una entidad de base de datos
@Entity('users')
export class User {
  // Clave primaria auto-incremental
  @PrimaryGeneratedColumn()
  id_usuario: number;

  // Columna de email única y no nula
  @Column({ unique: true, nullable: false })
  email: string;

  // El tipo de documento puede repetirse; el número identifica al usuario
  @ManyToOne(() => TipoDocumento, (tipoDocumento) => tipoDocumento.usuarios, { nullable: false })
  @JoinColumn({ name: 'id_tipo_documento' })
  tipoDocumento: TipoDocumento;

  @Exclude()
  @Column({ nullable: false, select: false })
  password: string;

  @Exclude()
  @Column({ unique: true, nullable: false, select: false })
  telefono: number;

  @Exclude()
  @Column({ nullable: false, select: false })
  direccion: string;

  @Exclude()
  @Column({ unique: true, nullable: false, select: false })
  numero_documento: number;

  // Nombres completos del usuario
  @Column({ nullable: false })
  nombres: string;

  // Apellidos completos del usuario
  @Column({ nullable: false })
  apellidos: string;

  // Estado activo del usuario
  @Column({ default: true })
  isActive: boolean;

  // Rol del usuario, relacionado con la tabla rol
  @ManyToOne(() => Role, (role) => role.usuarios, { nullable: false })
  @JoinColumn({ name: 'id_role' })
  role: Role;

  // Fecha de creación automática
  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Diseno, (diseno) => diseno.cliente)
  disenos: Diseno[];

  @OneToMany(() => Pedido, (pedido) => pedido.cliente)
  pedidosCliente: Pedido[];

  @OneToMany(() => Pedido, (pedido) => pedido.operario)
  pedidosOperario: Pedido[];

  @OneToMany(() => HistorialPedido, (historial) => historial.usuario)
  historialPedidos: HistorialPedido[];

  @OneToMany(() => Pago, (pago) => pago.operarioValida)
  pagosValidados: Pago[];

  @OneToMany(() => MovimientoInventario, (movimiento) => movimiento.usuario)
  movimientosInventario: MovimientoInventario[];

  // Fecha de actualización automática
  @UpdateDateColumn()
  updatedAt: Date;
}