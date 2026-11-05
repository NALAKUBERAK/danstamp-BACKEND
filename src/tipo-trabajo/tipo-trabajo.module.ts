import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoTrabajo } from './entities/tipo-trabajo.entity';
import { TipoTrabajoService } from './tipo-trabajo.service';
import { TipoTrabajoController } from './tipo-trabajo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipoTrabajo])],
  controllers: [TipoTrabajoController],
  providers: [TipoTrabajoService],
  exports: [TipoTrabajoService],
})
export class TipoTrabajoModule {}
