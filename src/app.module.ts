import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { TipoDocumentoModule } from './tipo-documento/tipo-documento.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DisenoModule } from './diseno/diseno.module';
import { PedidoModule } from './pedido/pedido.module';
import { HistorialPedidoModule } from './historial-pedido/historial-pedido.module';
import { PagoModule } from './pago/pago.module';
import { DetallePedidoModule } from './detalle-pedido/detalle-pedido.module';
import { TipoTrabajoModule } from './tipo-trabajo/tipo-trabajo.module';
import { ProductoModule } from './producto/producto.module';
import { CategoriaModule } from './categoria/categoria.module';
import { MovimientoInventarioModule } from './movimiento-inventario/movimiento-inventario.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    // isGlobal: true hace que ConfigService esté disponible en toda la app
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración de TypeORM con MySQL
    // useFactory permite inyectar ConfigService para leer variables de entorno
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'mysql',
        // getOrThrow lanza un error claro si la variable no existe en .env
        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.getOrThrow<string>('DB_PORT')),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.getOrThrow<string>('DB_DATABASE'),
        // Carga automáticamente las entidades registradas con forFeature()
        autoLoadEntities: true,
        // Las tablas ya están creadas y alineadas en el proyecto.
        // Mantener synchronize desactivado evita modificaciones automáticas destructivas.
        synchronize: false,
      }),
    }),
    UserModule,
    RoleModule,
    TipoDocumentoModule,
    CloudinaryModule,
    DisenoModule,
    PedidoModule,
    HistorialPedidoModule,
    PagoModule,
    DetallePedidoModule,
    TipoTrabajoModule,
    ProductoModule,
    CategoriaModule,
    MovimientoInventarioModule,
    ReportesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}