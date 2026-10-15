import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { User } from '../../user/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      // Extraer el token del header Authorization como Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // No ignorar la expiración del token
      ignoreExpiration: false,
      // Secreto para verificar el token
      // getOrThrow devuelve string (nunca undefined), como exige passport-jwt
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Método que se ejecuta automáticamente después de validar el token
   * El payload ya viene decodificado y verificado por Passport
   * Lo que retorna se asigna a request.user
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user: User | null = await this.userService.findById(payload.sub);

    // El token es válido pero el usuario fue eliminado
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return user;
  }
}