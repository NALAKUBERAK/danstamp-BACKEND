import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialPedido } from './entities/historial-pedido.entity';
import { Pedido, PedidoEstado } from '../pedido/entities/pedido.entity';
import { CreateHistorialPedidoDto } from './dto/create-historial-pedido.dto';
import { UpdateHistorialPedidoDto } from './dto/update-historial-pedido.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class HistorialPedidoService {
  constructor(
    @InjectRepository(HistorialPedido)
    private readonly repository: Repository<HistorialPedido>,
  ) {}

  findAll(user: User): Promise<HistorialPedido[]> {
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
      relations: { pedido: { cliente: true, operario: true }, usuario: true },
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id_historial: number, user?: User): Promise<HistorialPedido> {
    const historial = await this.repository.findOne({
      where: { id_historial },
      relations: { pedido: { cliente: true, operario: true }, usuario: true },
    });
    if (!historial) throw new NotFoundException(`Historial con ID ${id_historial} no encontrado`);

    if (user?.role.nombre === 'cliente' && historial.pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar el historial de tus pedidos');
    }
    if (
      user?.role.nombre === 'empleado' &&
      historial.pedido.operario?.id_usuario !== user.id_usuario &&
      historial.pedido.estado !== PedidoEstado.COTIZACION
    ) {
      throw new ForbiddenException('Solo puedes consultar el historial de pedidos asignados a ti');
    }
    return historial;
  }

  async create(dto: CreateHistorialPedidoDto, user: User): Promise<HistorialPedido> {
    void dto;
    void user;
    throw new BadRequestException('El historial se genera automáticamente a partir de cambios de estado');
  }

  async createAutomatic(pedido: Pedido, usuario: User, estadoAnterior: string, estadoNuevo: string, comentario?: string): Promise<HistorialPedido> {
    const historial = this.repository.create({
      pedido,
      usuario,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      comentario: comentario ?? null,
    });
    return this.repository.save(historial);
  }

  async update(id_historial: number, dto: UpdateHistorialPedidoDto): Promise<HistorialPedido> {
    void id_historial;
    void dto;
    throw new BadRequestException('El historial de pedidos es inmutable');
  }

  async remove(id_historial: number): Promise<void> {
    void id_historial;
    throw new BadRequestException('El historial de pedidos no se puede eliminar');
  }
}
