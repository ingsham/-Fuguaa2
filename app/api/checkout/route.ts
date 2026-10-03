import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { initTransaction } from '@/lib/paystack';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL, ghsFormat } from '@/lib/utils';
import { liveSeller } from '@/lib/queries';

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(50), size: z.string().max(40).optional(), color: z.string().max(40).optional() })).min(1).max(50),
  shipping: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), address: z.string().trim().min(5).max(300) }),
  expectedTotal: z.number().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Please log in to check out.' }, { status: 401 });
  if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Please complete all delivery details.' }, { status: 400 });
  const { items, shipping, expectedTotal } = parsed.data;

  // Prices and stock always come from the database, never from the browser.
  const products = await db.product.findMany({ where: { id: { in: [...new Set(items.map((i) => i.productId))] }, active: true, seller: liveSeller }, include: { seller: true } });
  const qtyByProduct = new Map<string, number>();
  for (const it of items) qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);

  const bySeller = new Map<string, { items: { productId: string; title: string; quantity: number; price: number; size?: string; color?: string }[]; total: number }>();
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return NextResponse.json({ error: 'An item in your cart is no longer available. Remove it and try again.' }, { status: 400 });
    if (p.seller.userId === user.id) return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 400 });
    if (p.stock < (qtyByProduct.get(p.id) || 0)) return NextResponse.json({ error: `Only ${p.stock} left of "${p.title}".` }, { status: 400 });
    if ((p.sizes.length > 0 && !it.size) || (it.size && !p.sizes.includes(it.size))) return NextResponse.json({ error: `Choose a valid size for "${p.title}".` }, { status: 400 });
    if ((p.colors.length > 0 && !it.color) || (it.color && !p.colors.includes(it.color))) return NextResponse.json({ error: `Choose a valid colour for "${p.title}".` }, { status: 400 });
    const g = bySeller.get(p.sellerId) || { items: [], total: 0 };
    g.items.push({ productId: p.id, title: p.title, quantity: it.quantity, price: p.price, size: it.size, color: it.color });
    g.total += p.price * it.quantity;
    bySeller.set(p.sellerId, g);
  }
  const grand = [...bySeller.values()].reduce((s, g) => s + g.total, 0);

  // If a price changed since the buyer added it, stop and show the real total instead of charging a surprise.
  if (expectedTotal !== undefined && Math.abs(expectedTotal - grand) > 0.005) {
    const prices = Object.fromEntries(products.map((p) => [p.id, p.price]));
    return NextResponse.json({ error: `A price changed. Your total is now ${ghsFormat(grand)}. Please review and pay again.`, prices }, { status: 409 });
  }

  const reference = `FGU-${randomUUID()}`;
  await db.$transaction([...bySeller].map(([sellerId, g]) => db.order.create({
    data: {
      paymentRef: reference, buyerId: user.id, sellerId, total: g.total,
      shippingName: shipping.name, shippingPhone: shipping.phone, shippingAddress: shipping.address,
      items: { create: g.items },
    },
  })));
  try {
    const tx = await initTransaction({ email: user.email, amountGHS: grand, reference, callbackUrl: `${SITE_URL}/checkout/verify` });
    return NextResponse.json({ url: tx.authorization_url });
  } catch (e) {
    console.error('[paystack init failed]', e);
    await db.order.deleteMany({ where: { paymentRef: reference, paymentStatus: 'UNPAID' } });
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
  }
}
