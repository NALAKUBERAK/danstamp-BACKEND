import { PartialType } from '@nestjs/mapped-types';
import { CreateDisenoDto } from './create-diseno.dto';

export class UpdateDisenoDto extends PartialType(CreateDisenoDto) {}
