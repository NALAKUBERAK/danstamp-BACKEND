import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RoleName } from '../role/role.enum';
import { RoleService } from '../role/role.service';
import { TipoDocumentoService } from '../tipo-documento/tipo-documento.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  // Número de rondas de encriptación de bcrypt
  private readonly saltRounds = 10;

  constructor(
    // Inyección del repositorio de User
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
    private readonly tipoDocumentoService: TipoDocumentoService,
  ) {}

  /**
   * Crear un nuevo usuario
   * Encripta la contraseña antes de guardarla
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const emailTaken: boolean = await this.userRepository.existsBy({
      email: createUserDto.email,
    });
    if (emailTaken) {
      throw new ConflictException('El email ya está registrado');
    }

    const documentTaken: boolean = await this.userRepository.existsBy({
      numero_documento: createUserDto.numero_documento,
    });
    if (documentTaken) {
      throw new ConflictException('El número de documento ya está registrado');
    }

    const phoneTaken: boolean = await this.userRepository.existsBy({
      telefono: createUserDto.telefono,
    });
    if (phoneTaken) {
      throw new ConflictException('El teléfono ya está registrado');
    }

    const tipoDocumento = await this.tipoDocumentoService.findOne(createUserDto.id_tipo_documento);
    if (!tipoDocumento) throw new NotFoundException('Tipo de documento no encontrado');

    // Todo usuario creado por este servicio comienza con el rol cliente.
    const role = await this.roleService.findByName(RoleName.CLIENTE);
    if (!role) throw new NotFoundException('El rol cliente no existe. Debe inicializarse la tabla de roles.');

    // Encriptar la contraseña
    const hashedPassword: string = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );

    // Crear nueva instancia de usuario
    const userData = { ...createUserDto } as Partial<CreateUserDto>;
    delete userData.id_tipo_documento;
    const user: User = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      tipoDocumento,
      role,
    });

    // Guardar en la base de datos
    return await this.userRepository.save(user);
  }

  /**
   * Obtener todos los usuarios
   * No incluye las contraseñas (select: false en la entidad)
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find({ relations: { tipoDocumento: true, role: true } });
  }

  /**
   * Obtener un usuario por ID
   * Lanza 404 si no existe (para uso en controladores)
   */
  async findOne(id_usuario: number): Promise<User> {
    const user: User | null = await this.userRepository.findOne({ where: { id_usuario }, relations: { tipoDocumento: true, role: true } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id_usuario} no encontrado`);
    }

    return user;
  }

  /**
   * Buscar un usuario por ID sin lanzar excepción
   * Devuelve null si no existe (lo usa la estrategia JWT)
   */
  async findById(id_usuario: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id_usuario }, relations: { tipoDocumento: true, role: true } });
  }

  /**
   * Buscar usuario por email
   * Incluye la contraseña (solo para autenticación)
   * Devuelve null si el email no está registrado
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      select: {
        id_usuario: true,
        email: true,
        password: true,
        numero_documento: true,
        telefono: true,
        direccion: true,
        nombres: true,
        apellidos: true,
        isActive: true,
        tipoDocumento: { id_tipo_documento: true, nombre: true },
        role: { id_role: true, nombre: true, descripcion: true },
      },
      relations: { tipoDocumento: true, role: true },
    });
  }

  /**
   * Actualizar un usuario
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user: User = await this.findOne(id);

    // Si se cambia el email, verificar que no pertenezca a otro usuario
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailTaken: boolean = await this.userRepository.existsBy({
        email: updateUserDto.email,
      });
      if (emailTaken) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateUserDto.numero_documento !== undefined) {
      const documentTaken: boolean = await this.userRepository.existsBy({
        numero_documento: updateUserDto.numero_documento,
        id_usuario: Not(id),
      });
      if (documentTaken) {
        throw new ConflictException('El número de documento ya está registrado');
      }
    }

    if (updateUserDto.telefono !== undefined) {
      const phoneTaken: boolean = await this.userRepository.existsBy({
        telefono: updateUserDto.telefono,
        id_usuario: Not(id),
      });
      if (phoneTaken) {
        throw new ConflictException('El teléfono ya está registrado');
      }
    }

    // Copia de los cambios para no modificar el DTO recibido
    const changes: UpdateUserDto = { ...updateUserDto };

    if (changes.id_tipo_documento !== undefined) {
      const tipoDocumento = await this.tipoDocumentoService.findOne(changes.id_tipo_documento);
      if (!tipoDocumento) throw new NotFoundException('Tipo de documento no encontrado');
      user.tipoDocumento = tipoDocumento;
      delete changes.id_tipo_documento;
    }

    if (changes.id_role !== undefined) {
      const role = await this.roleService.findOne(changes.id_role);
      if (!role) throw new NotFoundException('Rol no encontrado');
      user.role = role;
      delete changes.id_role;
    }

    // Si se actualiza la contraseña, encriptarla
    if (changes.password) {
      changes.password = await bcrypt.hash(changes.password, this.saltRounds);
    }

    // Combinar los cambios con la entidad existente
    this.userRepository.merge(user, changes);

    return await this.userRepository.save(user);
  }

  /**
   * Eliminar un usuario (borrado físico del registro)
   */
  async remove(id: number): Promise<void> {
    const user: User = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}