import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/notify';

const schema = z.object({ action: z.enum(['refund', 'release']) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const dispute = await db.dispute.findUnique({ where: { id: params.id }, include: { order: { include: { buyer: true, seller: { include: { user: true } } } } } });
  if (!dispute || dispute.status !== 'OPEN') return NextResponse.json({ error: 'Dispute already resolved.' }, { status: 409 });

  const refund = parsed.data.action === 'refund';
  await db.$transaction([
    db.dispute.update({ where: { id: dispute.id }, data: { status: refund ? 'REFUNDED' : 'RELEASED', resolvedAt: new Date() } }),
    db.order.update({ where: { id: dispute.orderId }, data: { escrowStatus: refund ? 'REFUNDED' : 'RELEASED' } }),
  ]);
  const ref = dispute.orderId.slice(-8).toUpperCase();
  await Promise.all([
    sendEmail(dispute.order.buyer.email, `Update on your issue with order #${ref}`, refund ? '<p>We reviewed your report and will refund you. Refunds can take a few working days to arrive.</p>' : '<p>We reviewed your report and the payment has been released to the seller.</p>'),
    sendEmail(dispute.order.seller.user.email, `Dispute on order #${ref} resolved`, refund ? '<p>The dispute was resolved in the buyer\'s favour and the order was refunded.</p>' : '<p>The dispute was resolved in your favour and the payment has been released to you.</p>'),
  ]);
  return NextResponse.json({ ok: true });
}
