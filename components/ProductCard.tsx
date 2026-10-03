import Link from 'next/link';
import { ghsFormat } from '@/lib/utils';

type P = { id: string; title: string; price: number; photos: string[]; stock: number; seller: { shopName: string } };

export default function ProductCard({ p }: { p: P }) {
  return (
    <Link href={`/product/${p.id}`} className="group block overflow-hidden rounded-lg border border-ink/10 bg-white transition hover:border-ink/40">
      <div className="weave !h-1" aria-hidden />
      <div className="aspect-[4/5] overflow-hidden bg-cream">
        {p.photos[0] ? (
          <img src={p.photos[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/40">No photo</div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{p.title}</h3>
        <p className="mt-1 text-sm text-ink/60">{p.seller.shopName}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-terracotta">{ghsFormat(p.price)}</span>
          {p.stock <= 0 && <span className="badge bg-ink/10 text-ink/70">Sold out</span>}
        </div>
      </div>
    </Link>
  );
}
