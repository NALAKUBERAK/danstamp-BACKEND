import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diseno } from './entities/diseno.entity';
import { DisenoService } from './diseno.service';
import { DisenoController } from './diseno.controller';
import { UserModule } from '../user/user.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Diseno]), UserModule, CloudinaryModule],
  controllers: [DisenoController],
  providers: [DisenoService],
  exports: [DisenoService],
})
export class DisenoModule {}
