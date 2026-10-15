import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../user/entities/user.entity';

/**
 * Guard para verificar roles de usuario
 * Debe usarse DESPUÉS de JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos del decorador @Roles() (método o clase)
    const requiredRoles: string[] | undefined =
      this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Si la ruta no exige roles, se permite el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: User }>();

    // Sin usuario: falta JwtAuthGuard o el token no se envió
    if (!user) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para este recurso');
    }

    return true;
  }
}