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
import { HistorialPedidoService } from './historial-pedido.service';
import { CreateHistorialPedidoDto } from './dto/create-historial-pedido.dto';
import { UpdateHistorialPedidoDto } from './dto/update-historial-pedido.dto';

@Controller('historial-pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'empleado', 'cliente')
export class HistorialPedidoController {
  constructor(private readonly service: HistorialPedidoService) {}

  @Post()
  @Roles('admin', 'empleado')
  create(@Body() dto: CreateHistorialPedidoDto, @Req() request: { user: User }) {
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
  @Roles('admin', 'empleado')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHistorialPedidoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
