import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { safe } from '@/lib/safe';
import { liveSeller } from '@/lib/queries';
import { jsonLd } from '@/lib/html';
import { ghsFormat, SITE_URL, DISPUTE_WINDOW_HOURS, firstName, avg } from '@/lib/utils';
import AddToCart from '@/components/AddToCart';
import Gallery from '@/components/Gallery';
import Stars from '@/components/Stars';

export const dynamic = 'force-dynamic';

const getProduct = (id: string) => safe('product', () => db.product.findFirst({ where: { id, active: true, seller: liveSeller }, include: { seller: true } }), null);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getProduct(params.id);
  if (!p) return { title: 'Smock not found', robots: { index: false } };
  const desc = (p.description || `Handwoven ${p.fabricType || ''} smock by ${p.seller.shopName}, Ghana.`).slice(0, 155);
  return {
    title: p.title, description: desc, alternates: { canonical: `/product/${p.id}` },
    openGraph: { title: p.title, description: desc, images: p.photos[0] ? [p.photos[0]] : ['/og.png'], type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await getProduct(params.id);
  if (!p) notFound();
  const reviews = await safe('product reviews', () => db.review.findMany({ where: { order: { items: { some: { productId: p.id } } } }, orderBy: { createdAt: 'desc' }, take: 20, include: { buyer: { select: { name: true } } } }), []);
  const rating = avg(reviews.map((r) => r.rating));
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.description || p.title,
    image: p.photos.map((u) => (u.startsWith('/') ? `${SITE_URL}${u}` : u)), brand: { '@type': 'Brand', name: p.seller.shopName },
    offers: { '@type': 'Offer', url: `${SITE_URL}/product/${p.id}`, priceCurrency: 'GHS', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };
  if (reviews.length) ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: rating.toFixed(1), reviewCount: reviews.length };

  return (
    <div className="container-x py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="grid gap-10 md:grid-cols-2">
        <Gallery photos={p.photos} title={p.title} />
        <div>
          <h1 className="text-3xl font-bold leading-tight">{p.title}</h1>
          <p className="mt-2 text-sm">Sold by <Link href={`/seller/${p.seller.id}`} className="font-semibold text-terracotta underline">{p.seller.shopName}</Link>
            <span className="badge ml-2 bg-kente/15 text-kente">Identity verified</span></p>
          {reviews.length > 0 && <p className="mt-2 text-sm"><Stars value={rating} /> <span className="text-ink/60">{rating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span></p>}
          <p className="mt-4 text-3xl font-bold text-terracotta">{ghsFormat(p.price)}</p>
          {p.description && <p className="mt-5 whitespace-pre-line text-ink/80">{p.description}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {p.fabricType && <div><dt className="text-ink/55">Material</dt><dd className="font-medium">{p.fabricType}</dd></div>}
            {p.occasionTags.length > 0 && <div><dt className="text-ink/55">Occasions</dt><dd className="font-medium capitalize">{p.occasionTags.join(', ')}</dd></div>}
            <div><dt className="text-ink/55">In stock</dt><dd className="font-medium">{p.stock > 0 ? p.stock : 'Sold out'}</dd></div>
          </dl>
          <AddToCart product={{ id: p.id, title: p.title, price: p.price, photo: p.photos[0], sizes: p.sizes, colors: p.colors, stock: p.stock, shopName: p.seller.shopName }} />
          <div className="mt-6 rounded-lg bg-cream p-4 text-sm">
            <p className="font-semibold">Buyer protection</p>
            <p className="mt-1">Your payment is held until you confirm receipt. Not as described? Report it within {DISPUTE_WINDOW_HOURS} hours of delivery.</p>
          </div>
          {p.sizeGuide && <details className="mt-4 rounded-lg border border-ink/15 p-4 text-sm"><summary className="cursor-pointer font-semibold">Size guide</summary><p className="mt-3 whitespace-pre-line">{p.sizeGuide}</p></details>}
        </div>
      </div>
      {reviews.length > 0 && (
        <section className="mt-14" aria-labelledby="rev">
          <h2 id="rev" className="text-2xl font-bold">Reviews from verified buyers</h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-ink/15 p-4">
                <Stars value={r.rating} /> <span className="ml-1 text-sm font-semibold">{firstName(r.buyer.name)}</span>
                {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
