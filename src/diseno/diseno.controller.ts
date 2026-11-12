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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DisenoService } from './diseno.service';
import { CreateDisenoDto } from './dto/create-diseno.dto';
import { UpdateDisenoDto } from './dto/update-diseno.dto';
import { User } from '../user/entities/user.entity';

@Controller('disenos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'empleado', 'cliente')
export class DisenoController {
  constructor(private readonly service: DisenoService) {}

  @Post()
  @Roles('cliente')
  @UseInterceptors(FileInterceptor('archivo', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ||
        /\.svg$/i.test(file.originalname)
      ) {
        return callback(new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP'), false);
      }
      callback(null, true);
    },
  }))
  create(
    @Body() dto: CreateDisenoDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: { user: User },
  ) {
    return this.service.create(dto, file, request.user.id_usuario);
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
  @UseInterceptors(FileInterceptor('archivo', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ||
        /\.svg$/i.test(file.originalname)
      ) {
        return callback(new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP'), false);
      }
      callback(null, true);
    },
  }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisenoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: { user: User },
  ) {
    return this.service.update(id, dto, file, request.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: { user: User }) {
    return this.service.remove(id, request.user);
  }
}
