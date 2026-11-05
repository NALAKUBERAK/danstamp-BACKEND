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
import { PagoService } from './pago.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'empleado', 'cliente')
export class PagoController {
  constructor(private readonly service: PagoService) {}

  @Post()
  create(@Body() dto: CreatePagoDto, @Req() request: { user: User }) {
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
    @Body() dto: UpdatePagoDto,
    @Req() request: { user: User },
  ) {
    return this.service.update(id, dto, request.user);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
