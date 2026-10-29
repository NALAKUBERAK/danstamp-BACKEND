import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { RoleModule } from '../role/role.module';
import { TipoDocumentoModule } from '../tipo-documento/tipo-documento.module';

@Module({
  // Importar el repositorio de User
  imports: [TypeOrmModule.forFeature([User]), RoleModule, TipoDocumentoModule],
  controllers: [UserController],
  providers: [UserService],
  // Exportar el servicio para usarlo en otros módulos (como Auth)
  exports: [UserService],
})
export class UserModule {}