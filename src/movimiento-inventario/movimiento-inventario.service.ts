import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoInventario, TipoMovimientoInventario } from './entities/movimiento-inventario.entity';
import { CreateMovimientoInventarioDto } from './dto/create-movimiento-inventario.dto';
import { UpdateMovimientoInventarioDto } from './dto/update-movimiento-inventario.dto';
import { Producto } from '../producto/entities/producto.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class MovimientoInventarioService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private readonly repository: Repository<MovimientoInventario>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
  ) {}

  findAll(): Promise<MovimientoInventario[]> {
    return this.repository.find({
      relations: { producto: true, usuario: true, pedido: true },
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id_movimiento: number): Promise<MovimientoInventario> {
    const movimiento = await this.repository.findOne({
      where: { id_movimiento },
      relations: { producto: true, usuario: true, pedido: true },
    });
    if (!movimiento) throw new NotFoundException(`Movimiento con ID ${id_movimiento} no encontrado`);
    return movimiento;
  }

  async create(dto: CreateMovimientoInventarioDto, usuario: User): Promise<MovimientoInventario> {
    const producto = await this.productoRepository.findOne({ where: { id_producto: dto.id_producto } });
    if (!producto) throw new NotFoundException(`Producto con ID ${dto.id_producto} no encontrado`);

    let pedido: Pedido | null = null;
    if (dto.id_pedido !== undefined) {
      pedido = await this.pedidoRepository.findOne({ where: { id_pedido: dto.id_pedido } });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);
    }

    if (dto.tipo === TipoMovimientoInventario.SALIDA && producto.stock < dto.cantidad) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${producto.stock}`);
    }

    if (dto.tipo === TipoMovimientoInventario.ENTRADA) producto.stock += dto.cantidad;
    if (dto.tipo === TipoMovimientoInventario.SALIDA) producto.stock -= dto.cantidad;
    if (dto.tipo === TipoMovimientoInventario.AJUSTE) producto.stock = dto.cantidad;

    await this.productoRepository.save(producto);
    const movimiento = this.repository.create({ producto, usuario, pedido, tipo: dto.tipo, cantidad: dto.cantidad, observacion: dto.observacion ?? null });
    return this.repository.save(movimiento);
  }

  async update(id_movimiento: number, dto: UpdateMovimientoInventarioDto): Promise<MovimientoInventario> {
    const movimiento = await this.findOne(id_movimiento);
    const changes = { ...dto };

    if (changes.id_pedido !== undefined) {
      const pedido = await this.pedidoRepository.findOne({ where: { id_pedido: changes.id_pedido } });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${changes.id_pedido} no encontrado`);
      movimiento.pedido = pedido;
      delete changes.id_pedido;
    }

    if (changes.id_producto !== undefined) {
      const producto = await this.productoRepository.findOne({ where: { id_producto: changes.id_producto } });
      if (!producto) throw new NotFoundException(`Producto con ID ${changes.id_producto} no encontrado`);
      movimiento.producto = producto;
      delete changes.id_producto;
    }

    delete changes.tipo;
    delete changes.cantidad;
    this.repository.merge(movimiento, changes);
    return this.repository.save(movimiento);
  }

  async remove(id_movimiento: number): Promise<void> {
    const movimiento = await this.findOne(id_movimiento);
    await this.repository.remove(movimiento);
  }
}
