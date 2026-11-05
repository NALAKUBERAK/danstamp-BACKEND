import { PartialType } from '@nestjs/mapped-types';
import { CreateMovimientoInventarioDto } from './create-movimiento-inventario.dto';

export class UpdateMovimientoInventarioDto extends PartialType(CreateMovimientoInventarioDto) {}
