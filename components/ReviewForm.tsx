'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr('Choose a star rating.');
    setBusy(true); setErr('');
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, rating, comment: comment || undefined }) });
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error || 'Could not save your review.'); setBusy(false); return; }
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-4 rounded-lg bg-cream p-4">
      <fieldset><legend className="text-sm font-semibold">How was your smock?</legend>
        <div className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={rating === n} className={`text-2xl ${n <= rating ? 'text-ochre' : 'text-ink/25'}`}>★</button>
        ))}</div></fieldset>
      <label className="label mt-3" htmlFor={`c-${orderId}`}>Comment <span className="font-normal text-ink/55">(optional)</span></label>
      <textarea id={`c-${orderId}`} rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
      {err && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{err}</p>}
      <button disabled={busy} className="btn-dark mt-3 !py-1.5">{busy ? 'Saving...' : 'Post review'}</button>
    </form>
  );
}
