import {
  BadRequestException,
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('comprobante', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
        return callback(new BadRequestException('El comprobante debe ser JPG, PNG, WEBP o PDF'), false);
      }
      callback(null, true);
    },
  }))
  create(
    @Body() dto: CreatePagoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: { user: User },
  ) {
    return this.service.create(dto, request.user, file);
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

  @Get(':id/comprobante')
  getReceipt(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.getReceipt(id, request.user);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
