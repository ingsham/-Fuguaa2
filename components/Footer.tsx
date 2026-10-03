import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="weave-thick" aria-hidden />
      <div className="container-x grid gap-10 py-14 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <p className="text-2xl font-bold lowercase">fuguaa</p>
          <p className="mt-2 font-serif text-lg italic text-ochre">Three generations of craft</p>
          <p className="mt-4 max-w-sm text-sm text-cream/75">Handwoven smocks (fugu) from weavers across Ghana, for weddings, funerals, festivals and every day.</p>
        </div>
        <nav aria-label="Shop" className="text-sm">
          <p className="mb-3 font-semibold">Shop</p>
          <ul className="space-y-2 text-cream/80">
            <li><Link href="/shop" className="hover:text-white">All smocks</Link></li>
            <li><Link href="/shop?occasion=wedding" className="hover:text-white">Wedding</Link></li>
            <li><Link href="/shop?occasion=funeral" className="hover:text-white">Funeral</Link></li>
            <li><Link href="/shop?occasion=children" className="hover:text-white">Children</Link></li>
          </ul>
        </nav>
        <nav aria-label="Sellers" className="text-sm">
          <p className="mb-3 font-semibold">Weavers and sellers</p>
          <ul className="space-y-2 text-cream/80">
            <li><Link href="/signup/seller" className="font-semibold text-ochre hover:text-white">Apply to sell on Fuguaa</Link></li>
            <li><Link href="/login" className="hover:text-white">Seller log in</Link></li>
            <li><Link href="/orders" className="hover:text-white">Track an order</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-cream/15 py-5 text-center text-xs text-cream/60">© {new Date().getFullYear()} Fuguaa. Payments are processed securely by Paystack.</div>
    </footer>
  );
}
