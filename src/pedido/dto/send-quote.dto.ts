import { IsDateString, IsNumberString, IsOptional, Matches } from 'class-validator';

export class SendQuoteDto {
  @IsNumberString()
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  total_trabajos: string;

  @IsOptional()
  @IsDateString()
  fecha_entrega_estimada?: string;
}
