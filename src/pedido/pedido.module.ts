import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity';
import { PedidoService } from './pedido.service';
import { PedidoController } from './pedido.controller';
import { UserModule } from '../user/user.module';
import { HistorialPedidoModule } from '../historial-pedido/historial-pedido.module';
import { DetallePedido } from '../detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from '../producto/entities/producto.entity';
import { TipoTrabajo } from '../tipo-trabajo/entities/tipo-trabajo.entity';
import { Diseno } from '../diseno/entities/diseno.entity';
import { MovimientoInventario } from '../movimiento-inventario/entities/movimiento-inventario.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pedido,
      DetallePedido,
      Producto,
      TipoTrabajo,
      Diseno,
      MovimientoInventario,
    ]),
    UserModule,
    HistorialPedidoModule,
    NotificationsModule,
  ],
  controllers: [PedidoController],
  providers: [PedidoService],
  exports: [PedidoService],
})
export class PedidoModule {}
