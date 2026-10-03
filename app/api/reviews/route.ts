import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canReview } from '@/lib/permissions';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({ orderId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });

// Verified purchases only: the buyer of a delivered order, once per order.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Log in first.' }, { status: 401 });
  if (!rateLimit(`review:${user.id}`, 10, 60_000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a rating from 1 to 5.' }, { status: 400 });
  const { orderId, rating, comment } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { review: { select: { id: true } } } });
  if (!order || order.buyerId !== user.id || order.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (!canReview({ status: order.status, buyerId: order.buyerId, hasReview: !!order.review }, user.id)) return NextResponse.json({ error: 'You can review an order once it has been delivered, and only once.' }, { status: 409 });
  try {
    await db.review.create({ data: { orderId, buyerId: user.id, sellerId: order.sellerId, rating, comment: comment || null } });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'You already reviewed this order.' }, { status: 409 });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
