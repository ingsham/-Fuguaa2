import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ensureSellerProfileFor, productSchema } from '@/lib/products';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const profile = await ensureSellerProfileFor(user);
  if (!profile || profile.verificationStatus !== 'VERIFIED') return NextResponse.json({ error: 'Your shop must be verified before you can list smocks.' }, { status: 403 });
  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const product = await db.product.create({ data: { ...parsed.data, sellerId: profile.id } });
  return NextResponse.json({ id: product.id });
}
