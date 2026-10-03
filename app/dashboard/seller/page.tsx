import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureSellerProfileFor } from '@/lib/products';
import { ghsFormat } from '@/lib/utils';
import ActionButton from '@/components/ActionButton';

export const metadata = { title: 'Seller dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SellerDashboard({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/dashboard/seller');
  if (user.role === 'BUYER') redirect('/');
  const profile = await ensureSellerProfileFor(user);
  if (!profile) redirect('/seller-onboarding');

  const tab = searchParams.tab === 'orders' ? 'orders' : 'listings';
  const verified = profile.verificationStatus === 'VERIFIED';
  const [products, orders] = await Promise.all([
    db.product.findMany({ where: { sellerId: profile.id }, orderBy: { createdAt: 'desc' } }),
    db.order.findMany({ where: { sellerId: profile.id, paymentStatus: 'PAID' }, orderBy: { createdAt: 'desc' }, include: { items: true, buyer: { select: { name: true } } } }),
  ]);
  const held = orders.filter((o) => o.escrowStatus === 'HELD').reduce((s, o) => s + o.total, 0);
  const released = orders.filter((o) => o.escrowStatus === 'RELEASED').reduce((s, o) => s + o.total, 0);

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">{profile.shopName}</h1>
          <p className="mt-1 text-sm">{verified ? <span className="badge bg-kente/15 text-kente">Identity verified</span> : <span className="badge bg-ochre/30">{profile.verificationStatus.replace('_', ' ').toLowerCase()}</span>}
            {verified && <Link href={`/seller/${profile.id}`} className="ml-3 underline">View my shop page</Link>}</p></div>
        {verified ? <Link href="/dashboard/products/new" className="btn-primary">Add a smock</Link> : <button className="btn-primary" disabled title="Available once you are verified">Add a smock</button>}
      </div>

      {!verified && (
        <div className="mt-6 rounded-lg bg-cream p-5 text-sm">
          {profile.verificationStatus === 'PENDING' && <p>Your ID is being reviewed. You can list smocks once you are approved.</p>}
          {profile.verificationStatus === 'REJECTED' && <p>Your ID was not approved{profile.rejectionReason ? `: ${profile.rejectionReason}` : ''}. <Link href="/seller-onboarding" className="font-semibold underline">Submit again</Link>.</p>}
          {profile.verificationStatus === 'NOT_SUBMITTED' && <p>Finish verifying your identity to start selling. <Link href="/seller-onboarding" className="font-semibold underline">Verify now</Link>.</p>}
        </div>
      )}

      <div className="mt-8 flex gap-1 border-b border-ink/15" role="tablist">
        {(['listings', 'orders'] as const).map((t) => (
          <Link key={t} href={`/dashboard/seller?tab=${t}`} role="tab" aria-selected={tab === t} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize ${tab === t ? 'border-terracotta text-terracotta' : 'border-transparent text-ink/60'}`}>{t}{t === 'orders' ? ` (${orders.length})` : ` (${products.length})`}</Link>
        ))}
      </div>

      {tab === 'listings' ? (
        products.length === 0 ? <p className="mt-8 rounded-lg bg-cream p-8 text-center">No listings yet. Add your first smock to open your shop.</p> : (
          <ul className="mt-6 divide-y divide-ink/10">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="h-16 w-14 overflow-hidden rounded bg-cream">{p.photos[0] && <img src={p.photos[0]} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="text-sm text-ink/60">{ghsFormat(p.price)} · {p.stock} in stock {!p.active && <span className="badge ml-1 bg-ink/10">Hidden</span>}</p></div>
                {verified && <div className="flex gap-2">
                  <Link href={`/dashboard/products/${p.id}`} className="btn-ghost !px-3.5 !py-1.5">Edit</Link>
                  <ActionButton url={`/api/products/${p.id}`} method="PATCH" body={{ active: !p.active }} label={p.active ? 'Hide' : 'Unhide'} />
                  <ActionButton url={`/api/products/${p.id}`} method="DELETE" label="Delete" variant="danger" confirm="Delete this listing permanently?" />
                </div>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-cream p-4"><p className="text-sm text-ink/60">Held until buyers confirm</p><p className="text-2xl font-bold">{ghsFormat(held)}</p></div>
            <div className="rounded-lg bg-cream p-4"><p className="text-sm text-ink/60">Released to you</p><p className="text-2xl font-bold">{ghsFormat(released)}</p></div>
          </div>
          {orders.length === 0 ? <p className="mt-8 rounded-lg bg-cream p-8 text-center">No paid orders yet. We will email and text you when one arrives.</p> : (
            <ul className="mt-6 space-y-4">
              {orders.map((o) => (
                <li key={o.id} className="rounded-lg border border-ink/15 p-4">
                  <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">#{o.id.slice(-8).toUpperCase()} · {o.buyer.name}</p><span className="badge bg-indigo/15 text-indigo">{o.status.toLowerCase()}</span></div>
                  <ul className="mt-2 text-sm">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.title}{i.size ? ` (${i.size})` : ''}{i.color ? `, ${i.color}` : ''}</li>)}</ul>
                  <p className="mt-2 text-sm text-ink/70">Ship to {o.shippingName}, {o.shippingPhone}<br />{o.shippingAddress}</p>
                  <div className="mt-3 flex items-center justify-between"><p className="font-bold">{ghsFormat(o.total)}</p>
                    {o.status === 'CONFIRMED' && <ActionButton url={`/api/orders/${o.id}`} body={{ action: 'ship' }} label="Mark as shipped" variant="primary" />}</div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
