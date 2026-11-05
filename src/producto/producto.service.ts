import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Categoria } from '../categoria/entities/categoria.entity';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  findAll(): Promise<Producto[]> {
    return this.repository.find({ relations: { categoria: true }, order: { nombre: 'ASC' } });
  }

  async findOne(id_producto: number): Promise<Producto> {
    const producto = await this.repository.findOne({ where: { id_producto }, relations: { categoria: true } });
    if (!producto) throw new NotFoundException(`Producto con ID ${id_producto} no encontrado`);
    return producto;
  }

  async create(dto: CreateProductoDto): Promise<Producto> {
    const exists = await this.repository.existsBy({ codigo: dto.codigo });
    if (exists) throw new ConflictException('Ya existe un producto con ese código');

    let categoria: Categoria | null = null;
    if (dto.id_categoria !== undefined) {
      categoria = await this.categoriaRepository.findOne({ where: { id_categoria: dto.id_categoria } });
      if (!categoria) throw new NotFoundException(`Categoría con ID ${dto.id_categoria} no encontrada`);
      if (!categoria.estado) throw new ConflictException('No puedes usar una categoría inactiva');
    }

    const producto = this.repository.create({
      categoria,
      codigo: dto.codigo,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      material: dto.material ?? null,
      color: dto.color ?? null,
      talla: dto.talla ?? null,
      precio_base: dto.precio_base ?? '0.00',
      stock: dto.stock ?? 0,
      stock_minimo: dto.stock_minimo ?? 0,
      imagen_url: dto.imagen_url ?? null,
      estado: dto.estado ?? true,
    });
    return this.repository.save(producto);
  }

  async update(id_producto: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id_producto);

    if (dto.codigo !== undefined && dto.codigo !== producto.codigo) {
      const exists = await this.repository.existsBy({ codigo: dto.codigo });
      if (exists) throw new ConflictException('Ya existe un producto con ese código');
    }

    const changes = { ...dto };
    if (changes.id_categoria !== undefined) {
      const categoria = await this.categoriaRepository.findOne({ where: { id_categoria: changes.id_categoria } });
      if (!categoria) throw new NotFoundException(`Categoría con ID ${changes.id_categoria} no encontrada`);
      if (!categoria.estado) throw new ConflictException('No puedes usar una categoría inactiva');
      producto.categoria = categoria;
      delete changes.id_categoria;
    }

    this.repository.merge(producto, changes);
    return this.repository.save(producto);
  }

  async remove(id_producto: number): Promise<void> {
    const producto = await this.findOne(id_producto);
    await this.repository.remove(producto);
  }
}
