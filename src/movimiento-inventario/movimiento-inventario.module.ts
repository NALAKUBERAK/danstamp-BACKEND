import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { Producto } from '../producto/entities/producto.entity';
import { Pedido } from '../pedido/entities/pedido.entity';
import { MovimientoInventarioService } from './movimiento-inventario.service';
import { MovimientoInventarioController } from './movimiento-inventario.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoInventario, Producto, Pedido]), UserModule],
  controllers: [MovimientoInventarioController],
  providers: [MovimientoInventarioService],
  exports: [MovimientoInventarioService],
})
export class MovimientoInventarioModule {}
