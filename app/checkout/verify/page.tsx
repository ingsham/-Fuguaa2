import Link from 'next/link';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { verifyTransaction } from '@/lib/paystack';
import { markPaid } from '@/lib/orders';
import ClearCart from '@/components/ClearCart';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment status', robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: { reference?: string; trxref?: string } }) {
  const ref = searchParams.reference || searchParams.trxref;
  const user = await currentUser();
  let ok = false;
  if (ref && user) {
    const mine = await db.order.findFirst({ where: { paymentRef: ref, buyerId: user.id } });
    if (mine) {
      try {
        const tx = await verifyTransaction(ref);
        const expected = (await db.order.aggregate({ where: { paymentRef: ref }, _sum: { total: true } }))._sum.total || 0;
        if (tx.status === 'success' && tx.currency === 'GHS' && tx.amount === Math.round(expected * 100)) { await markPaid(ref); ok = true; }
      } catch (e) { console.error('verify', e); }
    }
  }
  return (
    <div className="container-x max-w-xl py-16 text-center">
      {ok ? (
        <>
          <ClearCart />
          <h1 className="text-3xl font-bold">Payment received</h1>
          <p className="mt-3 text-ink/75">Thank you. Each weaver has been notified and your payment is held safely until you confirm your smock arrived.</p>
          <Link href="/orders" className="btn-primary mt-6">Track your orders</Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">We could not confirm your payment</h1>
          <p className="mt-3 text-ink/75">If money left your account, it will show on your orders page shortly. Otherwise you can try again.</p>
          <div className="mt-6 flex justify-center gap-3"><Link href="/orders" className="btn-ghost">My orders</Link><Link href="/cart" className="btn-primary">Back to cart</Link></div>
        </>
      )}
    </div>
  );
}
