import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { CreateDetallePedidoDto } from './dto/create-detalle-pedido.dto';
import { UpdateDetallePedidoDto } from './dto/update-detalle-pedido.dto';
import { Pedido } from '../pedido/entities/pedido.entity';
import { Diseno } from '../diseno/entities/diseno.entity';
import { User } from '../user/entities/user.entity';
import { TipoTrabajo } from '../tipo-trabajo/entities/tipo-trabajo.entity';
import { Producto } from '../producto/entities/producto.entity';

@Injectable()
export class DetallePedidoService {
  constructor(
    @InjectRepository(DetallePedido)
    private readonly repository: Repository<DetallePedido>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    @InjectRepository(Diseno)
    private readonly disenoRepository: Repository<Diseno>,
    @InjectRepository(TipoTrabajo)
    private readonly tipoTrabajoRepository: Repository<TipoTrabajo>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  findAll(user: User): Promise<DetallePedido[]> {
    const isClient = user.role.nombre === 'cliente';
    return this.repository.find({
      where: isClient ? { pedido: { cliente: { id_usuario: user.id_usuario } } } : undefined,
      relations: { pedido: true, diseno: true, tipoTrabajo: true, producto: true },
      order: { id_detalle: 'ASC' },
    });
  }

  async findOne(id_detalle: number, user: User): Promise<DetallePedido> {
    const detalle = await this.repository.findOne({
      where: { id_detalle },
      relations: { pedido: { cliente: true }, diseno: true, tipoTrabajo: true, producto: true },
    });
    if (!detalle) throw new NotFoundException(`Detalle de pedido con ID ${id_detalle} no encontrado`);

    if (user.role.nombre === 'cliente' && detalle.pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar los detalles de tus pedidos');
    }
    return detalle;
  }

  async create(dto: CreateDetallePedidoDto, user: User): Promise<DetallePedido> {
    const pedido = await this.pedidoRepository.findOne({
      where: { id_pedido: dto.id_pedido },
      relations: { cliente: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);

    const isClient = user.role.nombre === 'cliente';
    if (isClient && pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes agregar detalles a tus pedidos');
    }

    let producto: Producto | null = null;
    if (dto.id_producto !== undefined) {
      producto = await this.productoRepository.findOne({ where: { id_producto: dto.id_producto } });
      if (!producto) throw new NotFoundException(`Producto con ID ${dto.id_producto} no encontrado`);
      if (!producto.estado) throw new ForbiddenException('No puedes usar un producto inactivo');
      if (producto.stock < dto.cantidad) throw new ForbiddenException(`Stock insuficiente. Disponible: ${producto.stock}`);
    }

    let tipoTrabajo: TipoTrabajo | null = null;
    if (dto.id_tipo_trabajo !== undefined) {
      tipoTrabajo = await this.tipoTrabajoRepository.findOne({ where: { id_tipo_trabajo: dto.id_tipo_trabajo } });
      if (!tipoTrabajo) throw new NotFoundException(`Tipo de trabajo con ID ${dto.id_tipo_trabajo} no encontrado`);
      if (tipoTrabajo.estado !== 'activo') throw new ForbiddenException('No puedes usar un tipo de trabajo inactivo');
    }

    let diseno: Diseno | null = null;
    if (dto.id_diseno !== undefined) {
      const foundDiseno = await this.disenoRepository.findOne({
        where: { id_diseno: dto.id_diseno },
        relations: { cliente: true },
      });
      if (!foundDiseno) throw new NotFoundException(`Diseño con ID ${dto.id_diseno} no encontrado`);
      if (isClient && foundDiseno.cliente.id_usuario !== user.id_usuario) {
        throw new ForbiddenException('Solo puedes usar tus propios diseños');
      }
      diseno = foundDiseno;
    }

    const detalle = this.repository.create({
      pedido,
      diseno,
      tipoTrabajo,
      producto,
      cantidad: dto.cantidad,
      precio_unitario: dto.precio_unitario,
      costo_trabajo_unitario: dto.costo_trabajo_unitario ?? '0.00',
      subtotal: dto.subtotal,
      ubicacion_estampado: dto.ubicacion_estampado ?? null,
      especificaciones: dto.especificaciones ?? null,
    });
    return this.repository.save(detalle);
  }

  async update(id_detalle: number, dto: UpdateDetallePedidoDto, user: User): Promise<DetallePedido> {
    const detalle = await this.findOne(id_detalle, user);
    if (user.role.nombre === 'cliente') {
      throw new ForbiddenException('Solo el personal puede modificar detalles de pedidos');
    }

    const changes = { ...dto };
    if (changes.id_pedido !== undefined) {
      const pedido = await this.pedidoRepository.findOne({ where: { id_pedido: changes.id_pedido } });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${changes.id_pedido} no encontrado`);
      detalle.pedido = pedido;
      delete changes.id_pedido;
    }

    if (changes.id_producto !== undefined) {
      const producto = await this.productoRepository.findOne({ where: { id_producto: changes.id_producto } });
      if (!producto) throw new NotFoundException(`Producto con ID ${changes.id_producto} no encontrado`);
      if (!producto.estado) throw new ForbiddenException('No puedes usar un producto inactivo');
      detalle.producto = producto;
      delete changes.id_producto;
    }

    if (changes.id_tipo_trabajo !== undefined) {
      const tipoTrabajo = await this.tipoTrabajoRepository.findOne({ where: { id_tipo_trabajo: changes.id_tipo_trabajo } });
      if (!tipoTrabajo) throw new NotFoundException(`Tipo de trabajo con ID ${changes.id_tipo_trabajo} no encontrado`);
      if (tipoTrabajo.estado !== 'activo') throw new ForbiddenException('No puedes usar un tipo de trabajo inactivo');
      detalle.tipoTrabajo = tipoTrabajo;
      delete changes.id_tipo_trabajo;
    }

    if (changes.id_diseno !== undefined) {
      const diseno = await this.disenoRepository.findOne({ where: { id_diseno: changes.id_diseno } });
      if (!diseno) throw new NotFoundException(`Diseño con ID ${changes.id_diseno} no encontrado`);
      detalle.diseno = diseno;
      delete changes.id_diseno;
    }

    this.repository.merge(detalle, changes);
    return this.repository.save(detalle);
  }

  async remove(id_detalle: number, user: User): Promise<void> {
    const detalle = await this.findOne(id_detalle, user);
    await this.repository.remove(detalle);
  }
}
