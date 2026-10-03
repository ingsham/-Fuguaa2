import { put } from '@vercel/blob';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export { sniffImage } from './image-sniff';
export const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Vercel serverless functions reject request bodies over ~4.5 MB, so stay under it.
// The browser shrinks photos before upload (see lib/client-image.ts).
export const MAX_BYTES = 4_000_000;

export async function storePublicImage(buf: Buffer, mime: string): Promise<string> {
  const name = `${randomUUID()}.${EXT[mime]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`products/${name}`, buf, { access: 'public', contentType: mime });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error('BLOB_READ_WRITE_TOKEN is not set. Create a Blob store in Vercel.');
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}
