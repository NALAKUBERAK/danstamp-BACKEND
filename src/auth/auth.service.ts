import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsService } from '../notifications/notifications.service';

type AttemptState = {
  count: number;
  firstAttempt: number;
};

@Injectable()
export class AuthService {
  private readonly maxAttemptsPerWindow = 5;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly loginAttempts = new Map<string, AttemptState>();
  private readonly registerAttempts = new Map<string, AttemptState>();
  private readonly resetAttempts = new Map<string, AttemptState>();
  private readonly loginIpAttempts = new Map<string, AttemptState>();
  private readonly registerIpAttempts = new Map<string, AttemptState>();
  private readonly resetIpAttempts = new Map<string, AttemptState>();
  private lastRateLimitCleanup = 0;
  private readonly maxTrackedRateLimitKeys = 10_000;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  /**
   * Registrar un nuevo usuario
   * Crea el usuario y retorna un token JWT
   */
  async register(registerDto: RegisterDto, clientIp = 'unknown'): Promise<AuthResponse> {
    const key = registerDto.email.trim().toLowerCase();
    this.enforceRateLimit(this.registerAttempts, key, 'registro');
    this.enforceRateLimit(
      this.registerIpAttempts,
      clientIp,
      'registro',
      20,
    );

    let user: User;
    try {
      user = await this.userService.create(registerDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException('No se pudo completar el registro con los datos proporcionados');
      }
      throw error;
    }
    this.registerAttempts.delete(key);

    return await this.buildAuthResponse(user);
  }

  /**
   * Login de usuario
   * Valida credenciales y retorna un token JWT
   */
  async login(loginDto: LoginDto, clientIp = 'unknown'): Promise<AuthResponse> {
    const email = loginDto.email.trim().toLowerCase();
    const { password } = loginDto;
    const key = email;

    this.enforceRateLimit(this.loginAttempts, key, 'inicio de sesión');
    this.enforceRateLimit(this.loginIpAttempts, clientIp, 'inicio de sesión', 30);

    const user: User | null = await this.userService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid: boolean = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      this.loginAttempts.delete(key);
      throw new UnauthorizedException('Usuario inactivo');
    }

    this.loginAttempts.delete(key);
    return await this.buildAuthResponse(user);
  }

  async requestPasswordReset(email: string, clientIp: string): Promise<{ message: string }> {
    this.notificationsService.assertSmtpConfigured();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new HttpException(
        'La URL del frontend no está configurada para recuperación de contraseña',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    this.enforceRateLimit(this.resetAttempts, normalizedEmail, 'recuperación de contraseña');
    this.enforceRateLimit(this.resetIpAttempts, clientIp, 'recuperación de contraseña', 10);

    const user = await this.userService.findOneByEmail(normalizedEmail);
    if (user?.isActive) {
      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await this.resetTokenRepository.manager.transaction(async (manager) => {
        const tokenRepository = manager.getRepository(PasswordResetToken);
        await tokenRepository.delete({ user: { id_usuario: user.id_usuario } });
        await tokenRepository.save(tokenRepository.create({
          user,
          token_hash: tokenHash,
          expires_at: expiresAt,
        }));
      });

      const resetUrl = new URL('/reset-password', frontendUrl);
      resetUrl.searchParams.set('token', rawToken);
      await this.notificationsService.sendPasswordReset(user.email, resetUrl.toString());
    }

    return {
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const now = new Date();

    await this.resetTokenRepository.manager.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(PasswordResetToken);
      const tokenRecord = await tokenRepository.findOne({
        where: { token_hash: tokenHash, expires_at: MoreThan(now) },
        relations: { user: true },
      });
      if (!tokenRecord || !tokenRecord.user.isActive) {
        throw new UnauthorizedException('El enlace de recuperación no es válido o expiró');
      }

      const deleted = await tokenRepository.delete({
        id: tokenRecord.id,
        expires_at: MoreThan(now),
      });
      if (deleted.affected !== 1) {
        throw new UnauthorizedException('El enlace de recuperación no es válido o expiró');
      }

      await manager.update(
        User,
        { id_usuario: tokenRecord.user.id_usuario },
        { password: passwordHash },
      );
      await tokenRepository.delete({ user: { id_usuario: tokenRecord.user.id_usuario } });
    });
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

  private enforceRateLimit(
    attempts: Map<string, AttemptState>,
    key: string,
    action: string,
    maxAttempts = this.maxAttemptsPerWindow,
  ): void {
    const now = Date.now();
    this.cleanupExpiredAttempts(now);
    const current = attempts.get(key);

    if (!current || now - current.firstAttempt > this.windowMs) {
      if (attempts.size >= this.maxTrackedRateLimitKeys) {
        throw new HttpException(
          'El servicio está ocupado. Inténtalo de nuevo más tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      attempts.set(key, { count: 1, firstAttempt: now });
      return;
    }

    if (current.count >= maxAttempts) {
      throw new HttpException(
        `Demasiados intentos de ${action}. Inténtalo de nuevo en 15 minutos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    attempts.set(key, { count: current.count + 1, firstAttempt: current.firstAttempt });
  }

  private cleanupExpiredAttempts(now: number): void {
    if (now - this.lastRateLimitCleanup < 60_000) return;
    for (const attempts of [
      this.loginAttempts,
      this.registerAttempts,
      this.resetAttempts,
      this.loginIpAttempts,
      this.registerIpAttempts,
      this.resetIpAttempts,
    ]) {
      for (const [key, state] of attempts) {
        if (now - state.firstAttempt > this.windowMs) attempts.delete(key);
      }
    }
    this.lastRateLimitCleanup = now;
  }

  /**
   * Generar token JWT con el payload del usuario
   */
  private async generateToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id_usuario,
      email: user.email,
      role: user.role.nombre,
    };

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
        fullName: `${user.nombres} ${user.apellidos}`,
        role: user.role.nombre,
      },
      token,
    };
  }
}