import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { HistorialPedidoService } from '../historial-pedido/historial-pedido.service';

@Injectable()
export class PedidoService {
  constructor(
    @InjectRepository(Pedido)
    private readonly repository: Repository<Pedido>,
    private readonly userService: UserService,
    private readonly historialPedidoService: HistorialPedidoService,
  ) {}

  findAll(user: User): Promise<Pedido[]> {
    const isClient = user.role.nombre === 'cliente';
    return this.repository.find({
      where: isClient ? { cliente: { id_usuario: user.id_usuario } } : undefined,
      relations: { cliente: true, operario: true, historial: { usuario: true } },
      order: { fecha_pedido: 'DESC', historial: { fecha: 'DESC' } },
    });
  }

  async findOne(id_pedido: number, user?: User): Promise<Pedido> {
    const pedido = await this.repository.findOne({
      where: { id_pedido },
      relations: { cliente: true, operario: true, historial: { usuario: true } },
      order: { historial: { fecha: 'DESC' } },
    });
    if (!pedido) throw new NotFoundException(`Pedido con ID ${id_pedido} no encontrado`);

    if (user?.role.nombre === 'cliente' && pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar tus propios pedidos');
    }
    return pedido;
  }

  async create(dto: CreatePedidoDto, user: User): Promise<Pedido> {
    const isStaff = user.role.nombre === 'admin' || user.role.nombre === 'empleado';
    const clienteId = isStaff && dto.id_cliente !== undefined
      ? dto.id_cliente
      : user.id_usuario;
    const cliente = await this.userService.findOne(clienteId);

    let operario: User | null = null;
    if (dto.id_operario !== undefined) {
      operario = await this.userService.findOne(dto.id_operario);
    }

    const pedido = this.repository.create({
      cliente,
      operario,
      fecha_entrega_estimada: dto.fecha_entrega_estimada ?? null,
      direccion_entrega: dto.direccion_entrega,
      subtotal_productos: dto.subtotal_productos ?? '0.00',
      total_trabajos: dto.total_trabajos ?? '0.00',
      total: dto.total ?? '0.00',
      estado: dto.estado ?? PedidoEstado.PENDIENTE,
      observaciones: dto.observaciones ?? null,
    });

    const pedidoGuardado = await this.repository.save(pedido);
    await this.historialPedidoService.createAutomatic(
      pedidoGuardado,
      user,
      'nuevo',
      pedidoGuardado.estado,
      'Pedido creado',
    );
    return pedidoGuardado;
  }

  async update(id_pedido: number, dto: UpdatePedidoDto, user: User): Promise<Pedido> {
    const pedido = await this.findOne(id_pedido, user);
    const estadoAnterior = pedido.estado;
    const isStaff = user.role.nombre === 'admin' || user.role.nombre === 'empleado';
    const changes = { ...dto };

    if (changes.id_cliente !== undefined) {
      if (!isStaff) throw new ForbiddenException('Solo el personal puede cambiar el cliente de un pedido');
      pedido.cliente = await this.userService.findOne(changes.id_cliente);
      delete changes.id_cliente;
    }

    if (changes.id_operario !== undefined) {
      if (!isStaff) throw new ForbiddenException('Solo el personal puede asignar un operario');
      pedido.operario = await this.userService.findOne(changes.id_operario);
      delete changes.id_operario;
    }

    this.repository.merge(pedido, changes);
    const pedidoActualizado = await this.repository.save(pedido);
    if (pedidoActualizado.estado !== estadoAnterior) {
      await this.historialPedidoService.createAutomatic(
        pedidoActualizado,
        user,
        estadoAnterior,
        pedidoActualizado.estado,
        dto.observaciones ?? undefined,
      );
    }
    return pedidoActualizado;
  }

  async remove(id_pedido: number): Promise<void> {
    const pedido = await this.repository.findOne({ where: { id_pedido } });
    if (!pedido) throw new NotFoundException(`Pedido con ID ${id_pedido} no encontrado`);
    await this.repository.remove(pedido);
  }
}
