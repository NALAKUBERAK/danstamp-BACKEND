const imageFormats: Record<string, { extension: string[]; format: string }> = {
  'image/jpeg': { extension: ['jpg', 'jpeg'], format: 'jpg' },
  'image/png': { extension: ['png'], format: 'png' },
  'image/webp': { extension: ['webp'], format: 'webp' },
};

export function getImageFormat(
  file: Express.Multer.File | undefined,
  maxSizeBytes = 5 * 1024 * 1024,
): string | undefined {
  if (!file) return undefined;

  const definition = imageFormats[file.mimetype];
  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (
    !definition ||
    !definition.extension.includes(extension) ||
    file.size > maxSizeBytes ||
    !matchesImageSignature(file.buffer, file.mimetype)
  ) {
    return undefined;
  }
  return definition.format;
}

function matchesImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  return mimeType === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
}
