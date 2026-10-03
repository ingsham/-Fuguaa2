import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_BYTES, sniffImage, storePublicImage } from '@/lib/upload';

export const runtime = 'nodejs';

// Product photos from the seller's device. ID photos use /api/seller/onboarding (private).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  if (!rateLimit(`upload:${user.id}`, 40, 60_000)) return NextResponse.json({ error: 'Too many uploads. Slow down.' }, { status: 429 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Photo is larger than 5 MB.' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(buf);
  if (!mime) return NextResponse.json({ error: 'Upload a JPG, PNG or WebP image.' }, { status: 415 });
  return NextResponse.json({ url: await storePublicImage(buf, mime) });
}
