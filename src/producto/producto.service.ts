import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Categoria } from '../categoria/entities/categoria.entity';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateImageUpload } from '../common/validate-image-upload';

type CatalogProduct = Omit<Producto, 'stock' | 'stock_minimo' | 'imagen_public_id'> & {
  disponible: boolean;
};

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<CatalogProduct[]> {
    const products = await this.repository.find({
      where: { estado: true },
      relations: { categoria: true },
      order: { nombre: 'ASC' },
    });
    return products.map((product) => this.toCatalogProduct(product));
  }

  findAllForAdmin(): Promise<Producto[]> {
    return this.repository.find({
      relations: { categoria: true },
      order: { nombre: 'ASC' },
    });
  }

  async findCatalog(query: CatalogQueryDto): Promise<{
    items: CatalogProduct[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      Number(query.minPrice) > Number(query.maxPrice)
    ) {
      throw new BadRequestException('El precio mínimo no puede superar el precio máximo');
    }

    const builder = this.repository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .where('producto.estado = :active', { active: true })
      .andWhere('(categoria.id_categoria IS NULL OR categoria.estado = :categoryActive)', {
        categoryActive: true,
      });

    if (query.search) {
      builder.andWhere(
        '(LOWER(producto.nombre) LIKE :search OR LOWER(producto.codigo) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` },
      );
    }
    if (query.categoryId !== undefined) {
      builder.andWhere('categoria.id_categoria = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.minPrice !== undefined) {
      builder.andWhere('producto.precio_base >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      builder.andWhere('producto.precio_base <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const [items, total] = await builder
      .orderBy('producto.nombre', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: items.map((product) => this.toCatalogProduct(product)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id_producto: number): Promise<CatalogProduct> {
    const producto = await this.repository.findOne({
      where: { id_producto, estado: true },
      relations: { categoria: true },
    });
    if (!producto) throw new NotFoundException(`Producto con ID ${id_producto} no encontrado`);
    return this.toCatalogProduct(producto);
  }

  async findOneForAdmin(id_producto: number): Promise<Producto> {
    const producto = await this.repository.findOne({
      where: { id_producto },
      relations: { categoria: true },
    });
    if (!producto) throw new NotFoundException(`Producto con ID ${id_producto} no encontrado`);
    return producto;
  }

  async create(dto: CreateProductoDto, file?: Express.Multer.File): Promise<Producto> {
    const exists = await this.repository.existsBy({ codigo: dto.codigo });
    if (exists) throw new ConflictException('Ya existe un producto con ese código');

    let categoria: Categoria | null = null;
    if (dto.id_categoria !== undefined) {
      categoria = await this.categoriaRepository.findOne({ where: { id_categoria: dto.id_categoria } });
      if (!categoria) throw new NotFoundException(`Categoría con ID ${dto.id_categoria} no encontrada`);
      if (!categoria.estado) throw new ConflictException('No puedes usar una categoría inactiva');
    }

    let imagenUrl = dto.imagen_url ?? null;
    let imagenPublicId: string | null = null;
    if (file) {
      validateImageUpload(file);
      const upload = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'image',
        undefined,
        'danstamp/productos',
      );
      imagenUrl = upload.secure_url;
      imagenPublicId = upload.public_id;
    }

    const producto = this.repository.create({
      categoria,
      codigo: dto.codigo,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      material: dto.material ?? null,
      color: dto.color ?? null,
      talla: dto.talla ?? null,
      precio_base: dto.precio_base ?? '0.00',
      stock: dto.stock ?? 0,
      stock_minimo: dto.stock_minimo ?? 0,
      imagen_url: imagenUrl,
      imagen_public_id: imagenPublicId,
      estado: dto.estado ?? true,
    });
    return this.repository.save(producto);
  }

  async update(
    id_producto: number,
    dto: UpdateProductoDto,
    file?: Express.Multer.File,
  ): Promise<Producto> {
    const producto = await this.findOneForAdmin(id_producto);

    if (dto.codigo !== undefined && dto.codigo !== producto.codigo) {
      const exists = await this.repository.existsBy({ codigo: dto.codigo });
      if (exists) throw new ConflictException('Ya existe un producto con ese código');
    }

    const changes = { ...dto };
    if (changes.id_categoria !== undefined) {
      const categoria = await this.categoriaRepository.findOne({ where: { id_categoria: changes.id_categoria } });
      if (!categoria) throw new NotFoundException(`Categoría con ID ${changes.id_categoria} no encontrada`);
      if (!categoria.estado) throw new ConflictException('No puedes usar una categoría inactiva');
      producto.categoria = categoria;
      delete changes.id_categoria;
    }

    if (file) {
      validateImageUpload(file);
      const upload = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        'image',
        undefined,
        'danstamp/productos',
      );
      producto.imagen_url = upload.secure_url;
      producto.imagen_public_id = upload.public_id;
      delete changes.imagen_url;
    }

    this.repository.merge(producto, changes);
    return this.repository.save(producto);
  }

  async remove(id_producto: number): Promise<void> {
    const producto = await this.findOneForAdmin(id_producto);
    producto.estado = false;
    await this.repository.save(producto);
  }

  private toCatalogProduct(product: Producto): CatalogProduct {
    const {
      stock,
      stock_minimo: _stock_minimo,
      imagen_public_id: _imagen_public_id,
      ...publicFields
    } = product;
    return { ...publicFields, disponible: stock > 0 };
  }
}
