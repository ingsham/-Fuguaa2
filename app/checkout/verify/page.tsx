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
    // Only the buyer who created these orders can confirm them.
    const mine = await db.order.findFirst({ where: { paymentRef: ref, buyerId: user.id }, select: { id: true } });
    if (mine) {
      try {
        const tx = await verifyTransaction(ref);
        if (tx.status === 'success' && tx.reference === ref) {
          await markPaid(ref, { amountPesewas: tx.amount, currency: tx.currency }); // idempotent; also checks the amount
          ok = (await db.order.count({ where: { paymentRef: ref, paymentStatus: 'UNPAID' } })) === 0;
        }
      } catch (e) { console.error('[verify failed]', e); }
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
          <p className="mt-3 text-ink/75">If money left your account, your order will appear on your orders page shortly. Otherwise you can try again.</p>
          <div className="mt-6 flex justify-center gap-3"><Link href="/orders" className="btn-ghost">My orders</Link><Link href="/cart" className="btn-primary">Back to cart</Link></div>
        </>
      )}
    </div>
  );
}
