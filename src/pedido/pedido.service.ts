import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { RequestQuoteDto } from './dto/request-quote.dto';
import { SendQuoteDto } from './dto/send-quote.dto';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { HistorialPedidoService } from '../historial-pedido/historial-pedido.service';
import { DetallePedido } from '../detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from '../producto/entities/producto.entity';
import { TipoTrabajo } from '../tipo-trabajo/entities/tipo-trabajo.entity';
import { Diseno } from '../diseno/entities/diseno.entity';
import {
  MovimientoInventario,
  TipoMovimientoInventario,
} from '../movimiento-inventario/entities/movimiento-inventario.entity';
import { HistorialPedido } from '../historial-pedido/entities/historial-pedido.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PedidoLineDto } from './dto/pedido-line.dto';

@Injectable()
export class PedidoService {
  constructor(
    @InjectRepository(Pedido)
    private readonly repository: Repository<Pedido>,
    private readonly userService: UserService,
    private readonly historialPedidoService: HistorialPedidoService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(user: User): Promise<Pedido[]> {
    const isClient = user.role.nombre === 'cliente';
    const isEmployee = user.role.nombre === 'empleado';
    return this.repository.find({
      where: isClient
        ? { cliente: { id_usuario: user.id_usuario } }
        : isEmployee
          ? [
              { operario: { id_usuario: user.id_usuario } },
              { estado: PedidoEstado.COTIZACION },
            ]
          : undefined,
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
    if (
      user?.role.nombre === 'empleado' &&
      pedido.operario?.id_usuario !== user.id_usuario &&
      pedido.estado !== PedidoEstado.COTIZACION
    ) {
      throw new ForbiddenException('Solo puedes consultar pedidos asignados a ti');
    }
    return pedido;
  }

  async create(dto: CreatePedidoDto, user: User): Promise<Pedido> {
    this.requireStaff(user);
    if (
      dto.estado === PedidoEstado.COTIZACION ||
      dto.estado === PedidoEstado.COTIZACION_ENVIADA
    ) {
      throw new BadRequestException('Las cotizaciones deben crearse por el flujo de solicitud');
    }

    const cliente = await this.userService.findOne(dto.id_cliente ?? user.id_usuario);
    if (cliente.role.nombre !== 'cliente') {
      throw new BadRequestException('El cliente del pedido debe tener el rol cliente');
    }
    const operario = dto.id_operario === undefined
      ? null
      : await this.requireOperario(dto.id_operario);
    const subtotalProducts = this.toCents(dto.subtotal_productos ?? '0.00');
    const totalServices = this.toCents(dto.total_trabajos ?? '0.00');
    const computedTotal = subtotalProducts + totalServices;
    if (dto.total !== undefined && this.toCents(dto.total) !== computedTotal) {
      throw new BadRequestException('El total debe coincidir con productos más trabajos');
    }
    if (dto.estado !== undefined && dto.estado !== PedidoEstado.PENDIENTE) {
      throw new BadRequestException('Un pedido nuevo debe iniciar en estado pendiente');
    }

    const pedido = this.repository.create({
      cliente,
      operario,
      fecha_entrega_estimada: dto.fecha_entrega_estimada ?? null,
      direccion_entrega: dto.direccion_entrega,
      subtotal_productos: this.money(subtotalProducts),
      total_trabajos: this.money(totalServices),
      total: this.money(computedTotal),
      estado: PedidoEstado.PENDIENTE,
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

  async checkout(dto: CheckoutDto, user: User): Promise<Pedido> {
    if (user.role.nombre !== 'cliente') {
      throw new ForbiddenException('El checkout está disponible para clientes');
    }

    const result = await this.repository.manager.transaction((manager) =>
      this.createWithLines(manager, dto, user, PedidoEstado.PENDIENTE, true, false),
    );
    const pedido = result.pedido;
    await this.historialPedidoService.createAutomatic(
      pedido,
      user,
      'nuevo',
      PedidoEstado.PENDIENTE,
      'Pedido confirmado mediante checkout',
    );
    const recipient = await this.userService.findNotificationRecipient(user.id_usuario);
    await this.notificationsService.notifyUser(
      recipient,
      'Pedido recibido',
      `Recibimos tu pedido ${pedido.id_pedido} por ${pedido.total}.`,
    );
    if (result.newlyLowStock.length > 0) {
      const admins = await this.userService.findNotificationRecipientsByRole('admin');
      await Promise.all(admins.flatMap((admin) => result.newlyLowStock.map((product) =>
        this.notificationsService.notifyUser(
          admin,
          'Alerta de inventario bajo',
          `El producto ${product.nombre} tiene ${product.stock} unidades; mínimo configurado: ${product.stock_minimo}.`,
        ),
      )));
    }
    return pedido;
  }

  async requestQuote(dto: RequestQuoteDto, user: User): Promise<Pedido> {
    if (user.role.nombre !== 'cliente') {
      throw new ForbiddenException('La solicitud de cotización está disponible para clientes');
    }
    const result = await this.repository.manager.transaction((manager) =>
      this.createWithLines(manager, dto, user, PedidoEstado.COTIZACION, false, true),
    );
    const pedido = result.pedido;
    await this.historialPedidoService.createAutomatic(
      pedido,
      user,
      'nuevo',
      PedidoEstado.COTIZACION,
      'Solicitud de cotización recibida',
    );
    return pedido;
  }

  async sendQuote(id_pedido: number, dto: SendQuoteDto, user: User): Promise<Pedido> {
    this.requireStaff(user);
    const pedido = await this.findOne(id_pedido, user);
    if (pedido.estado !== PedidoEstado.COTIZACION) {
      throw new BadRequestException('El pedido no está esperando una cotización');
    }

    pedido.total_trabajos = dto.total_trabajos;
    pedido.subtotal_productos = '0.00';
    pedido.total = this.money(this.toCents(dto.total_trabajos));
    if (dto.fecha_entrega_estimada) {
      pedido.fecha_entrega_estimada = dto.fecha_entrega_estimada;
    }
    pedido.estado = PedidoEstado.COTIZACION_ENVIADA;
    const saved = await this.repository.save(pedido);
    await this.historialPedidoService.createAutomatic(
      saved,
      user,
      PedidoEstado.COTIZACION,
      PedidoEstado.COTIZACION_ENVIADA,
      'Cotización enviada al cliente',
    );
    const recipient = await this.userService.findNotificationRecipient(pedido.cliente.id_usuario);
    await this.notificationsService.notifyUser(
      recipient,
      'Tu cotización está lista',
      `La cotización del pedido ${pedido.id_pedido} es ${pedido.total}. Ingresa a tu cuenta para aceptarla o rechazarla.`,
    );
    return saved;
  }

  async respondToQuote(
    id_pedido: number,
    user: User,
    accepted: boolean,
  ): Promise<Pedido> {
    if (user.role.nombre !== 'cliente') {
      throw new ForbiddenException('Solo el cliente puede responder a la cotización');
    }
    const pedido = await this.findOne(id_pedido, user);
    if (pedido.estado !== PedidoEstado.COTIZACION_ENVIADA) {
      throw new BadRequestException('El pedido no tiene una cotización pendiente de respuesta');
    }

    const previousState = pedido.estado;
    pedido.estado = accepted ? PedidoEstado.PENDIENTE : PedidoEstado.CANCELADO;
    const saved = await this.repository.save(pedido);
    await this.historialPedidoService.createAutomatic(
      saved,
      user,
      previousState,
      saved.estado,
      accepted ? 'Cotización aceptada por el cliente' : 'Cotización rechazada por el cliente',
    );
    return saved;
  }

  async update(id_pedido: number, dto: UpdatePedidoDto, user: User): Promise<Pedido> {
    const pedido = await this.findOne(id_pedido, user);
    const estadoAnterior = pedido.estado;
    const operarioAnterior = pedido.operario?.id_usuario;
    const changes = { ...dto };
    const isStaff = user.role.nombre === 'admin' || user.role.nombre === 'empleado';

    if (changes.estado === PedidoEstado.CANCELADO) {
      if (!isStaff) throw new ForbiddenException('Solo el personal puede cancelar un pedido');
      const invalidFields = Object.keys(changes).filter(
        (key) => key !== 'estado' && key !== 'observaciones',
      );
      if (invalidFields.length > 0) {
        throw new BadRequestException('Cancela el pedido en una solicitud separada de otros cambios');
      }
      this.validateTransition(pedido.estado, PedidoEstado.CANCELADO);
      return this.cancelOrder(id_pedido, user, dto.observaciones);
    }

    if (!isStaff) {
      const customerFields = new Set([
        'direccion_entrega',
        'fecha_entrega_estimada',
        'observaciones',
      ]);
      const forbiddenField = Object.keys(changes).find((key) => !customerFields.has(key));
      if (forbiddenField) {
        throw new ForbiddenException('El cliente solo puede modificar la dirección, fecha estimada y observaciones');
      }
    }

    if (changes.id_cliente !== undefined) {
      if (user.role.nombre !== 'admin') {
        throw new ForbiddenException('Solo un administrador puede cambiar el cliente de un pedido');
      }
      const cliente = await this.userService.findOne(changes.id_cliente);
      if (cliente.role.nombre !== 'cliente') {
        throw new BadRequestException('El cliente del pedido debe tener el rol cliente');
      }
      pedido.cliente = cliente;
      delete changes.id_cliente;
    }

    if (changes.id_operario !== undefined) {
      if (user.role.nombre !== 'admin') {
        throw new ForbiddenException('Solo un administrador puede asignar operarios');
      }
      pedido.operario = await this.requireOperario(changes.id_operario);
      delete changes.id_operario;
    }

    if (changes.estado !== undefined) {
      this.requireStaff(user);
      this.validateTransition(pedido.estado, changes.estado);
    }

    if (changes.total !== undefined || changes.total_trabajos !== undefined || changes.subtotal_productos !== undefined) {
      if (user.role.nombre !== 'admin') {
        throw new ForbiddenException('Solo un administrador puede modificar los totales del pedido');
      }
      const products = changes.subtotal_productos ?? pedido.subtotal_productos;
      const services = changes.total_trabajos ?? pedido.total_trabajos;
      if (changes.total !== undefined && this.toCents(changes.total) !== this.toCents(products) + this.toCents(services)) {
        throw new BadRequestException('El total debe coincidir con productos más trabajos');
      }
    }

    this.repository.merge(pedido, changes);
    if (changes.total === undefined && (changes.total_trabajos !== undefined || changes.subtotal_productos !== undefined)) {
      pedido.total = this.money(this.toCents(pedido.subtotal_productos) + this.toCents(pedido.total_trabajos));
    }
    const pedidoActualizado = await this.repository.save(pedido);
    if (pedidoActualizado.estado !== estadoAnterior) {
      await this.historialPedidoService.createAutomatic(
        pedidoActualizado,
        user,
        estadoAnterior,
        pedidoActualizado.estado,
        dto.observaciones ?? undefined,
      );
      const recipient = await this.userService.findNotificationRecipient(pedido.cliente.id_usuario);
      await this.notificationsService.notifyUser(
        recipient,
        'Actualización de tu pedido',
        `El estado del pedido ${pedido.id_pedido} cambió a ${pedidoActualizado.estado}.`,
      );
    }
    if (
      pedidoActualizado.operario &&
      pedidoActualizado.operario.id_usuario !== operarioAnterior
    ) {
      const recipient = await this.userService.findNotificationRecipient(
        pedidoActualizado.operario.id_usuario,
      );
      await this.notificationsService.notifyUser(
        recipient,
        'Nuevo pedido asignado',
        `Se te asignó el pedido ${pedidoActualizado.id_pedido}.`,
      );
    }
    return pedidoActualizado;
  }

  async remove(id_pedido: number, user: User): Promise<void> {
    if (user.role.nombre !== 'admin') {
      throw new ForbiddenException('Solo un administrador puede cancelar un pedido');
    }
    await this.cancelOrder(id_pedido, user, 'Pedido cancelado por administración');
  }

  private async cancelOrder(
    id_pedido: number,
    user: User,
    comment?: string,
  ): Promise<Pedido> {
    const cancelled = await this.repository.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Pedido);
      const movementRepository = manager.getRepository(MovimientoInventario);
      const productRepository = manager.getRepository(Producto);
      const historyRepository = manager.getRepository(HistorialPedido);
      const pedido = await orderRepository.findOne({
        where: { id_pedido },
        relations: { cliente: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pedido) throw new NotFoundException(`Pedido con ID ${id_pedido} no encontrado`);
      if ([PedidoEstado.ENTREGADO, PedidoEstado.CANCELADO].includes(pedido.estado)) {
        throw new BadRequestException('Este pedido no se puede cancelar');
      }

      const previousState = pedido.estado;
      const checkoutMovements = await movementRepository.find({
        where: {
          pedido: { id_pedido },
          tipo: TipoMovimientoInventario.SALIDA,
          observacion: 'Salida automática por checkout',
        },
        relations: { producto: true },
      });
      for (const movement of checkoutMovements) {
        const product = await productRepository.findOne({
          where: { id_producto: movement.producto.id_producto },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new NotFoundException(
            `Producto con ID ${movement.producto.id_producto} no encontrado al cancelar el pedido`,
          );
        }
        product.stock += movement.cantidad;
        await productRepository.save(product);
        await movementRepository.save(movementRepository.create({
          producto: product,
          usuario: user,
          pedido,
          tipo: TipoMovimientoInventario.ENTRADA,
          cantidad: movement.cantidad,
          observacion: 'Reintegro automático por cancelación',
        }));
      }

      pedido.estado = PedidoEstado.CANCELADO;
      const saved = await orderRepository.save(pedido);
      await historyRepository.save(historyRepository.create({
        pedido: saved,
        usuario: user,
        estado_anterior: previousState,
        estado_nuevo: PedidoEstado.CANCELADO,
        comentario: comment ?? 'Pedido cancelado',
      }));
      return saved;
    });

    const recipient = await this.userService.findNotificationRecipient(
      cancelled.cliente.id_usuario,
    );
    await this.notificationsService.notifyUser(
      recipient,
      'Pedido cancelado',
      `El pedido ${cancelled.id_pedido} fue cancelado.`,
    );
    return cancelled;
  }

  private async createWithLines(
    manager: EntityManager,
    dto: CheckoutDto | RequestQuoteDto,
    user: User,
    estado: PedidoEstado,
    decrementStock: boolean,
    quoteOnly: boolean,
  ): Promise<{ pedido: Pedido; newlyLowStock: Array<Pick<Producto, 'id_producto' | 'nombre' | 'stock' | 'stock_minimo'>> }> {
    let subtotalProducts = 0;
    let totalServices = 0;
    const orderRepository = manager.getRepository(Pedido);
    const detailsRepository = manager.getRepository(DetallePedido);
    const productRepository = manager.getRepository(Producto);
    const workRepository = manager.getRepository(TipoTrabajo);
    const designRepository = manager.getRepository(Diseno);
    const movementRepository = manager.getRepository(MovimientoInventario);

    const preparedLines: Array<{
      line: PedidoLineDto;
      product: Producto | null;
      work: TipoTrabajo | null;
      design: Diseno | null;
      productUnitCents: number;
      workUnitCents: number;
    }> = [];
    const newlyLowStock = new Map<number, Pick<Producto, 'id_producto' | 'nombre' | 'stock' | 'stock_minimo'>>();

    for (const line of dto.items) {
      if (!line.id_producto && !line.id_tipo_trabajo) {
        throw new BadRequestException('Cada detalle debe incluir un producto o tipo de trabajo');
      }
      if (quoteOnly && (!line.id_tipo_trabajo || line.id_producto)) {
        throw new BadRequestException('Una solicitud de cotización debe incluir trabajos y no productos');
      }

      let product: Producto | null = null;
      if (line.id_producto) {
        product = await productRepository.findOne({
          where: { id_producto: line.id_producto, estado: true },
          lock: decrementStock ? { mode: 'pessimistic_write' } : undefined,
        });
        if (!product) throw new NotFoundException(`Producto con ID ${line.id_producto} no encontrado o inactivo`);
        if (decrementStock && product.stock < line.cantidad) {
          throw new BadRequestException(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}`);
        }
      }

      let work: TipoTrabajo | null = null;
      if (line.id_tipo_trabajo) {
        work = await workRepository.findOne({
          where: { id_tipo_trabajo: line.id_tipo_trabajo, estado: 'activo' },
        });
        if (!work) throw new NotFoundException(`Tipo de trabajo con ID ${line.id_tipo_trabajo} no encontrado o inactivo`);
      }

      let design: Diseno | null = null;
      if (line.id_diseno) {
        design = await designRepository.findOne({
          where: { id_diseno: line.id_diseno },
          relations: { cliente: true },
        });
        if (!design) throw new NotFoundException(`Diseño con ID ${line.id_diseno} no encontrado`);
        if (design.cliente.id_usuario !== user.id_usuario) {
          throw new ForbiddenException('Solo puedes usar tus propios diseños');
        }
      }

      const productUnitCents = product ? this.toCents(product.precio_base) : 0;
      const workUnitCents = work ? this.toCents(work.costo) : 0;
      subtotalProducts += productUnitCents * line.cantidad;
      totalServices += workUnitCents * line.cantidad;
      preparedLines.push({ line, product, work, design, productUnitCents, workUnitCents });
    }
    if (decrementStock && !preparedLines.some(({ product }) => product !== null)) {
      throw new BadRequestException('El checkout requiere al menos un producto');
    }

    const pedido = await orderRepository.save(orderRepository.create({
      cliente: user,
      operario: null,
      fecha_entrega_estimada: dto.fecha_entrega_estimada ?? null,
      direccion_entrega: dto.direccion_entrega,
      subtotal_productos: this.money(subtotalProducts),
      total_trabajos: this.money(totalServices),
      total: this.money(subtotalProducts + totalServices),
      estado,
      observaciones: dto.observaciones ?? null,
    }));

    for (const prepared of preparedLines) {
      const { line, product, work, design, productUnitCents, workUnitCents } = prepared;
      await detailsRepository.save(detailsRepository.create({
        pedido,
        producto: product,
        tipoTrabajo: work,
        diseno: design,
        cantidad: line.cantidad,
        precio_unitario: this.money(productUnitCents),
        costo_trabajo_unitario: this.money(workUnitCents),
        subtotal: this.money((productUnitCents + workUnitCents) * line.cantidad),
        ubicacion_estampado: line.ubicacion_estampado ?? null,
        especificaciones: line.especificaciones ?? null,
      }));

      if (decrementStock && product) {
        const stockBefore = product.stock;
        product.stock -= line.cantidad;
        await productRepository.save(product);
        await movementRepository.save(movementRepository.create({
          producto: product,
          usuario: user,
          pedido,
          tipo: TipoMovimientoInventario.SALIDA,
          cantidad: line.cantidad,
          observacion: 'Salida automática por checkout',
        }));
        if (
          product.stock_minimo > 0 &&
          stockBefore > product.stock_minimo &&
          product.stock <= product.stock_minimo
        ) {
          newlyLowStock.set(product.id_producto, {
            id_producto: product.id_producto,
            nombre: product.nombre,
            stock: product.stock,
            stock_minimo: product.stock_minimo,
          });
        }
      }
    }
    return { pedido, newlyLowStock: [...newlyLowStock.values()] };
  }

  private async requireOperario(id: number): Promise<User> {
    const user = await this.userService.findOne(id);
    if (user.role.nombre !== 'empleado') {
      throw new BadRequestException('El operario asignado debe tener el rol empleado');
    }
    return user;
  }

  private requireStaff(user: User): void {
    if (!['admin', 'empleado'].includes(user.role.nombre)) {
      throw new ForbiddenException('Solo el personal puede realizar esta operación');
    }
  }

  private validateTransition(current: PedidoEstado, next: PedidoEstado): void {
    const transitions: Partial<Record<PedidoEstado, PedidoEstado[]>> = {
      [PedidoEstado.PENDIENTE]: [PedidoEstado.EN_PROCESO, PedidoEstado.CANCELADO],
      [PedidoEstado.EN_PROCESO]: [PedidoEstado.TERMINADO, PedidoEstado.CANCELADO],
      [PedidoEstado.TERMINADO]: [PedidoEstado.ENTREGADO],
      [PedidoEstado.COTIZACION]: [],
      [PedidoEstado.COTIZACION_ENVIADA]: [],
      [PedidoEstado.ENTREGADO]: [],
      [PedidoEstado.CANCELADO]: [],
    };
    if (!transitions[current]?.includes(next)) {
      throw new BadRequestException(`Transición de estado inválida: ${current} -> ${next}`);
    }
  }

  private toCents(value: string): number {
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException('Los montos deben ser positivos y tener hasta dos decimales');
    }
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }

  private money(cents: number): string {
    return (cents / 100).toFixed(2);
  }
}
