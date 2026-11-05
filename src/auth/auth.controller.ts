import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { AuthResponse } from './interfaces/auth-response.interface';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { UpdateProfileDto } from '../user/dto/update-profile.dto';
import { ChangePasswordDto } from '../user/dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * POST /auth/register
   * Registrar un nuevo usuario (responde 201 Created)
   */
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Iniciar sesión (responde 200 OK, no se crea ningún recurso)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * GET /auth/profile
   * Obtener perfil del usuario autenticado
   * Ruta protegida con JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: User): { user: User } {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@GetUser() user: User, @Body() dto: UpdateProfileDto): Promise<User> {
    return this.userService.updateProfile(user.id_usuario, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@GetUser() user: User, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.userService.changePassword(user.id_usuario, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(): { message: string } {
    return { message: 'Sesión cerrada. Elimina el token JWT en el cliente.' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateAccount(@GetUser() user: User): Promise<void> {
    return this.userService.deactivateAccount(user.id_usuario);
  }
}