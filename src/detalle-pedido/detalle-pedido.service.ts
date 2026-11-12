import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { CreateDetallePedidoDto } from './dto/create-detalle-pedido.dto';
import { UpdateDetallePedidoDto } from './dto/update-detalle-pedido.dto';
import { User } from '../user/entities/user.entity';
import { PedidoEstado } from '../pedido/entities/pedido.entity';

@Injectable()
export class DetallePedidoService {
  constructor(
    @InjectRepository(DetallePedido)
    private readonly repository: Repository<DetallePedido>,
  ) {}

  findAll(user: User): Promise<DetallePedido[]> {
    const isClient = user.role.nombre === 'cliente';
    const isEmployee = user.role.nombre === 'empleado';
    return this.repository.find({
      where: isClient
        ? { pedido: { cliente: { id_usuario: user.id_usuario } } }
        : isEmployee
          ? [
              { pedido: { operario: { id_usuario: user.id_usuario } } },
              { pedido: { estado: PedidoEstado.COTIZACION } },
            ]
          : undefined,
      relations: { pedido: true, diseno: true, tipoTrabajo: true, producto: true },
      order: { id_detalle: 'ASC' },
    });
  }

  async findOne(id_detalle: number, user: User): Promise<DetallePedido> {
    const detalle = await this.repository.findOne({
      where: { id_detalle },
      relations: {
        pedido: { cliente: true, operario: true },
        diseno: true,
        tipoTrabajo: true,
        producto: true,
      },
    });
    if (!detalle) throw new NotFoundException(`Detalle de pedido con ID ${id_detalle} no encontrado`);

    if (user.role.nombre === 'cliente' && detalle.pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar los detalles de tus pedidos');
    }
    if (
      user.role.nombre === 'empleado' &&
      detalle.pedido.operario?.id_usuario !== user.id_usuario &&
      detalle.pedido.estado !== PedidoEstado.COTIZACION
    ) {
      throw new ForbiddenException('Solo puedes consultar detalles de pedidos asignados a ti');
    }
    return detalle;
  }

  async create(
    _dto: CreateDetallePedidoDto,
    _user: User,
  ): Promise<DetallePedido> {
    throw new BadRequestException(
      'Los detalles se crean desde checkout o solicitud de cotización para mantener totales e inventario consistentes',
    );
  }

  async update(
    _id_detalle: number,
    _dto: UpdateDetallePedidoDto,
    _user: User,
  ): Promise<DetallePedido> {
    throw new BadRequestException(
      'Los detalles de un pedido confirmado son inmutables; crea un nuevo pedido para corregirlo',
    );
  }

  async remove(_id_detalle: number, _user: User): Promise<void> {
    throw new BadRequestException('Los detalles de un pedido confirmado no se pueden eliminar');
  }
}
