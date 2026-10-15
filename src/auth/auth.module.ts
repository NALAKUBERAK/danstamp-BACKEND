import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Importar UserModule para acceder a UserService
    UserModule,

    // Configurar Passport con 'jwt' como estrategia por defecto
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Configurar JWT leyendo el secreto y la expiración del .env
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Segundos; las variables de entorno siempre llegan como string
          expiresIn: Number(configService.getOrThrow<string>('JWT_EXPIRATION')),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}