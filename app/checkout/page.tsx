'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { ghsFormat } from '@/lib/utils';

export default function CheckoutPage() {
  const { lines, total } = useCart();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, size: l.size, color: l.color })), shipping: { name: f.name, phone: f.phone, address: f.address } }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(json.error || 'Checkout failed. Try again.'); setBusy(false); return; }
    window.location.href = json.url; // Paystack hosted page: Mobile Money or card
  }

  if (!lines.length) return <div className="container-x py-20 text-center"><h1 className="text-3xl font-bold">Nothing to check out</h1><Link href="/shop" className="btn-primary mt-6">Browse smocks</Link></div>;

  return (
    <div className="container-x max-w-4xl py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4">
          <h2 className="text-lg font-bold">Delivery details</h2>
          <div><label className="label" htmlFor="name">Receiver name</label><input id="name" name="name" required className="input" /></div>
          <div><label className="label" htmlFor="phone">Phone for the courier</label><input id="phone" name="phone" type="tel" required className="input" /></div>
          <div><label className="label" htmlFor="address">Delivery address</label><textarea id="address" name="address" required rows={3} className="input" placeholder="Town, street, landmark" /></div>
          {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Opening Paystack...' : `Pay ${ghsFormat(total)}`}</button>
          <p className="text-xs text-ink/60">You will pay on Paystack with MTN, Vodafone or AirtelTigo Mobile Money, or a card. Fuguaa never sees your payment details.</p>
        </form>
        <aside className="h-fit rounded-lg bg-cream p-5">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-3 space-y-2 text-sm">{lines.map((l) => <li key={l.key} className="flex justify-between gap-3"><span>{l.quantity} × {l.title}{l.size ? ` (${l.size})` : ''}</span><span>{ghsFormat(l.price * l.quantity)}</span></li>)}</ul>
          <p className="mt-4 flex justify-between border-t border-ink/15 pt-3 font-bold"><span>Total</span><span>{ghsFormat(total)}</span></p>
          <p className="mt-3 text-xs text-ink/70">Your payment is held until you confirm your order arrived.</p>
        </aside>
      </div>
    </div>
  );
}
