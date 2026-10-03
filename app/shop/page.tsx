import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import ProductCard from '@/components/ProductCard';
import { OCCASIONS, REGIONS } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Shop handwoven smocks',
  description: 'Browse handwoven Ghanaian smocks by occasion, region, colour and price. Wedding, funeral, festival, everyday and children smocks from verified weavers.',
  alternates: { canonical: '/shop' },
};

type SP = { q?: string; occasion?: string; region?: string; color?: string; fabric?: string; min?: string; max?: string };

export default async function Shop({ searchParams }: { searchParams: SP }) {
  const { q, occasion, region, color, fabric } = searchParams;
  const min = Number(searchParams.min) || undefined;
  const max = Number(searchParams.max) || undefined;

  const products = await db.product.findMany({
    where: {
      active: true,
      seller: { verificationStatus: 'VERIFIED', ...(region ? { region } : {}) },
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }, { fabricType: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(occasion ? { occasionTags: { has: occasion } } : {}),
      ...(color ? { colors: { has: color } } : {}),
      ...(fabric ? { fabricType: { equals: fabric, mode: 'insensitive' } } : {}),
      ...((min || max) ? { price: { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { seller: { select: { shopName: true } } },
  });
  const fabrics = (await db.product.findMany({ where: { active: true, fabricType: { not: null } }, select: { fabricType: true }, distinct: ['fabricType'] })).map((f) => f.fabricType!);

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">{occasion ? `${occasion[0].toUpperCase()}${occasion.slice(1)} smocks` : 'All smocks'}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr]">
        <form className="space-y-4 text-sm" method="get" aria-label="Filters">
          <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="e.g. wedding, indigo" /></div>
          <div><label className="label" htmlFor="occasion">Occasion</label>
            <select id="occasion" name="occasion" defaultValue={occasion || ''} className="input"><option value="">Any</option>{OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label className="label" htmlFor="region">Weaver region</label>
            <select id="region" name="region" defaultValue={region || ''} className="input"><option value="">Any</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label" htmlFor="fabric">Material</label>
            <select id="fabric" name="fabric" defaultValue={fabric || ''} className="input"><option value="">Any</option>{fabrics.map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><label className="label" htmlFor="color">Colour</label><input id="color" name="color" defaultValue={color} className="input" placeholder="e.g. Indigo" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="min">Min GHS</label><input id="min" name="min" type="number" min={0} defaultValue={min} className="input" /></div>
            <div><label className="label" htmlFor="max">Max GHS</label><input id="max" name="max" type="number" min={0} defaultValue={max} className="input" /></div>
          </div>
          <div className="flex gap-2"><button className="btn-primary flex-1">Apply filters</button><Link href="/shop" className="btn-ghost">Clear</Link></div>
        </form>
        <section aria-live="polite">
          <p className="mb-4 text-sm text-ink/60">{products.length} {products.length === 1 ? 'smock' : 'smocks'} found</p>
          {products.length === 0 ? (
            <div className="rounded-lg bg-cream p-10 text-center"><p className="font-semibold">No smocks match those filters.</p><Link href="/shop" className="mt-3 inline-block text-terracotta underline">Clear filters</Link></div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </section>
      </div>
    </div>
  );
}
