import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialPedido } from './entities/historial-pedido.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { CreateHistorialPedidoDto } from './dto/create-historial-pedido.dto';
import { UpdateHistorialPedidoDto } from './dto/update-historial-pedido.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class HistorialPedidoService {
  constructor(
    @InjectRepository(HistorialPedido)
    private readonly repository: Repository<HistorialPedido>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    private readonly userService: UserService,
  ) {}

  findAll(user: User): Promise<HistorialPedido[]> {
    const isClient = user.role.nombre === 'cliente';
    return this.repository.find({
      where: isClient ? { pedido: { cliente: { id_usuario: user.id_usuario } } } : undefined,
      relations: { pedido: { cliente: true, operario: true }, usuario: true },
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id_historial: number, user?: User): Promise<HistorialPedido> {
    const historial = await this.repository.findOne({
      where: { id_historial },
      relations: { pedido: { cliente: true }, usuario: true },
    });
    if (!historial) throw new NotFoundException(`Historial con ID ${id_historial} no encontrado`);

    if (user?.role.nombre === 'cliente' && historial.pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar el historial de tus pedidos');
    }
    return historial;
  }

  async create(dto: CreateHistorialPedidoDto, user: User): Promise<HistorialPedido> {
    const pedido = await this.pedidoRepository.findOne({ where: { id_pedido: dto.id_pedido } });
    if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);

    const usuario = await this.userService.findOne(dto.id_usuario ?? user.id_usuario);
    const historial = this.repository.create({
      pedido,
      usuario,
      estado_anterior: dto.estado_anterior,
      estado_nuevo: dto.estado_nuevo,
      comentario: dto.comentario ?? null,
    });
    return this.repository.save(historial);
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
    const historial = await this.findOne(id_historial);
    const changes = { ...dto };

    if (changes.id_pedido !== undefined) {
      const pedido = await this.pedidoRepository.findOne({ where: { id_pedido: changes.id_pedido } });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${changes.id_pedido} no encontrado`);
      historial.pedido = pedido;
      delete changes.id_pedido;
    }

    if (changes.id_usuario !== undefined) {
      historial.usuario = await this.userService.findOne(changes.id_usuario);
      delete changes.id_usuario;
    }

    this.repository.merge(historial, changes);
    return this.repository.save(historial);
  }

  async remove(id_historial: number): Promise<void> {
    const historial = await this.findOne(id_historial);
    await this.repository.remove(historial);
  }
}
