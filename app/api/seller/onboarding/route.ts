import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { encryptBuffer, encryptText } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import { sniffImage } from '@/lib/upload';

export const runtime = 'nodejs';
const MAX_ID_BYTES = 4 * 1024 * 1024;

const schema = z.object({
  shopName: z.string().trim().min(2).max(80),
  story: z.string().trim().max(2000).optional(),
  region: z.string().trim().max(60).optional(),
  idType: z.enum(['GHANA_CARD', 'PASSPORT']),
  idNumber: z.string().trim().min(5).max(30).regex(/^[A-Za-z0-9-]+$/, 'ID number can only contain letters, numbers and dashes'),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'SELLER') return NextResponse.json({ error: 'Seller account required' }, { status: 403 });
  if (!rateLimit(`onboard:${user.id}`, 5, 10 * 60_000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });

  const form = await req.formData();
  const parsed = schema.safeParse({
    shopName: form.get('shopName'), story: form.get('story') || undefined, region: form.get('region') || undefined,
    idType: form.get('idType'), idNumber: form.get('idNumber'),
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const file = form.get('idPhoto');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Upload a photo of your ID from your device.' }, { status: 400 });
  if (file.size > MAX_ID_BYTES) return NextResponse.json({ error: 'ID photo is larger than 4 MB.' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(buf);
  if (!mime) return NextResponse.json({ error: 'ID photo must be a JPG, PNG or WebP image.' }, { status: 415 });

  const d = parsed.data;
  const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  if (existing?.verificationStatus === 'VERIFIED') return NextResponse.json({ error: 'You are already verified.' }, { status: 409 });

  const data = {
    shopName: d.shopName, story: d.story ?? null, region: d.region ?? null, idType: d.idType,
    idNumberEnc: encryptText(d.idNumber), verificationStatus: 'PENDING' as const, rejectionReason: null, submittedAt: new Date(),
  };
  const profile = await db.sellerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  await db.idDocument.upsert({
    where: { sellerId: profile.id },
    create: { sellerId: profile.id, mimeType: mime, dataEnc: encryptBuffer(buf) },
    update: { mimeType: mime, dataEnc: encryptBuffer(buf) },
  });
  return NextResponse.json({ ok: true });
}
