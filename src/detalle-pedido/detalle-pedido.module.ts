import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { Diseno } from '../diseno/entities/diseno.entity';
import { TipoTrabajo } from '../tipo-trabajo/entities/tipo-trabajo.entity';
import { Producto } from '../producto/entities/producto.entity';
import { DetallePedidoService } from './detalle-pedido.service';
import { DetallePedidoController } from './detalle-pedido.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DetallePedido, Pedido, Diseno, TipoTrabajo, Producto])],
  controllers: [DetallePedidoController],
  providers: [DetallePedidoService],
  exports: [DetallePedidoService],
})
export class DetallePedidoModule {}
