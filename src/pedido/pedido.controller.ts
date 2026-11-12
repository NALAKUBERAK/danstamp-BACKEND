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
import { PedidoService } from './pedido.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { RequestQuoteDto } from './dto/request-quote.dto';
import { SendQuoteDto } from './dto/send-quote.dto';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'empleado', 'cliente')
export class PedidoController {
  constructor(private readonly service: PedidoService) {}

  @Post()
  @Roles('admin', 'empleado')
  create(@Body() dto: CreatePedidoDto, @Req() request: { user: User }) {
    return this.service.create(dto, request.user);
  }

  @Post('checkout')
  @Roles('cliente')
  checkout(@Body() dto: CheckoutDto, @Req() request: { user: User }) {
    return this.service.checkout(dto, request.user);
  }

  @Post('cotizaciones')
  @Roles('cliente')
  requestQuote(@Body() dto: RequestQuoteDto, @Req() request: { user: User }) {
    return this.service.requestQuote(dto, request.user);
  }

  @Patch(':id/enviar-cotizacion')
  @Roles('admin', 'empleado')
  sendQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuoteDto,
    @Req() request: { user: User },
  ) {
    return this.service.sendQuote(id, dto, request.user);
  }

  @Post(':id/aceptar-cotizacion')
  @Roles('cliente')
  acceptQuote(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.respondToQuote(id, request.user, true);
  }

  @Post(':id/rechazar-cotizacion')
  @Roles('cliente')
  rejectQuote(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.respondToQuote(id, request.user, false);
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
    @Body() dto: UpdatePedidoDto,
    @Req() request: { user: User },
  ) {
    return this.service.update(id, dto, request.user);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.remove(id, request.user);
  }
}
