import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AUTO_RELEASE_DAYS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Daily (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Buyers who never tap "I received this": release the held payment after AUTO_RELEASE_DAYS if nobody disputed.
  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 86_400_000);
  const stale = await db.order.findMany({ where: { status: 'SHIPPED', paymentStatus: 'PAID', shippedAt: { lt: cutoff }, dispute: { is: null } }, select: { id: true } });
  const released = await db.order.updateMany({ where: { id: { in: stale.map((o) => o.id) }, status: 'SHIPPED' }, data: { status: 'DELIVERED', deliveredAt: new Date(), escrowStatus: 'RELEASED' } });

  // 2. Abandoned checkouts and used/expired reset tokens.
  const abandoned = await db.order.deleteMany({ where: { paymentStatus: 'UNPAID', createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } } });
  const tokens = await db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } });
  return NextResponse.json({ autoReleased: released.count, abandonedRemoved: abandoned.count, tokensRemoved: tokens.count });
}
