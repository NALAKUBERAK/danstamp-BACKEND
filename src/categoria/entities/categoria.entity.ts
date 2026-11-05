import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../producto/entities/producto.entity';

@Entity('categoria')
export class Categoria {
  @PrimaryGeneratedColumn()
  id_categoria: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'tinyint', default: 1 })
  estado: boolean;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}
