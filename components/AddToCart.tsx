'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';

type P = { id: string; title: string; price: number; photo?: string; sizes: string[]; colors: string[]; stock: number; shopName: string };

function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="mt-5">
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button type="button" key={o} onClick={() => onChange(o)} aria-pressed={value === o}
            className={`rounded-md border px-3.5 py-2 text-sm font-medium ${value === o ? 'border-indigo bg-indigo text-white' : 'border-ink/25 hover:border-ink/60'}`}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}

export default function AddToCart({ product: p }: { product: P }) {
  const { add } = useCart();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState('');

  function onAdd() {
    if (p.sizes.length && !size) return setErr('Choose a size first.');
    if (p.colors.length && !color) return setErr('Choose a colour first.');
    setErr('');
    add({ productId: p.id, title: p.title, price: p.price, photo: p.photo, size: size || undefined, color: color || undefined, quantity: 1, stock: p.stock, shopName: p.shopName });
    setAdded(true);
  }

  return (
    <div>
      {p.sizes.length > 0 && <Choice label="Size" options={p.sizes} value={size} onChange={setSize} />}
      {p.colors.length > 0 && <Choice label="Colour" options={p.colors} value={color} onChange={setColor} />}
      {err && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{err}</p>}
      <button onClick={onAdd} disabled={p.stock <= 0} className="btn-primary mt-6 w-full sm:w-auto sm:min-w-56">{p.stock > 0 ? 'Add to cart' : 'Sold out'}</button>
      {added && <p role="status" className="mt-3 text-sm">Added to your cart. <Link href="/cart" className="font-semibold text-terracotta underline">View cart</Link></p>}
    </div>
  );
}
