import { PartialType } from '@nestjs/mapped-types';
import { CreateHistorialPedidoDto } from './create-historial-pedido.dto';

export class UpdateHistorialPedidoDto extends PartialType(CreateHistorialPedidoDto) {}
