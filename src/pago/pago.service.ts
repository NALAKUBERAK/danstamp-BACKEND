import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class PagoService {
  constructor(
    @InjectRepository(Pago)
    private readonly repository: Repository<Pago>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    private readonly userService: UserService,
  ) {}

  findAll(user: User): Promise<Pago[]> {
    const isClient = user.role.nombre === 'cliente';
    return this.repository.find({
      where: isClient ? { pedido: { cliente: { id_usuario: user.id_usuario } } } : undefined,
      relations: { pedido: true, operarioValida: true },
      order: { fecha_pago: 'DESC' },
    });
  }

  async findOne(id_pago: number, user: User): Promise<Pago> {
    const pago = await this.repository.findOne({
      where: { id_pago },
      relations: { pedido: { cliente: true, operario: true }, operarioValida: true },
    });
    if (!pago) throw new NotFoundException(`Pago con ID ${id_pago} no encontrado`);

    if (user.role.nombre === 'cliente' && pago.pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar los pagos de tus pedidos');
    }
    return pago;
  }

  async create(dto: CreatePagoDto, user: User): Promise<Pago> {
    const pedido = await this.pedidoRepository.findOne({
      where: { id_pedido: dto.id_pedido },
      relations: { cliente: true },
    });
    if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);

    if (user.role.nombre === 'cliente' && pedido.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes registrar pagos para tus pedidos');
    }

    let operarioValida: User | null = null;
    let fecha_validacion: Date | null = null;
    if (dto.id_operario_valida !== undefined) {
      if (user.role.nombre === 'cliente') {
        throw new ForbiddenException('Solo el personal puede validar pagos');
      }
      operarioValida = await this.userService.findOne(dto.id_operario_valida);
      fecha_validacion = new Date();
    }

    const pago = this.repository.create({
      pedido,
      metodo: dto.metodo,
      monto: dto.monto,
      comprobante_url: dto.comprobante_url ?? null,
      referencia: dto.referencia ?? null,
      operarioValida,
      fecha_validacion,
      observacion: dto.observacion ?? null,
    });
    return this.repository.save(pago);
  }

  async update(id_pago: number, dto: UpdatePagoDto, user: User): Promise<Pago> {
    const pago = await this.findOne(id_pago, user);
    if (user.role.nombre === 'cliente') {
      throw new ForbiddenException('Solo el personal puede modificar o validar pagos');
    }

    const changes = { ...dto };
    if (changes.id_pedido !== undefined) {
      const pedido = await this.pedidoRepository.findOne({ where: { id_pedido: changes.id_pedido } });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${changes.id_pedido} no encontrado`);
      pago.pedido = pedido;
      delete changes.id_pedido;
    }

    if (changes.id_operario_valida !== undefined) {
      pago.operarioValida = await this.userService.findOne(changes.id_operario_valida);
      pago.fecha_validacion = new Date();
      delete changes.id_operario_valida;
    }

    this.repository.merge(pago, changes);
    return this.repository.save(pago);
  }

  async remove(id_pago: number): Promise<void> {
    const pago = await this.repository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException(`Pago con ID ${id_pago} no encontrado`);
    await this.repository.remove(pago);
  }
}
