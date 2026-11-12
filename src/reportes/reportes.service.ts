import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Pedido, PedidoEstado } from '../pedido/entities/pedido.entity';
import { Pago, PagoEstado } from '../pago/entities/pago.entity';
import { DetallePedido } from '../detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from '../producto/entities/producto.entity';
import { ReportesQueryDto } from './reportes-query.dto';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidoRepository: Repository<Pedido>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(DetallePedido)
    private readonly detalleRepository: Repository<DetallePedido>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async ventas(query: ReportesQueryDto) {
    const orders = this.pedidoRepository
      .createQueryBuilder('pedido')
      .where('pedido.estado = :state', { state: PedidoEstado.ENTREGADO });
    const payments = this.pagoRepository
      .createQueryBuilder('pago')
      .innerJoin('pago.pedido', 'pedido')
      .where('pago.estado = :state', { state: PagoEstado.VALIDADO });
    this.applyDateFilter(orders, query);
    this.applyDateFilter(payments, query, 'pedido.fecha_pedido');

    const [orderSummary, paymentSummary] = await Promise.all([
      orders
        .select('COUNT(pedido.id_pedido)', 'orders')
        .addSelect('COALESCE(SUM(pedido.total), 0)', 'grossSales')
        .getRawOne<{ orders: string; grossSales: string }>(),
      payments
        .select('COUNT(pago.id_pago)', 'payments')
        .addSelect('COALESCE(SUM(pago.monto), 0)', 'received')
        .getRawOne<{ payments: string; received: string }>(),
    ]);

    return {
      ordersDelivered: Number(orderSummary?.orders ?? 0),
      grossSales: orderSummary?.grossSales ?? '0.00',
      validatedPayments: Number(paymentSummary?.payments ?? 0),
      paymentsReceived: paymentSummary?.received ?? '0.00',
    };
  }

  async ordersByState(query: ReportesQueryDto) {
    const builder = this.pedidoRepository
      .createQueryBuilder('pedido')
      .select('pedido.estado', 'estado')
      .addSelect('COUNT(pedido.id_pedido)', 'cantidad')
      .groupBy('pedido.estado')
      .orderBy('pedido.estado', 'ASC');
    this.applyDateFilter(builder, query);
    return builder.getRawMany<{ estado: PedidoEstado; cantidad: string }>();
  }

  async topProducts(query: ReportesQueryDto) {
    const builder = this.detalleRepository
      .createQueryBuilder('detalle')
      .innerJoin('detalle.pedido', 'pedido')
      .innerJoin('detalle.producto', 'producto')
      .select('producto.id_producto', 'id_producto')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('SUM(detalle.cantidad)', 'unidades')
      .addSelect('SUM(detalle.subtotal)', 'ventas')
      .andWhere('pedido.estado IN (:...reportableStates)', {
        reportableStates: [
          PedidoEstado.PENDIENTE,
          PedidoEstado.EN_PROCESO,
          PedidoEstado.TERMINADO,
          PedidoEstado.ENTREGADO,
        ],
      })
      .groupBy('producto.id_producto')
      .addGroupBy('producto.nombre')
      .orderBy('SUM(detalle.cantidad)', 'DESC')
      .limit(query.limite);
    this.applyDateFilter(builder, query, 'pedido.fecha_pedido');
    return builder.getRawMany<{
      id_producto: number;
      nombre: string;
      unidades: string;
      ventas: string;
    }>();
  }

  findLowStock() {
    return this.productoRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .where('producto.estado = :active', { active: true })
      .andWhere('producto.stock_minimo > 0')
      .andWhere('producto.stock <= producto.stock_minimo')
      .orderBy('producto.stock', 'ASC')
      .getMany();
  }

  private applyDateFilter<T extends ObjectLiteral>(
    builder: SelectQueryBuilder<T>,
    query: ReportesQueryDto,
    column = 'pedido.fecha_pedido',
  ): void {
    if (query.desde) {
      builder.andWhere(`${column} >= :desde`, { desde: query.desde });
    }
    if (query.hasta) {
      const exclusiveEnd = new Date(`${query.hasta}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      builder.andWhere(`${column} < :hasta`, { hasta: exclusiveEnd });
    }
  }
}
