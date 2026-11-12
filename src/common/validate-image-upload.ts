import { BadRequestException } from '@nestjs/common';
import { getImageFormat } from './image-upload-validation';

export function validateImageUpload(
  file: Express.Multer.File | undefined,
  maxSizeBytes = 5 * 1024 * 1024,
): string {
  const format = getImageFormat(file, maxSizeBytes);
  if (!format) {
    throw new BadRequestException('Imagen inválida; solo se permiten JPG, PNG o WEBP de hasta 5 MB');
  }
  return format;
}
