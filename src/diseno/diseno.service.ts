import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diseno, DisenoEstado } from './entities/diseno.entity';
import { CreateDisenoDto } from './dto/create-diseno.dto';
import { UpdateDisenoDto } from './dto/update-diseno.dto';
import { UserService } from '../user/user.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { User } from '../user/entities/user.entity';
import { validateImageUpload } from '../common/validate-image-upload';

@Injectable()
export class DisenoService {
  constructor(
    @InjectRepository(Diseno)
    private readonly repository: Repository<Diseno>,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  findAll(user: User): Promise<Diseno[]> {
    const isClient = user.role.nombre === 'cliente';
    return this.repository.find({
      where: isClient ? { cliente: { id_usuario: user.id_usuario } } : undefined,
      relations: { cliente: true },
      order: { fecha_carga: 'DESC' },
    });
  }

  async findOne(id_diseno: number, user?: User): Promise<Diseno> {
    const diseno = await this.repository.findOne({ where: { id_diseno }, relations: { cliente: true } });
    if (!diseno) throw new NotFoundException(`Diseño con ID ${id_diseno} no encontrado`);
    if (user?.role.nombre === 'cliente' && diseno.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes consultar los diseños que enviaste');
    }
    return diseno;
  }

  async create(dto: CreateDisenoDto, file: Express.Multer.File, userId: number): Promise<Diseno> {
    const formato = validateImageUpload(file);

    const cliente = await this.userService.findOne(userId);
    const upload = await this.cloudinaryService.uploadBuffer(file.buffer, 'image', undefined, 'danstamp/disenos');

    const diseno = this.repository.create({
      nombre: dto.nombre,
      formato: formato.slice(0, 10),
      descripcion: dto.descripcion ?? null,
      observacion: dto.observacion ?? null,
      estado: dto.estado ?? DisenoEstado.ACTIVO,
      archivo_url: upload.secure_url,
      archivo_public_id: upload.public_id,
      cliente,
    });

    return this.repository.save(diseno);
  }

  async update(id_diseno: number, dto: UpdateDisenoDto, file: Express.Multer.File | undefined, user: User): Promise<Diseno> {
    const diseno = await this.findOne(id_diseno);

    if (user.role.nombre === 'cliente' && diseno.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes modificar los diseños que enviaste');
    }

    if (file) {
      const formato = validateImageUpload(file);
      const upload = await this.cloudinaryService.uploadBuffer(file.buffer, 'image', undefined, 'danstamp/disenos');
      const oldPublicId = diseno.archivo_public_id;

      diseno.archivo_url = upload.secure_url;
      diseno.archivo_public_id = upload.public_id;
      diseno.formato = formato;

      if (oldPublicId) await this.cloudinaryService.delete(oldPublicId, 'image');
    } else if (dto.formato !== undefined) {
      throw new BadRequestException('El formato solo se puede cambiar al cargar un archivo');
    }

    const { formato: _formato, ...changes } = dto;
    this.repository.merge(diseno, changes);
    return this.repository.save(diseno);
  }



  async remove(id_diseno: number, user: User): Promise<void> {
    const diseno = await this.findOne(id_diseno);
    if (user.role.nombre === 'cliente' && diseno.cliente.id_usuario !== user.id_usuario) {
      throw new ForbiddenException('Solo puedes borrar los diseños que enviaste');
    }
    if (diseno.archivo_public_id) {
      await this.cloudinaryService.delete(diseno.archivo_public_id, 'image');
    }
    await this.repository.remove(diseno);
  }
}
