import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registrar un nuevo usuario
   * Crea el usuario y retorna un token JWT
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Crear el usuario usando el servicio de usuarios
    const user: User = await this.userService.create(registerDto);

    return await this.buildAuthResponse(user);
  }

  /**
   * Login de usuario
   * Valida credenciales y retorna un token JWT
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Buscar usuario por email (incluye password); puede ser null
    const user: User | null = await this.userService.findOneByEmail(email);

    // Verificar si el usuario existe
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Comparar contraseñas
    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el usuario está activo (después de validar la contraseña,
    // para no revelar el estado de cuentas ajenas)
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return await this.buildAuthResponse(user);
  }

  /**
   * Validar un token manualmente y retornar el usuario
   * (útil, por ejemplo, para WebSockets)
   */
  async validateToken(token: string): Promise<User> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const user: User | null = await this.userService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido');
    }

    return user;
  }

  /**
   * Generar token JWT con el payload del usuario
   */
  private async generateToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id_usuario,
      email: user.email,
      role: user.role,
    };

    // Firmar y retornar el token
    return await this.jwtService.signAsync(payload);
  }

  /**
   * Construir la respuesta de register/login (sin la contraseña)
   */
  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const token: string = await this.generateToken(user);

    return {
      user: {
        id: user.id_usuario,
        email: user.email,
        fullName: user.nombres + ' ' + user.apellidos,
        role: user.role,
      },
      token,
    };
  }
}