import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoTrabajoDto } from './create-tipo-trabajo.dto';

export class UpdateTipoTrabajoDto extends PartialType(CreateTipoTrabajoDto) {}
