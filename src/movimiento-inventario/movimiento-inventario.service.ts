import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimientoInventario, TipoMovimientoInventario } from './entities/movimiento-inventario.entity';
import { CreateMovimientoInventarioDto } from './dto/create-movimiento-inventario.dto';
import { UpdateMovimientoInventarioDto } from './dto/update-movimiento-inventario.dto';
import { Producto } from '../producto/entities/producto.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MovimientoInventarioService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private readonly repository: Repository<MovimientoInventario>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    private readonly userService: UserService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(): Promise<MovimientoInventario[]> {
    return this.repository.find({
      relations: { producto: true, usuario: true, pedido: true },
      order: { fecha: 'DESC' },
    });
  }

  findLowStock(): Promise<Producto[]> {
    return this.productoRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .where('producto.estado = :active', { active: true })
      .andWhere('producto.stock_minimo > 0')
      .andWhere('producto.stock <= producto.stock_minimo')
      .orderBy('producto.stock', 'ASC')
      .getMany();
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
    const result = await this.repository.manager.transaction(async (manager) => {
      const productoRepository = manager.getRepository(Producto);
      const pedidoRepository = manager.getRepository(Pedido);
      const movimientoRepository = manager.getRepository(MovimientoInventario);

      const producto = await productoRepository.findOne({
        where: { id_producto: dto.id_producto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!producto) throw new NotFoundException(`Producto con ID ${dto.id_producto} no encontrado`);

      if (dto.cantidad <= 0) {
        throw new BadRequestException('La cantidad del movimiento debe ser mayor que cero');
      }

      let pedido: Pedido | null = null;
      if (dto.id_pedido !== undefined) {
        pedido = await pedidoRepository.findOne({ where: { id_pedido: dto.id_pedido } });
        if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);
      }

      if (dto.tipo === TipoMovimientoInventario.SALIDA && producto.stock < dto.cantidad) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${producto.stock}`);
      }

      const stockBefore = producto.stock;
      if (dto.tipo === TipoMovimientoInventario.ENTRADA) {
        producto.stock += dto.cantidad;
      }
      if (dto.tipo === TipoMovimientoInventario.SALIDA) {
        producto.stock -= dto.cantidad;
      }
      if (dto.tipo === TipoMovimientoInventario.AJUSTE) {
        producto.stock = dto.cantidad;
      }

      await productoRepository.save(producto);
      const movimiento = movimientoRepository.create({
        producto,
        usuario,
        pedido,
        tipo: dto.tipo,
        cantidad: dto.cantidad,
        observacion: dto.observacion ?? null,
      });
      return {
        movimiento: await movimientoRepository.save(movimiento),
        stockBefore,
        stockAfter: producto.stock,
        stockMinimum: producto.stock_minimo,
      };
    });
    if (
      result.stockMinimum > 0 &&
      result.stockBefore > result.stockMinimum &&
      result.stockAfter <= result.stockMinimum
    ) {
      const recipients = await this.userService.findNotificationRecipientsByRole('admin');
      await Promise.all(recipients.map((recipient) =>
        this.notificationsService.notifyUser(
          recipient,
          'Alerta de inventario bajo',
          `El producto ${result.movimiento.producto.nombre} tiene ${result.stockAfter} unidades; mínimo configurado: ${result.stockMinimum}.`,
        ),
      ));
    }
    return result.movimiento;
  }

  async update(id_movimiento: number, dto: UpdateMovimientoInventarioDto): Promise<MovimientoInventario> {
    const movimiento = await this.findOne(id_movimiento);
    if (
      movimiento.observacion === 'Salida automática por checkout' ||
      movimiento.observacion === 'Reintegro automático por cancelación'
    ) {
      throw new BadRequestException('Los movimientos asociados a pedidos confirmados son inmutables');
    }
    this.repository.merge(movimiento, dto);
    return this.repository.save(movimiento);
  }

  async remove(id_movimiento: number): Promise<void> {
    await this.findOne(id_movimiento);
    throw new BadRequestException('Los movimientos de inventario no se eliminan; registra un ajuste para corregir existencias');
  }
}
