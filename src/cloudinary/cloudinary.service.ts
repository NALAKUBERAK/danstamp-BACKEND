import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto',
    publicId?: string,
    folder?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder ?? this.configService.get<string>('CLOUDINARY_FOLDER', 'danstamp'),
          resource_type: resourceType,
          public_id: publicId,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary no retornó un resultado'));
          resolve(result);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async delete(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<unknown> {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
