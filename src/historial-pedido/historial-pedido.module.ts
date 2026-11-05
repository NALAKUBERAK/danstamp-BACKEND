import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialPedido } from './entities/historial-pedido.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { HistorialPedidoService } from './historial-pedido.service';
import { HistorialPedidoController } from './historial-pedido.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialPedido, Pedido]), UserModule],
  controllers: [HistorialPedidoController],
  providers: [HistorialPedidoService],
  exports: [HistorialPedidoService],
})
export class HistorialPedidoModule {}
