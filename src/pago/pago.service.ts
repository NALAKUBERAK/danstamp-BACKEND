import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Pago, PagoEstado } from './entities/pago.entity';
import { Pedido, PedidoEstado } from '../pedido/entities/pedido.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PagoService {
  constructor(
    @InjectRepository(Pago)
    private readonly repository: Repository<Pago>,
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationsService: NotificationsService,
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

  async create(
    dto: CreatePagoDto,
    user: User,
    file?: Express.Multer.File,
  ): Promise<Pago> {
    if (!file) throw new BadRequestException('Debes adjuntar el comprobante del pago');
    this.validateReceipt(file);
    const amountCents = this.toCents(dto.monto);
    if (amountCents <= 0) throw new BadRequestException('El monto debe ser mayor que cero');
    const preliminaryOrder = await this.pedidoRepository.findOne({
      where: { id_pedido: dto.id_pedido },
      relations: { cliente: true },
    });
    if (!preliminaryOrder) {
      throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);
    }
    if (
      user.role.nombre === 'cliente' &&
      preliminaryOrder.cliente.id_usuario !== user.id_usuario
    ) {
      throw new ForbiddenException('Solo puedes registrar pagos para tus pedidos');
    }
    if (
      [
        PedidoEstado.CANCELADO,
        PedidoEstado.COTIZACION,
        PedidoEstado.COTIZACION_ENVIADA,
      ].includes(preliminaryOrder.estado)
    ) {
      throw new BadRequestException('No se puede registrar un pago para este estado de pedido');
    }
    const initialPayments = await this.repository.find({
      where: {
        pedido: { id_pedido: preliminaryOrder.id_pedido },
        estado: In([PagoEstado.VALIDADO, PagoEstado.PENDIENTE]),
      },
      select: { monto: true },
    });
    const initialRemaining = this.toCents(preliminaryOrder.total) - initialPayments.reduce(
      (total, payment) => total + this.toCents(payment.monto),
      0,
    );
    if (amountCents > initialRemaining) {
      throw new BadRequestException(
        `El pago excede el saldo pendiente de ${(initialRemaining / 100).toFixed(2)}`,
      );
    }

    const upload = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      file.mimetype === 'application/pdf' ? 'raw' : 'image',
      undefined,
      'danstamp/comprobantes',
    );
    const pago = await this.repository.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Pedido);
      const paymentRepository = manager.getRepository(Pago);
      const pedido = await orderRepository.findOne({
        where: { id_pedido: dto.id_pedido },
        relations: { cliente: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${dto.id_pedido} no encontrado`);
      if (user.role.nombre === 'cliente' && pedido.cliente.id_usuario !== user.id_usuario) {
        throw new ForbiddenException('Solo puedes registrar pagos para tus pedidos');
      }
      if ([PedidoEstado.CANCELADO, PedidoEstado.COTIZACION, PedidoEstado.COTIZACION_ENVIADA].includes(pedido.estado)) {
        throw new BadRequestException('No se puede registrar un pago para este estado de pedido');
      }

      const confirmedPayments = await paymentRepository.find({
        where: {
          pedido: { id_pedido: pedido.id_pedido },
          estado: In([PagoEstado.VALIDADO, PagoEstado.PENDIENTE]),
        },
        select: { monto: true },
      });
      const paidCents = confirmedPayments.reduce(
        (total, payment) => total + this.toCents(payment.monto),
        0,
      );
      const remainingCents = this.toCents(pedido.total) - paidCents;
      if (amountCents > remainingCents) {
        throw new BadRequestException(
          `El pago excede el saldo pendiente de ${(remainingCents / 100).toFixed(2)}`,
        );
      }

      return paymentRepository.save(paymentRepository.create({
        pedido,
        metodo: dto.metodo,
        monto: dto.monto,
        comprobante_url: upload.secure_url,
        referencia: dto.referencia ?? null,
        operarioValida: null,
        fecha_validacion: null,
        observacion: dto.observacion ?? null,
        estado: PagoEstado.PENDIENTE,
      }));
    });

    const recipient = await this.userService.findNotificationRecipient(pago.pedido.cliente.id_usuario);
    await this.notificationsService.notifyUser(
      recipient,
      'Comprobante de pago recibido',
      `Recibimos el comprobante del pago ${pago.id_pago} por ${pago.monto}. Está pendiente de validación.`,
    );
    return pago;
  }

  async update(id_pago: number, dto: UpdatePagoDto, user: User): Promise<Pago> {
    if (user.role.nombre === 'cliente') {
      throw new ForbiddenException('Solo el personal puede validar pagos');
    }

    if (dto.estado === PagoEstado.PENDIENTE) {
      throw new BadRequestException('El pago debe validarse o rechazarse');
    }

    const updated = await this.repository.manager.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Pago);
      const orderRepository = manager.getRepository(Pedido);
      const pago = await paymentRepository.findOne({
        where: { id_pago },
        relations: { pedido: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago) throw new NotFoundException(`Pago con ID ${id_pago} no encontrado`);
      if (pago.estado !== PagoEstado.PENDIENTE) {
        throw new BadRequestException('Solo se pueden validar pagos pendientes');
      }
      const pedido = await orderRepository.findOne({
        where: { id_pedido: pago.pedido.id_pedido },
        relations: { cliente: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException('El pedido asociado al pago no existe');

      if (dto.estado === PagoEstado.VALIDADO) {
        const pagosValidados = await paymentRepository.find({
          where: {
            pedido: { id_pedido: pedido.id_pedido },
            estado: PagoEstado.VALIDADO,
          },
          select: { monto: true },
        });
        const totalValidado = pagosValidados.reduce(
          (total, item) => total + this.toCents(item.monto),
          0,
        );
        if (totalValidado + this.toCents(pago.monto) > this.toCents(pedido.total)) {
          throw new BadRequestException('La validación excedería el total del pedido');
        }
      }

      pago.pedido = pedido;
      pago.estado = dto.estado;
      pago.observacion = dto.observacion ?? pago.observacion;
      pago.operarioValida = await this.userService.findOne(user.id_usuario);
      pago.fecha_validacion = new Date();
      return paymentRepository.save(pago);
    });

    const recipient = await this.userService.findNotificationRecipient(updated.pedido.cliente.id_usuario);
    await this.notificationsService.notifyUser(
      recipient,
      updated.estado === PagoEstado.VALIDADO ? 'Pago validado' : 'Pago rechazado',
      dto.estado === PagoEstado.VALIDADO
        ? `El pago ${updated.id_pago} de tu pedido fue validado.`
        : `El pago ${updated.id_pago} fue rechazado.${dto.observacion ? ` Motivo: ${dto.observacion}` : ''}`,
    );
    return updated;
  }

  async getReceipt(id_pago: number, user: User): Promise<{ url: string }> {
    const pago = await this.findOne(id_pago, user);
    if (!pago.comprobante_url) throw new NotFoundException('El comprobante no está disponible');
    return { url: pago.comprobante_url };
  }

  async remove(id_pago: number): Promise<void> {
    const pago = await this.repository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException(`Pago con ID ${id_pago} no encontrado`);
    throw new BadRequestException('Los pagos no se eliminan; cambia su estado a rechazado para conservar auditoría');
  }

  private toCents(value: string): number {
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException('El monto debe ser positivo y tener hasta dos decimales');
    }
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }

  private validateReceipt(file: Express.Multer.File): void {
    const { mimetype, originalname, buffer, size } = file;
    const extension = originalname.split('.').pop()?.toLowerCase();
    const jpeg = mimetype === 'image/jpeg' &&
      extension !== undefined &&
      ['jpg', 'jpeg'].includes(extension) &&
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const png = mimetype === 'image/png' &&
      extension === 'png' &&
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = mimetype === 'image/webp' &&
      extension === 'webp' &&
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    const pdf = mimetype === 'application/pdf' &&
      extension === 'pdf' &&
      buffer.toString('ascii', 0, 5) === '%PDF-';

    if (size > 5 * 1024 * 1024 || !(jpeg || png || webp || pdf)) {
      throw new BadRequestException('Comprobante inválido o formato no permitido (JPG, PNG, WEBP o PDF; máximo 5 MB)');
    }
  }
}
