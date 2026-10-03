'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REGIONS } from '@/lib/utils';
import { compressImage } from '@/lib/client-image';

export default function OnboardingForm({ initial }: { initial: { shopName: string; story: string; region: string } }) {
  const router = useRouter();
  const [idType, setIdType] = useState('GHANA_CARD');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const fd = new FormData(e.currentTarget);
    const photo = fd.get('idPhoto');
    if (photo instanceof File && photo.size > 0) fd.set('idPhoto', await compressImage(photo, 2200, 0.9));
    const res = await fetch('/api/seller/onboarding', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(json.error || 'Could not submit. Try again.'); setBusy(false); return; }
    router.push('/dashboard/seller'); router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div><label className="label" htmlFor="shopName">Shop name</label><input id="shopName" name="shopName" required defaultValue={initial.shopName} className="input" /></div>
      <div><label className="label" htmlFor="story">Your story <span className="font-normal text-ink/55">(optional, shown on your shop page)</span></label>
        <textarea id="story" name="story" rows={4} maxLength={2000} defaultValue={initial.story} className="input" placeholder="Who taught you to weave? How long has your family been at the loom?" /></div>
      <div><label className="label" htmlFor="region">Region <span className="font-normal text-ink/55">(optional)</span></label>
        <input id="region" name="region" list="regions" defaultValue={initial.region} className="input" placeholder="e.g. Northern" /><datalist id="regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist></div>
      <div><label className="label" htmlFor="idType">ID type</label>
        <select id="idType" name="idType" value={idType} onChange={(e) => setIdType(e.target.value)} className="input"><option value="GHANA_CARD">Ghana Card</option><option value="PASSPORT">Passport (for sellers outside Ghana)</option></select></div>
      <div><label className="label" htmlFor="idNumber">{idType === 'GHANA_CARD' ? 'Ghana Card number' : 'Passport number'}</label>
        <input id="idNumber" name="idNumber" required autoComplete="off" placeholder={idType === 'GHANA_CARD' ? 'GHA-000000000-0' : 'G1234567'} className="input" /></div>
      <div><label className="label" htmlFor="idPhoto">Photo of your {idType === 'GHANA_CARD' ? 'Ghana Card' : 'passport'} (front)</label>
        <input id="idPhoto" name="idPhoto" type="file" accept="image/jpeg,image/png,image/webp" required className="input file:mr-3 file:rounded file:border-0 file:bg-cream file:px-3 file:py-1.5" />
        <p className="mt-1 text-xs text-ink/60">Choose a photo from your device. JPG, PNG or WebP. Large photos are shrunk automatically. Make sure all text is readable.</p></div>
      {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Submitting...' : 'Submit for verification'}</button>
    </form>
  );
}
