import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ghsFormat, DISPUTE_WINDOW_HOURS } from '@/lib/utils';
import ActionButton from '@/components/ActionButton';

export const metadata = { title: 'My orders', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Awaiting payment', cls: 'bg-ink/10 text-ink' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-ochre/30 text-ink' },
  SHIPPED: { label: 'Shipped', cls: 'bg-indigo/15 text-indigo' },
  DELIVERED: { label: 'Delivered', cls: 'bg-kente/15 text-kente' },
  DISPUTED: { label: 'Disputed', cls: 'bg-red-100 text-red-800' },
};

export default async function Orders() {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/orders');
  const orders = await db.order.findMany({
    where: { buyerId: user.id, paymentStatus: 'PAID' }, orderBy: { createdAt: 'desc' },
    include: { items: true, seller: { select: { shopName: true } }, dispute: true },
  });
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg bg-cream p-10 text-center"><p>You have no orders yet.</p><Link href="/shop" className="btn-primary mt-4">Browse smocks</Link></div>
      ) : (
        <ul className="mt-8 space-y-5">
          {orders.map((o) => {
            const s = STATUS[o.status];
            const windowOpen = o.status === 'SHIPPED' || (o.status === 'DELIVERED' && o.deliveredAt && Date.now() - o.deliveredAt.getTime() < DISPUTE_WINDOW_HOURS * 3600_000);
            return (
              <li key={o.id} className="overflow-hidden rounded-lg border border-ink/15">
                <div className="weave !h-1" aria-hidden />
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-bold">Order #{o.id.slice(-8).toUpperCase()}</p><p className="text-sm text-ink/60">{o.seller.shopName} · {o.createdAt.toLocaleDateString('en-GH')}</p></div>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                  <ul className="mt-3 text-sm">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.title}{i.size ? ` (${i.size})` : ''}{i.color ? `, ${i.color}` : ''}</li>)}</ul>
                  <p className="mt-3 font-bold">{ghsFormat(o.total)} <span className="ml-2 text-xs font-normal text-ink/60">{o.escrowStatus === 'HELD' ? 'Payment held until you confirm receipt' : o.escrowStatus === 'RELEASED' ? 'Paid out to seller' : o.escrowStatus === 'REFUNDED' ? 'Refunded to you' : ''}</span></p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {o.status === 'SHIPPED' && <ActionButton url={`/api/orders/${o.id}`} body={{ action: 'received' }} label="I received this" variant="primary" confirm="Confirm this order arrived? This releases your payment to the seller." />}
                    {windowOpen && !o.dispute && <ActionButton url={`/api/orders/${o.id}`} body={{ action: 'report' }} label="Report an issue" variant="danger" promptReason="What is wrong with your order?" />}
                  </div>
                  {o.status === 'DELIVERED' && windowOpen && <p className="mt-3 text-xs text-ink/60">You can report a problem for {DISPUTE_WINDOW_HOURS} hours after delivery.</p>}
                  {o.dispute && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-900">Issue reported: {o.dispute.reason}. Status: {o.dispute.status.toLowerCase()}.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
