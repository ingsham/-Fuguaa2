'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OCCASIONS, splitList } from '@/lib/utils';

export type ProductInitial = {
  id?: string; title: string; description: string; price: string; stock: string; photos: string[];
  sizes: string; colors: string; fabricType: string; occasionTags: string[]; sizeGuide: string;
};
export const emptyProduct: ProductInitial = { title: '', description: '', price: '', stock: '1', photos: [], sizes: '', colors: '', fabricType: '', occasionTags: [], sizeGuide: '' };

export default function ProductForm({ initial = emptyProduct, backHref }: { initial?: ProductInitial; backHref: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof ProductInitial, val: any) => setV((p) => ({ ...p, [k]: val }));

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErr(''); setUploading(true);
    for (const file of files) {
      if (v.photos.length >= 10) break;
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(`${file.name}: ${json.error || 'upload failed'}`); break; }
      setV((p) => ({ ...p, photos: [...p.photos, json.url] }));
    }
    setUploading(false);
    e.target.value = '';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const payload = {
      title: v.title, description: v.description || null, price: Number(v.price), stock: Number(v.stock), photos: v.photos,
      sizes: splitList(v.sizes), colors: splitList(v.colors), fabricType: v.fabricType || null, occasionTags: v.occasionTags, sizeGuide: v.sizeGuide || null,
    };
    const res = await fetch(v.id ? `/api/products/${v.id}` : '/api/products', { method: v.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(json.error || 'Could not save.'); setBusy(false); return; }
    router.push(backHref); router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md bg-cream p-4 text-sm"><b>Real photos only.</b> Upload photos of the actual smock you will send, in good light. Buyers can report listings that do not match what arrives.</div>
      <div><label className="label" htmlFor="title">Title</label><input id="title" required value={v.title} onChange={(e) => set('title', e.target.value)} className="input" /></div>
      <div><label className="label" htmlFor="description">Description <span className="font-normal text-ink/55">(optional)</span></label><textarea id="description" rows={4} value={v.description} onChange={(e) => set('description', e.target.value)} className="input" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label" htmlFor="price">Price (GHS)</label><input id="price" type="number" step="0.01" min="1" required value={v.price} onChange={(e) => set('price', e.target.value)} className="input" /></div>
        <div><label className="label" htmlFor="stock">Stock</label><input id="stock" type="number" min="0" required value={v.stock} onChange={(e) => set('stock', e.target.value)} className="input" /></div>
      </div>
      <div>
        <label className="label" htmlFor="photos">Photos <span className="font-normal text-ink/55">(from your device, up to 10, first one is the cover)</span></label>
        <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} disabled={uploading} className="input file:mr-3 file:rounded file:border-0 file:bg-cream file:px-3 file:py-1.5" />
        {uploading && <p role="status" className="mt-2 text-sm">Uploading...</p>}
        {v.photos.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3">
            {v.photos.map((u, i) => (
              <li key={u} className="relative h-28 w-24 overflow-hidden rounded border border-ink/15">
                <img src={u} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => set('photos', v.photos.filter((x) => x !== u))} className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs font-bold text-red-700" aria-label={`Remove photo ${i + 1}`}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="sizes">Sizes <span className="font-normal text-ink/55">(comma separated)</span></label><input id="sizes" value={v.sizes} onChange={(e) => set('sizes', e.target.value)} placeholder="M, L, XL or 2-3Y, 4-5Y" className="input" /></div>
        <div><label className="label" htmlFor="colors">Colours <span className="font-normal text-ink/55">(comma separated)</span></label><input id="colors" value={v.colors} onChange={(e) => set('colors', e.target.value)} placeholder="Indigo, Cream" className="input" /></div>
      </div>
      <div><label className="label" htmlFor="fabric">Fabric type</label><input id="fabric" value={v.fabricType} onChange={(e) => set('fabricType', e.target.value)} placeholder="Handwoven cotton" className="input" /></div>
      <fieldset><legend className="label">Occasions</legend>
        <div className="flex flex-wrap gap-4">{OCCASIONS.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={v.occasionTags.includes(o)} onChange={(e) => set('occasionTags', e.target.checked ? [...v.occasionTags, o] : v.occasionTags.filter((x) => x !== o))} />{o}</label>
        ))}</div></fieldset>
      <div><label className="label" htmlFor="sizeGuide">Size guide <span className="font-normal text-ink/55">(chest and shoulder measurements)</span></label><textarea id="sizeGuide" rows={3} value={v.sizeGuide} onChange={(e) => set('sizeGuide', e.target.value)} placeholder={'M: chest 104 cm, shoulder 46 cm\nL: chest 112 cm, shoulder 48 cm'} className="input" /></div>
      {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
      <div className="flex gap-3"><button disabled={busy || uploading} className="btn-primary">{busy ? 'Saving...' : v.id ? 'Save changes' : 'Publish listing'}</button><a href={backHref} className="btn-ghost">Cancel</a></div>
    </form>
  );
}
