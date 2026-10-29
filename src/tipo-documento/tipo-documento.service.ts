import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoDocumento } from './entities/tipo-documento.entity';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

@Injectable()
export class TipoDocumentoService {
  constructor(@InjectRepository(TipoDocumento) private readonly repository: Repository<TipoDocumento>) {}

  findAll(): Promise<TipoDocumento[]> { return this.repository.find(); }

  async findOne(id_tipo_documento: number): Promise<TipoDocumento> {
    const item = await this.repository.findOneBy({ id_tipo_documento });
    if (!item) throw new NotFoundException(`Tipo de documento con ID ${id_tipo_documento} no encontrado`);
    return item;
  }

  async create(dto: CreateTipoDocumentoDto): Promise<TipoDocumento> {
    if (await this.repository.existsBy({ nombre: dto.nombre })) throw new ConflictException('El tipo de documento ya existe');
    return this.repository.save(this.repository.create(dto));
  }

  async update(id: number, dto: UpdateTipoDocumentoDto): Promise<TipoDocumento> {
    const item = await this.findOne(id);
    this.repository.merge(item, dto);
    return this.repository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.repository.remove(item);
  }
}
