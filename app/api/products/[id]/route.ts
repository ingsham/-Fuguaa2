import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { productSchema } from '@/lib/products';

async function authorize(id: string) {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) };
  const product = await db.product.findUnique({ where: { id }, include: { seller: true } });
  if (!product) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  if (user.role !== 'ADMIN' && product.seller.userId !== user.id) return { error: NextResponse.json({ error: 'Not your listing' }, { status: 403 }) };
  return { user, product };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  if (typeof body.active === 'boolean' && Object.keys(body).length === 1) {
    await db.product.update({ where: { id: params.id }, data: { active: body.active } });
    return NextResponse.json({ ok: true });
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  await db.product.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(params.id);
  if (a.error) return a.error;
  const used = await db.orderItem.count({ where: { productId: params.id } });
  if (used > 0) return NextResponse.json({ error: 'This smock has past orders, so it cannot be deleted. Hide it instead.' }, { status: 409 });
  await db.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
