import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { safe } from '@/lib/safe';
import { liveSeller } from '@/lib/queries';
import { avg } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import Stars from '@/components/Stars';

export const dynamic = 'force-dynamic';

const getSeller = (id: string) => safe('seller page', () => db.sellerProfile.findFirst({
  where: { id, ...liveSeller },
  include: { products: { where: { active: true }, orderBy: { createdAt: 'desc' }, include: { seller: { select: { shopName: true } } } }, reviews: { select: { rating: true } } },
}), null);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await getSeller(params.id);
  if (!s) return { title: 'Shop not found', robots: { index: false } };
  return { title: `${s.shopName}, handwoven smocks`, description: (s.story || `Handwoven smocks from ${s.shopName}${s.region ? `, ${s.region}` : ''}, Ghana.`).slice(0, 155), alternates: { canonical: `/seller/${s.id}` } };
}

export default async function SellerPage({ params }: { params: { id: string } }) {
  const s = await getSeller(params.id);
  if (!s) notFound();
  const ratings = s.reviews.map((r) => r.rating);
  return (
    <div className="container-x py-10">
      <div className="rounded-lg bg-cream p-8">
        <h1 className="text-3xl font-bold">{s.shopName}</h1>
        <p className="mt-1 text-sm text-ink/70">{s.region || 'Ghana'} <span className="badge ml-2 bg-kente/15 text-kente">Identity verified</span></p>
        {ratings.length > 0 && <p className="mt-2 text-sm"><Stars value={avg(ratings)} /> <span className="text-ink/60">{avg(ratings).toFixed(1)} from {ratings.length} {ratings.length === 1 ? 'review' : 'reviews'}</span></p>}
        {s.story && <p className="mt-5 max-w-2xl whitespace-pre-line font-serif text-xl italic leading-snug">{s.story}</p>}
      </div>
      <h2 className="mt-10 text-2xl font-bold">Smocks from {s.shopName}</h2>
      {s.products.length === 0 ? <p className="mt-4">No smocks listed yet.</p> : <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{s.products.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
