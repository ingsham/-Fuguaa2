import Link from 'next/link';
import { db } from '@/lib/db';
import ProductCard from '@/components/ProductCard';

export const revalidate = 300;

const OCCASION_TILES = [
  { tag: 'wedding', label: 'Wedding', note: 'Fine weaves for the big day', bg: 'bg-terracotta text-white' },
  { tag: 'funeral', label: 'Funeral', note: 'Dignified, deep-toned smocks', bg: 'bg-indigo text-white' },
  { tag: 'festival', label: 'Festival', note: 'Bold stripes for celebration', bg: 'bg-ochre text-ink' },
  { tag: 'everyday', label: 'Everyday', note: 'Light, easy daily wear', bg: 'bg-kente text-white' },
  { tag: 'children', label: 'Children', note: 'Small sizes, same craft', bg: 'bg-cream text-ink' },
];

export default async function Home() {
  const [products, sellers] = await Promise.all([
    db.product.findMany({ where: { active: true, seller: { verificationStatus: 'VERIFIED' } }, orderBy: { createdAt: 'desc' }, take: 8, include: { seller: { select: { shopName: true } } } }),
    db.sellerProfile.findMany({ where: { verificationStatus: 'VERIFIED' }, take: 3, orderBy: { createdAt: 'asc' }, include: { _count: { select: { products: true } } } }),
  ]);

  return (
    <>
      <section className="container-x grid items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Smocks woven by hand, sent to your door.</h1>
          <p className="mt-5 font-serif text-2xl italic text-terracotta">Three generations of craft</p>
          <p className="mt-5 max-w-lg text-lg text-ink/75">Shop handwoven Ghanaian smocks from weavers whose identity we check before they sell. Pay with MTN, Vodafone or AirtelTigo Mobile Money, or card.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">Shop smocks</Link>
            <Link href="/signup/seller" className="btn-ghost">Sell your smocks</Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-full border-[6px] border-ink" aria-hidden>
          <div className="absolute inset-0" style={{ backgroundImage: 'var(--weave)', backgroundSize: '100% 100%' }} />
          <div className="absolute inset-x-0 top-[34%] h-4 bg-ink/20" />
          <div className="absolute inset-x-0 top-[62%] h-4 bg-ink/20" />
        </div>
      </section>

      <section className="container-x" aria-labelledby="occ">
        <h2 id="occ" className="text-2xl font-bold">Shop by occasion</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {OCCASION_TILES.map((t) => (
            <Link key={t.tag} href={`/shop?occasion=${t.tag}`} className={`${t.bg} flex min-h-36 flex-col justify-end rounded-lg p-4 transition hover:-translate-y-0.5`}>
              <span className="text-lg font-bold">{t.label}</span>
              <span className="text-sm opacity-85">{t.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x mt-16" aria-labelledby="new">
        <div className="flex items-end justify-between">
          <h2 id="new" className="text-2xl font-bold">New from the looms</h2>
          <Link href="/shop" className="text-sm font-semibold text-terracotta hover:underline">See all smocks</Link>
        </div>
        {products.length === 0 ? (
          <p className="mt-6 rounded-lg bg-cream p-8 text-center">No smocks are listed yet. Check back soon.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>

      {sellers.length > 0 && (
        <section className="container-x mt-16" aria-labelledby="weavers">
          <h2 id="weavers" className="text-2xl font-bold">Meet the weavers</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {sellers.map((s) => (
              <Link key={s.id} href={`/seller/${s.id}`} className="rounded-lg border border-ink/10 p-5 transition hover:border-ink/40">
                <p className="text-lg font-bold">{s.shopName}</p>
                <p className="text-sm text-ink/60">{s.region || 'Ghana'} · {s._count.products} smocks</p>
                {s.story && <p className="mt-3 line-clamp-4 font-serif text-lg italic leading-snug text-ink/80">{s.story}</p>}
                <span className="badge mt-4 bg-kente/15 text-kente">Identity verified</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-x mt-16">
        <div className="rounded-lg bg-cream p-8 md:p-10">
          <h2 className="text-2xl font-bold">Buy with confidence</h2>
          <p className="mt-3 max-w-2xl">Your payment is held until you confirm your smock arrived. If it is not as described, report it within 72 hours of delivery and we will review it.</p>
        </div>
      </section>
    </>
  );
}
