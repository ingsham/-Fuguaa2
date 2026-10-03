import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ghsFormat, SITE_URL, DISPUTE_WINDOW_HOURS } from '@/lib/utils';
import AddToCart from '@/components/AddToCart';
import Gallery from '@/components/Gallery';

async function getProduct(id: string) {
  return db.product.findFirst({ where: { id, active: true }, include: { seller: true } });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getProduct(params.id);
  if (!p) return { title: 'Smock not found' };
  const desc = (p.description || `Handwoven ${p.fabricType || ''} smock by ${p.seller.shopName}, Ghana.`).slice(0, 155);
  return {
    title: p.title, description: desc, alternates: { canonical: `/product/${p.id}` },
    openGraph: { title: p.title, description: desc, images: p.photos[0] ? [p.photos[0]] : ['/og.png'], type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await getProduct(params.id);
  if (!p) notFound();
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.description || p.title,
    image: p.photos, brand: { '@type': 'Brand', name: p.seller.shopName },
    offers: { '@type': 'Offer', url: `${SITE_URL}/product/${p.id}`, priceCurrency: 'GHS', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };
  return (
    <div className="container-x py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-10 md:grid-cols-2">
        <Gallery photos={p.photos} title={p.title} />
        <div>
          <h1 className="text-3xl font-bold leading-tight">{p.title}</h1>
          <p className="mt-2 text-sm">Sold by <Link href={`/seller/${p.seller.id}`} className="font-semibold text-terracotta underline">{p.seller.shopName}</Link>
            {p.seller.verificationStatus === 'VERIFIED' && <span className="badge ml-2 bg-kente/15 text-kente">Identity verified</span>}</p>
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
          {p.sizeGuide && (
            <details className="mt-4 rounded-lg border border-ink/15 p-4 text-sm"><summary className="cursor-pointer font-semibold">Size guide</summary><p className="mt-3 whitespace-pre-line">{p.sizeGuide}</p></details>
          )}
        </div>
      </div>
    </div>
  );
}
