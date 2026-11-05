import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity';
import { PedidoService } from './pedido.service';
import { PedidoController } from './pedido.controller';
import { UserModule } from '../user/user.module';
import { HistorialPedidoModule } from '../historial-pedido/historial-pedido.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido]), UserModule, HistorialPedidoModule],
  controllers: [PedidoController],
  providers: [PedidoService],
  exports: [PedidoService],
})
export class PedidoModule {}
