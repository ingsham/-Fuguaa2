'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SellerEditForm({ id, shopName, story, region }: { id: string; shopName: string; story: string; region: string }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/sellers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopName: f.get('shopName'), story: f.get('story'), region: f.get('region') }) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || 'Could not save.');
    setBusy(false); router.refresh();
  }
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-terracotta">Edit shop profile</summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div><label className="label" htmlFor={`n-${id}`}>Shop name</label><input id={`n-${id}`} name="shopName" required defaultValue={shopName} className="input" /></div>
        <div><label className="label" htmlFor={`r-${id}`}>Region</label><input id={`r-${id}`} name="region" defaultValue={region} className="input" /></div>
        <div><label className="label" htmlFor={`s-${id}`}>Story</label><textarea id={`s-${id}`} name="story" rows={3} defaultValue={story} className="input" /></div>
        {err && <p role="alert" className="text-red-700">{err}</p>}
        <button disabled={busy} className="btn-dark !py-1.5">{busy ? 'Saving...' : 'Save profile'}</button>
      </form>
    </details>
  );
}
