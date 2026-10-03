import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { productSchema } from '@/lib/product-schema';
import { canManageProduct, canToggleVisibility } from '@/lib/permissions';
import { audit } from '@/lib/audit';

async function load(id: string) {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') return { error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }) } as const;
  const product = await db.product.findUnique({ where: { id }, include: { seller: true } });
  // Same answer for "missing" and "someone else's" so listing IDs cannot be probed.
  if (!product || !canManageProduct(user, product.seller.userId)) return { error: NextResponse.json({ error: 'Listing not found' }, { status: 404 }) } as const;
  if (user.role === 'SELLER' && product.seller.verificationStatus !== 'VERIFIED') return { error: NextResponse.json({ error: 'Your shop is not verified.' }, { status: 403 }) } as const;
  return { user, product } as const;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if ('error' in r) return r.error;
  const { user, product } = r;
  const body = await req.json().catch(() => ({}));

  if (typeof body.active === 'boolean' && Object.keys(body).length === 1) {
    if (!canToggleVisibility(user, product.seller.userId, product.hiddenByAdmin)) return NextResponse.json({ error: 'Fuguaa hid this listing. Contact support to have it restored.' }, { status: 403 });
    const adminHidingOthers = user.role === 'ADMIN' && !body.active && product.seller.userId !== user.id;
    await db.product.update({ where: { id: product.id }, data: { active: body.active, hiddenByAdmin: user.role === 'ADMIN' ? adminHidingOthers : product.hiddenByAdmin } });
    if (user.role === 'ADMIN') await audit(user.id, body.active ? 'product.unhide' : 'product.hide', 'Product', product.id, { title: product.title });
    return NextResponse.json({ ok: true });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  await db.product.update({ where: { id: product.id }, data: parsed.data });
  if (user.role === 'ADMIN') await audit(user.id, 'product.edit', 'Product', product.id, { title: product.title });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if ('error' in r) return r.error;
  const { user, product } = r;
  const used = await db.orderItem.count({ where: { productId: product.id } });
  if (used > 0) return NextResponse.json({ error: 'This smock has past orders, so it cannot be deleted. Hide it instead.' }, { status: 409 });
  await db.product.delete({ where: { id: product.id } });
  if (user.role === 'ADMIN') await audit(user.id, 'product.delete', 'Product', product.id, { title: product.title });
  return NextResponse.json({ ok: true });
}
