import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { initTransaction } from '@/lib/paystack';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/utils';

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(50), size: z.string().max(40).optional(), color: z.string().max(40).optional() })).min(1).max(50),
  shipping: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), address: z.string().trim().min(5).max(300) }),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Please log in to check out.' }, { status: 401 });
  if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Please complete all delivery details.' }, { status: 400 });
  const { items, shipping } = parsed.data;

  // Prices always come from the database, never from the browser.
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true, seller: { verificationStatus: 'VERIFIED' } },
    include: { seller: true },
  });
  const bySeller = new Map<string, { items: any[]; total: number }>();
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return NextResponse.json({ error: 'An item in your cart is no longer available. Remove it and try again.' }, { status: 400 });
    if (p.seller.userId === user.id) return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 400 });
    if (p.stock < it.quantity) return NextResponse.json({ error: `Only ${p.stock} left of "${p.title}".` }, { status: 400 });
    if (it.size && !p.sizes.includes(it.size)) return NextResponse.json({ error: `Invalid size for "${p.title}".` }, { status: 400 });
    if (it.color && !p.colors.includes(it.color)) return NextResponse.json({ error: `Invalid colour for "${p.title}".` }, { status: 400 });
    const g = bySeller.get(p.sellerId) || { items: [], total: 0 };
    g.items.push({ productId: p.id, title: p.title, quantity: it.quantity, price: p.price, size: it.size, color: it.color });
    g.total += p.price * it.quantity;
    bySeller.set(p.sellerId, g);
  }

  const reference = `FGU-${randomUUID()}`;
  let grand = 0;
  for (const [sellerId, g] of bySeller) {
    grand += g.total;
    await db.order.create({
      data: {
        paymentRef: reference, buyerId: user.id, sellerId, total: g.total,
        shippingName: shipping.name, shippingPhone: shipping.phone, shippingAddress: shipping.address,
        items: { create: g.items },
      },
    });
  }
  try {
    const tx = await initTransaction({ email: user.email!, amountGHS: grand, reference, callbackUrl: `${SITE_URL}/checkout/verify` });
    return NextResponse.json({ url: tx.authorization_url });
  } catch (e: any) {
    console.error('Paystack init', e);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
  }
}
