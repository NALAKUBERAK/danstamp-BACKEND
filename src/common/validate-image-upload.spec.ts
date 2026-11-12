import { getImageFormat } from './image-upload-validation';
import { Readable } from 'node:stream';

function makeFile(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    fieldname: 'archivo',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    stream: Readable.from(buffer),
    destination: '',
    filename: originalname,
    path: '',
    buffer,
  };
}

describe('validateImageUpload', () => {
  it('accepts a PNG when the extension, MIME and signature agree', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(getImageFormat(makeFile('design.png', 'image/png', png))).toBe('png');
  });

  it('rejects SVG uploads', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(getImageFormat(makeFile('design.svg', 'image/svg+xml', svg))).toBeUndefined();
  });

  it('rejects MIME-type spoofing', () => {
    const text = Buffer.from('not an image');
    expect(getImageFormat(makeFile('design.png', 'image/png', text))).toBeUndefined();
  });
});
