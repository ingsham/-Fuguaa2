import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const ALLOWED_IMAGES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 5 * 1024 * 1024;

/** Verifies the real file signature, not just the declared MIME type. */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

export async function storePublicImage(buf: Buffer, mime: string): Promise<string> {
  const name = `${randomUUID()}.${ALLOWED_IMAGES[mime]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`products/${name}`, buf, { access: 'public', contentType: mime });
    return blob.url;
  }
  // Local development fallback (Vercel's filesystem is read-only, so set the Blob token there).
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}
