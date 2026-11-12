import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repository: Repository<Categoria>,
  ) {}

  findAll(): Promise<Categoria[]> {
    return this.repository.find({
      where: { estado: true },
      order: { nombre: 'ASC' },
    });
  }

  findAllForAdmin(): Promise<Categoria[]> {
    return this.repository.find({
      relations: { productos: true },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id_categoria: number): Promise<Categoria> {
    const categoria = await this.repository.findOne({
      where: { id_categoria, estado: true },
    });
    if (!categoria) throw new NotFoundException(`Categoría con ID ${id_categoria} no encontrada`);
    return categoria;
  }

  async create(dto: CreateCategoriaDto): Promise<Categoria> {
    const exists = await this.repository.existsBy({ nombre: dto.nombre });
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre');

    const categoria = this.repository.create({
      nombre: dto.nombre,
      description: dto.description ?? null,
      estado: dto.estado ?? true,
    });
    return this.repository.save(categoria);
  }

  async update(id_categoria: number, dto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOneForAdmin(id_categoria);

    if (dto.nombre !== undefined && dto.nombre !== categoria.nombre) {
      const exists = await this.repository.existsBy({ nombre: dto.nombre });
      if (exists) throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    this.repository.merge(categoria, dto);
    return this.repository.save(categoria);
  }

  async remove(id_categoria: number): Promise<void> {
    const categoria = await this.findOneForAdmin(id_categoria);
    await this.repository.remove(categoria);
  }

  private async findOneForAdmin(id_categoria: number): Promise<Categoria> {
    const categoria = await this.repository.findOne({
      where: { id_categoria },
    });
    if (!categoria) throw new NotFoundException(`Categoría con ID ${id_categoria} no encontrada`);
    return categoria;
  }
}
