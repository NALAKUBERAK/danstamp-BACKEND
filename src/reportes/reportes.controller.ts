import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportesQueryDto } from './reportes-query.dto';
import { ReportesService } from './reportes.service';

@Controller('admin/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('ventas')
  ventas(@Query() query: ReportesQueryDto) {
    return this.service.ventas(query);
  }

  @Get('pedidos-por-estado')
  ordersByState(@Query() query: ReportesQueryDto) {
    return this.service.ordersByState(query);
  }

  @Get('productos-mas-vendidos')
  topProducts(@Query() query: ReportesQueryDto) {
    return this.service.topProducts(query);
  }

  @Get('stock-bajo')
  lowStock() {
    return this.service.findLowStock();
  }
}
