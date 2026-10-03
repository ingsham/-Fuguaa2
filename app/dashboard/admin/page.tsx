import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { decryptText } from '@/lib/crypto';
import { ghsFormat } from '@/lib/utils';
import ActionButton from '@/components/ActionButton';
import SellerEditForm from '@/components/SellerEditForm';

export const metadata = { title: 'Admin dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

const TABS = ['verification', 'listings', 'sellers', 'buyers', 'disputes', 'audit'] as const;
type Tab = (typeof TABS)[number];
const STATUS_CLS: Record<string, string> = { VERIFIED: 'bg-kente/15 text-kente', PENDING: 'bg-ochre/30', REJECTED: 'bg-red-100 text-red-800', NOT_SUBMITTED: 'bg-ink/10' };

export default async function AdminDashboard({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  const admin = await currentUser();
  if (!admin) redirect('/login?callbackUrl=/dashboard/admin');
  if (admin.role !== 'ADMIN') redirect('/');

  const tab: Tab = (TABS as readonly string[]).includes(searchParams.tab || '') ? (searchParams.tab as Tab) : 'verification';
  const q = (searchParams.q || '').trim().slice(0, 80);
  const live = { paymentStatus: 'PAID' as const, escrowStatus: { not: 'REFUNDED' as const } };

  const [verifiedSellers, orderCount, gmv, pendingCount, disputeCount] = await Promise.all([
    db.sellerProfile.count({ where: { verificationStatus: 'VERIFIED', user: { suspended: false } } }),
    db.order.count({ where: live }),
    db.order.aggregate({ where: live, _sum: { total: true } }),
    db.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
    db.dispute.count({ where: { status: 'OPEN' } }),
  ]);
  const metrics = [
    { label: 'Verified sellers', value: String(verifiedSellers) },
    { label: 'Completed orders', value: String(orderCount) },
    { label: 'Gross merchandise value', value: ghsFormat(gmv._sum.total || 0) },
  ];
  const labels: Record<Tab, string> = {
    verification: `Verification${pendingCount ? ` (${pendingCount})` : ''}`, listings: 'Listings', sellers: 'Sellers', buyers: 'Buyers',
    disputes: `Disputes${disputeCount ? ` (${disputeCount})` : ''}`, audit: 'Audit log',
  };

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin</h1>
        <div className="flex gap-2"><Link href="/dashboard/seller" className="btn-ghost">My seller view</Link><Link href="/dashboard/products/new" className="btn-primary">Add a smock</Link></div>
      </div>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => <div key={m.label} className="rounded-lg bg-cream p-4"><dt className="text-sm text-ink/60">{m.label}</dt><dd className="text-2xl font-bold">{m.value}</dd></div>)}
      </dl>
      <div className="mt-8 flex flex-wrap gap-1 border-b border-ink/15" role="tablist">
        {TABS.map((t) => <Link key={t} href={`/dashboard/admin?tab=${t}`} role="tab" aria-selected={tab === t} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === t ? 'border-terracotta text-terracotta' : 'border-transparent text-ink/60'}`}>{labels[t]}</Link>)}
      </div>

      {tab === 'verification' && <Verification />}
      {tab === 'listings' && <Listings />}
      {tab === 'sellers' && <Sellers />}
      {tab === 'buyers' && <Buyers q={q} />}
      {tab === 'disputes' && <Disputes />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="mt-8 rounded-lg bg-cream p-8 text-center">{children}</p>;

async function Verification() {
  const pending = await db.sellerProfile.findMany({ where: { verificationStatus: 'PENDING' }, orderBy: { submittedAt: 'asc' }, include: { user: { select: { name: true, email: true, phone: true } } } });
  if (!pending.length) return <Empty>No sellers are waiting for verification.</Empty>;
  return (
    <ul className="mt-6 space-y-4">
      {pending.map((s) => {
        let idNum = '(could not decrypt, check ENCRYPTION_KEY)';
        try { if (s.idNumberEnc) idNum = decryptText(s.idNumberEnc); } catch {}
        return (
          <li key={s.id} className="rounded-lg border border-ink/15 p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{s.shopName}</p>
                <p className="text-sm text-ink/70">{s.user.name} · {s.user.email} · {s.user.phone}</p>
                <p className="text-sm text-ink/70">Region: {s.region || 'not given'}</p>
                <p className="mt-2 text-sm"><b>{s.idType === 'PASSPORT' ? 'Passport' : 'Ghana Card'} number:</b> {idNum}</p>
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
  );
}

async function Listings() {
  const listings = await db.product.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { seller: { select: { shopName: true } } } });
  if (!listings.length) return <Empty>No listings on the platform yet.</Empty>;
  return (
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
    </div>
  );
}

async function Sellers() {
  const sellers = await db.sellerProfile.findMany({
    orderBy: { createdAt: 'desc' }, take: 200,
    include: { user: { select: { id: true, name: true, email: true, phone: true, suspended: true, role: true } }, _count: { select: { products: true } } },
  });
  if (!sellers.length) return <Empty>No sellers yet.</Empty>;
  return (
    <ul className="mt-6 space-y-3">
      {sellers.map((s) => (
        <li key={s.id} className="rounded-lg border border-ink/15 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold">{s.shopName} <span className={`badge ml-1 ${STATUS_CLS[s.verificationStatus]}`}>{s.verificationStatus.replace('_', ' ').toLowerCase()}</span>{s.user.suspended && <span className="badge ml-1 bg-red-100 text-red-800">suspended</span>}</p>
              <p className="text-sm text-ink/70">{s.user.name} · {s.user.email} · {s.user.phone} · {s._count.products} listings</p>
            </div>
            {s.user.role !== 'ADMIN' && (s.user.suspended
              ? <ActionButton url={`/api/admin/users/${s.user.id}`} body={{ action: 'reinstate' }} label="Reinstate" variant="primary" />
              : <ActionButton url={`/api/admin/users/${s.user.id}`} body={{ action: 'suspend' }} label="Suspend" variant="danger" confirm="Suspend this seller? They are logged out and their shop and listings disappear from the site." />)}
          </div>
          <SellerEditForm id={s.id} shopName={s.shopName} story={s.story || ''} region={s.region || ''} />
        </li>
      ))}
    </ul>
  );
}

async function Buyers({ q }: { q: string }) {
  const buyers = await db.user.findMany({
    where: { role: 'BUYER', ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) },
    orderBy: { createdAt: 'desc' }, take: 100,
    select: { id: true, name: true, email: true, phone: true, country: true, suspended: true, createdAt: true },
  });
  const counts = await db.order.groupBy({ by: ['buyerId'], where: { paymentStatus: 'PAID', buyerId: { in: buyers.map((b) => b.id) } }, _count: { _all: true } });
  const paid = new Map(counts.map((c) => [c.buyerId, c._count._all]));
  return (
    <div className="mt-6">
      <form action="/dashboard/admin" className="flex gap-2">
        <input type="hidden" name="tab" value="buyers" />
        <label className="sr-only" htmlFor="bq">Search buyers</label>
        <input id="bq" name="q" defaultValue={q} placeholder="Search by name or email" className="input max-w-sm" />
        <button className="btn-dark">Search</button>
      </form>
      {buyers.length === 0 ? <Empty>No buyers found.</Empty> : (
        <ul className="mt-4 divide-y divide-ink/10">
          {buyers.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{b.name}{b.suspended && <span className="badge ml-2 bg-red-100 text-red-800">suspended</span>}</p>
                <p className="text-sm text-ink/70">{b.email} · {b.phone} · {b.country} · {paid.get(b.id) || 0} paid orders · joined {b.createdAt.toLocaleDateString('en-GH')}</p>
              </div>
              {b.suspended
                ? <ActionButton url={`/api/admin/users/${b.id}`} body={{ action: 'reinstate' }} label="Reinstate" variant="primary" />
                : <ActionButton url={`/api/admin/users/${b.id}`} body={{ action: 'suspend' }} label="Suspend" variant="danger" confirm="Suspend this buyer? They will be logged out and unable to buy." />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function Disputes() {
  const open = await db.dispute.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' }, include: { order: { include: { seller: { select: { shopName: true } }, buyer: { select: { name: true } } } } } });
  if (!open.length) return <Empty>No open disputes.</Empty>;
  return (
    <ul className="mt-6 space-y-4">
      {open.map((d) => (
        <li key={d.id} className="rounded-lg border border-ink/15 p-5">
          <p className="font-bold">{d.order.seller.shopName} · {ghsFormat(d.order.total)} <span className="font-normal text-ink/60">· order #{d.orderId.slice(-8).toUpperCase()}</span></p>
          <p className="text-sm text-ink/70">Buyer: {d.order.buyer.name}</p>
          <p className="mt-2 rounded bg-red-50 p-3 text-sm">{d.reason}</p>
          <div className="mt-3 flex gap-2">
            <ActionButton url={`/api/admin/disputes/${d.id}`} body={{ action: 'refund' }} label="Refund buyer" variant="dark" confirm="Resolve in the buyer's favour? Then send the refund from your Paystack dashboard." />
            <ActionButton url={`/api/admin/disputes/${d.id}`} body={{ action: 'release' }} label="Release to seller" confirm="Resolve in the seller's favour?" />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Audit() {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { actor: { select: { name: true, email: true } } } });
  if (!logs.length) return <Empty>No admin actions recorded yet.</Empty>;
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-ink/20 text-ink/60"><th className="py-2 pr-3">When</th><th className="pr-3">Who</th><th className="pr-3">Action</th><th>Target</th></tr></thead>
        <tbody className="divide-y divide-ink/10">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="py-2 pr-3 whitespace-nowrap">{l.createdAt.toLocaleString('en-GH')}</td>
              <td className="pr-3">{l.actor.name}<span className="block text-xs text-ink/55">{l.actor.email}</span></td>
              <td className="pr-3 font-mono text-xs">{l.action}</td>
              <td className="text-xs text-ink/70">{l.targetType} {l.targetId.slice(-8)}{l.meta ? ` · ${l.meta}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink/55">Showing the latest 100 actions. ID numbers are never written to this log.</p>
    </div>
  );
}
