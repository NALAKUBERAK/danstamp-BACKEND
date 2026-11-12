import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PedidoLineDto } from './pedido-line.dto';

export class RequestQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  direccion_entrega: string;

  @IsOptional()
  @IsDateString()
  fecha_entrega_estimada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PedidoLineDto)
  items: PedidoLineDto[];
}
