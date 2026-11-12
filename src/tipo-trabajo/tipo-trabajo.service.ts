import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoTrabajo } from './entities/tipo-trabajo.entity';
import { CreateTipoTrabajoDto, TipoTrabajoEstado } from './dto/create-tipo-trabajo.dto';
import { UpdateTipoTrabajoDto } from './dto/update-tipo-trabajo.dto';

@Injectable()
export class TipoTrabajoService {
  constructor(
    @InjectRepository(TipoTrabajo)
    private readonly repository: Repository<TipoTrabajo>,
  ) {}

  findAll(): Promise<TipoTrabajo[]> {
    return this.repository.find({ where: { estado: 'activo' }, order: { nombre: 'ASC' } });
  }

  findAllForAdmin(): Promise<TipoTrabajo[]> {
    return this.repository.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id_tipo_trabajo: number): Promise<TipoTrabajo> {
    const tipoTrabajo = await this.repository.findOne({ where: { id_tipo_trabajo, estado: 'activo' } });
    if (!tipoTrabajo) {
      throw new NotFoundException(`Tipo de trabajo con ID ${id_tipo_trabajo} no encontrado`);
    }
    return tipoTrabajo;
  }

  async create(dto: CreateTipoTrabajoDto): Promise<TipoTrabajo> {
    const exists = await this.repository.existsBy({ nombre: dto.nombre });
    if (exists) throw new ConflictException('Ya existe un tipo de trabajo con ese nombre');

    const tipoTrabajo = this.repository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      costo: dto.costo ?? '0.00',
      tiempo_estimado_dias: dto.tiempo_estimado_dias ?? null,
      estado: dto.estado ?? TipoTrabajoEstado.ACTIVO,
    });
    return this.repository.save(tipoTrabajo);
  }

  async update(id_tipo_trabajo: number, dto: UpdateTipoTrabajoDto): Promise<TipoTrabajo> {
    const tipoTrabajo = await this.findOneForAdmin(id_tipo_trabajo);

    if (dto.nombre !== undefined && dto.nombre !== tipoTrabajo.nombre) {
      const exists = await this.repository.existsBy({ nombre: dto.nombre });
      if (exists) throw new ConflictException('Ya existe un tipo de trabajo con ese nombre');
    }

    this.repository.merge(tipoTrabajo, {
      ...dto,
      descripcion: dto.descripcion ?? tipoTrabajo.descripcion,
      costo: dto.costo ?? tipoTrabajo.costo,
      tiempo_estimado_dias: dto.tiempo_estimado_dias ?? tipoTrabajo.tiempo_estimado_dias,
    });
    return this.repository.save(tipoTrabajo);
  }

  async remove(id_tipo_trabajo: number): Promise<void> {
    const tipoTrabajo = await this.findOneForAdmin(id_tipo_trabajo);
    await this.repository.remove(tipoTrabajo);
  }

  private async findOneForAdmin(id_tipo_trabajo: number): Promise<TipoTrabajo> {
    const tipoTrabajo = await this.repository.findOne({ where: { id_tipo_trabajo } });
    if (!tipoTrabajo) {
      throw new NotFoundException(`Tipo de trabajo con ID ${id_tipo_trabajo} no encontrado`);
    }
    return tipoTrabajo;
  }
}
