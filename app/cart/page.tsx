'use client';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { ghsFormat } from '@/lib/utils';

export default function CartPage() {
  const { lines, total, setQty, remove } = useCart();
  if (!lines.length) return (
    <div className="container-x py-20 text-center">
      <h1 className="text-3xl font-bold">Your cart is empty</h1>
      <Link href="/shop" className="btn-primary mt-6">Browse smocks</Link>
    </div>
  );
  const shops = new Set(lines.map((l) => l.shopName)).size;
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-4 py-5">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded bg-cream">{l.photo && <img src={l.photo} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1">
                <Link href={`/product/${l.productId}`} className="font-semibold hover:text-terracotta">{l.title}</Link>
                <p className="text-sm text-ink/60">{l.shopName}{l.size ? ` · ${l.size}` : ''}{l.color ? ` · ${l.color}` : ''}</p>
                <div className="mt-3 flex items-center gap-4">
                  <label className="text-sm">Qty <input type="number" min={1} max={l.stock} value={l.quantity} onChange={(e) => setQty(l.key, Number(e.target.value))} className="input ml-2 !w-20 !py-1.5" /></label>
                  <button onClick={() => remove(l.key)} className="text-sm text-red-700 underline">Remove</button>
                </div>
              </div>
              <p className="font-bold">{ghsFormat(l.price * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-lg bg-cream p-5">
          <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{ghsFormat(total)}</span></p>
          {shops > 1 && <p className="mt-2 text-sm text-ink/70">Your items come from {shops} shops, so you will get {shops} separate orders.</p>}
          <Link href="/checkout" className="btn-primary mt-5 w-full">Go to checkout</Link>
        </aside>
      </div>
    </div>
  );
}
