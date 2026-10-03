import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sendEmail, sendSms } from '@/lib/notify';
import { escapeHtml as e } from '@/lib/html';
import { DISPUTE_WINDOW_HOURS } from '@/lib/utils';
import { canShipOrder, disputeWindowOpen, isOrderBuyer } from '@/lib/permissions';

const schema = z.object({ action: z.enum(['ship', 'received', 'report']), reason: z.string().trim().min(5).max(1000).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Log in first.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { action, reason } = parsed.data;

  const order = await db.order.findUnique({ where: { id: params.id }, include: { seller: { include: { user: true } }, buyer: true, dispute: true } });
  // Same 404 whether the order is missing, unpaid, or belongs to someone else.
  const involved = order && (isOrderBuyer(user, order.buyerId) || canShipOrder(user, order.seller.userId));
  if (!order || order.paymentStatus !== 'PAID' || !involved) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const ref = order.id.slice(-8).toUpperCase();

  if (action === 'ship') {
    if (!canShipOrder(user, order.seller.userId)) return NextResponse.json({ error: 'Only the seller can mark this as shipped.' }, { status: 403 });
    // Conditional update: two quick clicks, or a click racing a dispute, can only succeed once.
    const r = await db.order.updateMany({ where: { id: order.id, status: 'CONFIRMED' }, data: { status: 'SHIPPED', shippedAt: new Date() } });
    if (r.count === 0) return NextResponse.json({ error: 'This order cannot be marked shipped.' }, { status: 409 });
    await Promise.all([
      sendEmail(order.buyer.email, `Your Fuguaa order #${ref} has shipped`, `<p>Good news, ${e(order.buyer.name)}. ${e(order.seller.shopName)} has shipped your order. When it arrives, tap "I received this" on your orders page.</p>`),
      sendSms(order.buyer.phone, `Fuguaa: your order #${ref} has shipped. Confirm on the site when it arrives.`),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (!isOrderBuyer(user, order.buyerId)) return NextResponse.json({ error: 'Only the buyer can do this.' }, { status: 403 });

  if (action === 'received') {
    const r = await db.order.updateMany({ where: { id: order.id, status: 'SHIPPED' }, data: { status: 'DELIVERED', deliveredAt: new Date(), escrowStatus: 'RELEASED' } });
    if (r.count === 0) return NextResponse.json({ error: 'This order is not waiting for confirmation.' }, { status: 409 });
    await sendEmail(order.seller.user.email, `Order #${ref} delivered`, `<p>The buyer confirmed receipt of order #${ref}. The held payment has been released to you.</p>`);
    return NextResponse.json({ ok: true });
  }

  // report
  if (!reason) return NextResponse.json({ error: 'Please describe the problem.' }, { status: 400 });
  if (!disputeWindowOpen(order) || order.dispute) return NextResponse.json({ error: `The ${DISPUTE_WINDOW_HOURS}-hour window to report an issue has closed.` }, { status: 409 });
  try {
    await db.$transaction([
      db.dispute.create({ data: { orderId: order.id, reason } }),
      db.order.update({ where: { id: order.id }, data: { status: 'DISPUTED', escrowStatus: 'HELD' } }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'An issue was already reported for this order.' }, { status: 409 });
    throw err;
  }
  await Promise.all([
    process.env.ADMIN_EMAIL && sendEmail(process.env.ADMIN_EMAIL, `Dispute opened on order #${ref}`, `<p>${e(order.buyer.name)} reported: ${e(reason)}</p>`),
    sendEmail(order.seller.user.email, `A buyer reported an issue with order #${ref}`, `<p>The buyer reported a problem. Fuguaa will review it and contact you. Payment stays on hold until then.</p>`),
  ]);
  return NextResponse.json({ ok: true });
}
