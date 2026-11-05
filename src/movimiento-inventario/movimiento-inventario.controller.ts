import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../user/entities/user.entity';
import { MovimientoInventarioService } from './movimiento-inventario.service';
import { CreateMovimientoInventarioDto } from './dto/create-movimiento-inventario.dto';
import { UpdateMovimientoInventarioDto } from './dto/update-movimiento-inventario.dto';

@Controller('movimientos-inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientoInventarioController {
  constructor(private readonly service: MovimientoInventarioService) {}

  @Post()
  @Roles('admin', 'empleado')
  create(@Body() dto: CreateMovimientoInventarioDto, @Req() request: { user: User }) {
    return this.service.create(dto, request.user);
  }

  @Get()
  @Roles('admin', 'empleado', 'cliente')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('admin', 'empleado', 'cliente')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'empleado')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMovimientoInventarioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
