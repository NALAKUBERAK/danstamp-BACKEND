import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../user/entities/user.entity';
import { DetallePedidoService } from './detalle-pedido.service';
import { CreateDetallePedidoDto } from './dto/create-detalle-pedido.dto';
import { UpdateDetallePedidoDto } from './dto/update-detalle-pedido.dto';

@Controller('detalle-pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'empleado', 'cliente')
export class DetallePedidoController {
  constructor(private readonly service: DetallePedidoService) {}

  @Post()
  @Roles('admin', 'empleado')
  create(@Body() dto: CreateDetallePedidoDto, @Req() request: { user: User }) {
    return this.service.create(dto, request.user);
  }

  @Get()
  findAll(@Req() request: { user: User }) {
    return this.service.findAll(request.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDetallePedidoDto,
    @Req() request: { user: User },
  ) {
    return this.service.update(id, dto, request.user);
  }

  @Delete(':id')
  @Roles('admin', 'empleado')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.remove(id, request.user);
  }
}
