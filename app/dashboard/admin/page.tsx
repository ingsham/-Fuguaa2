import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { decryptText, maskId } from '@/lib/crypto';
import { ghsFormat } from '@/lib/utils';
import ActionButton from '@/components/ActionButton';

export const metadata = { title: 'Admin dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/dashboard/admin');
  if (user.role !== 'ADMIN') redirect('/');

  const tab = ['listings', 'verification', 'disputes'].includes(searchParams.tab || '') ? searchParams.tab! : 'verification';
  const [verifiedSellers, paidOrders, gmv, pending, openDisputes] = await Promise.all([
    db.sellerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    db.order.count({ where: { paymentStatus: 'PAID' } }),
    db.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
    db.sellerProfile.findMany({ where: { verificationStatus: 'PENDING' }, orderBy: { submittedAt: 'asc' }, include: { user: { select: { name: true, email: true, phone: true } } } }),
    db.dispute.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' }, include: { order: { include: { seller: { select: { shopName: true } }, buyer: { select: { name: true } } } } } }),
  ]);
  const listings = tab === 'listings' ? await db.product.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { seller: { select: { shopName: true } } } }) : [];

  const metrics = [
    { label: 'Verified sellers', value: String(verifiedSellers) },
    { label: 'Completed orders', value: String(paidOrders) },
    { label: 'Gross merchandise value', value: ghsFormat(gmv._sum.total || 0) },
  ];
  const tabs = [
    { key: 'listings', label: 'Listings' },
    { key: 'verification', label: `Verification${pending.length ? ` (${pending.length})` : ''}` },
    { key: 'disputes', label: `Disputes${openDisputes.length ? ` (${openDisputes.length})` : ''}` },
  ];

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin</h1>
        <div className="flex gap-2"><Link href="/dashboard/seller" className="btn-ghost">My seller view</Link><Link href="/dashboard/products/new" className="btn-primary">Add a smock</Link></div>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => <div key={m.label} className="rounded-lg bg-cream p-4"><dt className="text-sm text-ink/60">{m.label}</dt><dd className="text-2xl font-bold">{m.value}</dd></div>)}
      </dl>

      <div className="mt-8 flex gap-1 border-b border-ink/15" role="tablist">
        {tabs.map((t) => <Link key={t.key} href={`/dashboard/admin?tab=${t.key}`} role="tab" aria-selected={tab === t.key} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t.key ? 'border-terracotta text-terracotta' : 'border-transparent text-ink/60'}`}>{t.label}</Link>)}
      </div>

      {tab === 'verification' && (pending.length === 0 ? <p className="mt-8 rounded-lg bg-cream p-8 text-center">No sellers are waiting for verification.</p> : (
        <ul className="mt-6 space-y-4">
          {pending.map((s) => {
            let idNum = '(unreadable)';
            try { idNum = s.idNumberEnc ? decryptText(s.idNumberEnc) : ''; } catch {}
            return (
              <li key={s.id} className="rounded-lg border border-ink/15 p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{s.shopName}</p>
                    <p className="text-sm text-ink/70">{s.user.name} · {s.user.email} · {s.user.phone}</p>
                    <p className="text-sm text-ink/70">Region: {s.region || 'not given'}</p>
                    <p className="mt-2 text-sm"><b>{s.idType === 'PASSPORT' ? 'Passport' : 'Ghana Card'} number:</b> {idNum} <span className="text-ink/45">({maskId(idNum)})</span></p>
                    <a href={`/api/admin/id-photo/${s.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-terracotta underline">View submitted ID photo</a>
                  </div>
                  <div className="flex items-start gap-2">
                    <ActionButton url={`/api/admin/sellers/${s.id}`} body={{ action: 'approve' }} label="Approve" variant="primary" />
                    <ActionButton url={`/api/admin/sellers/${s.id}`} body={{ action: 'reject' }} label="Reject" variant="danger" promptReason="Why is this being rejected? The seller will see this." confirm="Reject this seller?" />
                  </div>
                </div>
                {s.story && <p className="mt-3 border-l-4 border-ochre pl-3 font-serif italic text-ink/80">{s.story}</p>}
              </li>
            );
          })}
        </ul>
      ))}

      {tab === 'disputes' && (openDisputes.length === 0 ? <p className="mt-8 rounded-lg bg-cream p-8 text-center">No open disputes.</p> : (
        <ul className="mt-6 space-y-4">
          {openDisputes.map((d) => (
            <li key={d.id} className="rounded-lg border border-ink/15 p-5">
              <p className="font-bold">{d.order.seller.shopName} · {ghsFormat(d.order.total)} <span className="font-normal text-ink/60">· order #{d.orderId.slice(-8).toUpperCase()}</span></p>
              <p className="text-sm text-ink/70">Buyer: {d.order.buyer.name}</p>
              <p className="mt-2 rounded bg-red-50 p-3 text-sm">{d.reason}</p>
              <div className="mt-3 flex gap-2">
                <ActionButton url={`/api/admin/disputes/${d.id}`} body={{ action: 'refund' }} label="Refund buyer" variant="dark" confirm="Resolve in the buyer's favour? Remember to send the refund from your Paystack dashboard." />
                <ActionButton url={`/api/admin/disputes/${d.id}`} body={{ action: 'release' }} label="Release to seller" confirm="Resolve in the seller's favour?" />
              </div>
            </li>
          ))}
        </ul>
      ))}

      {tab === 'listings' && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-ink/20 text-ink/60"><th className="py-2 pr-3">Smock</th><th className="pr-3">Shop</th><th className="pr-3">Price</th><th className="pr-3">Stock</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {listings.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-3"><div className="flex items-center gap-3"><div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-cream">{p.photos[0] && <img src={p.photos[0]} alt="" className="h-full w-full object-cover" />}</div><span className="font-medium">{p.title}{!p.active && <span className="badge ml-2 bg-ink/10">Hidden</span>}</span></div></td>
                  <td className="pr-3">{p.seller.shopName}</td><td className="pr-3">{ghsFormat(p.price)}</td><td className="pr-3">{p.stock}</td>
                  <td><div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/products/${p.id}`} className="btn-ghost !px-3 !py-1.5">Edit</Link>
                    <ActionButton url={`/api/products/${p.id}`} method="PATCH" body={{ active: !p.active }} label={p.active ? 'Hide' : 'Unhide'} />
                    <ActionButton url={`/api/products/${p.id}`} method="DELETE" label="Delete" variant="danger" confirm="Delete this listing permanently? This cannot be undone." />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {listings.length === 0 && <p className="mt-6 rounded-lg bg-cream p-8 text-center">No listings on the platform yet.</p>}
        </div>
      )}
    </div>
  );
}
