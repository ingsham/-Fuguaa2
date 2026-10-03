import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sendEmail, sendSms } from '@/lib/notify';
import { DISPUTE_WINDOW_HOURS } from '@/lib/utils';

const schema = z.object({ action: z.enum(['ship', 'received', 'report']), reason: z.string().trim().min(5).max(1000).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Log in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { action, reason } = parsed.data;

  const order = await db.order.findUnique({ where: { id: params.id }, include: { seller: { include: { user: true } }, buyer: true, dispute: true } });
  if (!order || order.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const ref = order.id.slice(-8).toUpperCase();

  if (action === 'ship') {
    if (user.role !== 'ADMIN' && order.seller.userId !== user.id) return NextResponse.json({ error: 'Not your order.' }, { status: 403 });
    if (order.status !== 'CONFIRMED') return NextResponse.json({ error: 'This order cannot be marked shipped.' }, { status: 409 });
    await db.order.update({ where: { id: order.id }, data: { status: 'SHIPPED', shippedAt: new Date() } });
    await Promise.all([
      sendEmail(order.buyer.email, `Your Fuguaa order #${ref} has shipped`, `<p>Good news, ${order.buyer.name}. ${order.seller.shopName} has shipped your order. When it arrives, tap "I received this" on your orders page.</p>`),
      sendSms(order.buyer.phone, `Fuguaa: your order #${ref} has shipped. Confirm on the site when it arrives.`),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (order.buyerId !== user.id) return NextResponse.json({ error: 'Not your order.' }, { status: 403 });

  if (action === 'received') {
    if (order.status !== 'SHIPPED') return NextResponse.json({ error: 'This order has not shipped yet.' }, { status: 409 });
    await db.order.update({ where: { id: order.id }, data: { status: 'DELIVERED', deliveredAt: new Date(), escrowStatus: 'RELEASED' } });
    await sendEmail(order.seller.user.email, `Order #${ref} delivered`, `<p>The buyer confirmed receipt of order #${ref}. The held payment has been released to you.</p>`);
    return NextResponse.json({ ok: true });
  }

  // report
  if (!reason) return NextResponse.json({ error: 'Please describe the problem.' }, { status: 400 });
  const withinWindow = order.status === 'SHIPPED' || (order.status === 'DELIVERED' && order.deliveredAt && Date.now() - order.deliveredAt.getTime() < DISPUTE_WINDOW_HOURS * 3600_000);
  if (!withinWindow || order.dispute) return NextResponse.json({ error: `The ${DISPUTE_WINDOW_HOURS}-hour window to report an issue has closed.` }, { status: 409 });
  await db.$transaction([
    db.dispute.create({ data: { orderId: order.id, reason } }),
    db.order.update({ where: { id: order.id }, data: { status: 'DISPUTED', escrowStatus: 'HELD' } }),
  ]);
  if (process.env.ADMIN_EMAIL) await sendEmail(process.env.ADMIN_EMAIL, `Dispute opened on order #${ref}`, `<p>${order.buyer.name} reported: ${reason.replace(/</g, '&lt;')}</p>`);
  return NextResponse.json({ ok: true });
}
