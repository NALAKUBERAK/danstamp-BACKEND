import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { RoleName } from './role.enum';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService implements OnModuleInit {
  constructor(@InjectRepository(Role) private readonly repository: Repository<Role>) {}

  async onModuleInit(): Promise<void> {
    const defaults: Record<RoleName, string> = {
      [RoleName.ADMIN]: 'Acceso administrativo completo',
      [RoleName.EMPLEADO]: 'Acceso operativo para empleados',
      [RoleName.CLIENTE]: 'Acceso estándar para clientes',
    };
    for (const [nombre, descripcion] of Object.entries(defaults) as [RoleName, string][]) {
      const exists = await this.repository.existsBy({ nombre });
      if (!exists) await this.repository.save(this.repository.create({ nombre, descripcion }));
    }
  }

  findAll(): Promise<Role[]> { return this.repository.find({ relations: { usuarios: true } }); }

  async findOne(id_role: number): Promise<Role> {
    const role = await this.repository.findOne({ where: { id_role }, relations: { usuarios: true } });
    if (!role) throw new NotFoundException(`Rol con ID ${id_role} no encontrado`);
    return role;
  }

  async findByName(nombre: RoleName): Promise<Role | null> { return this.repository.findOneBy({ nombre }); }

  async create(dto: CreateRoleDto): Promise<Role> {
    if (await this.repository.existsBy({ nombre: dto.nombre })) throw new ConflictException('El rol ya existe');
    return this.repository.save(this.repository.create(dto));
  }

  async update(id_role: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id_role);
    this.repository.merge(role, dto);
    return this.repository.save(role);
  }

  async remove(id_role: number): Promise<void> {
    const role = await this.findOne(id_role);
    await this.repository.remove(role);
  }
}
