'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: new FormData(e.currentTarget).get('password') }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setErr(json.error || 'Could not reset your password.'); else setDone(true);
    setBusy(false);
  }
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      {done ? <p role="status" className="mt-6 rounded-lg bg-cream p-5">Password updated. <Link href="/login" className="font-semibold text-terracotta underline">Log in</Link></p> : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /><p className="mt-1 text-xs text-ink/60">At least 8 characters.</p></div>
          {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Saving...' : 'Update password'}</button>
        </form>
      )}
    </div>
  );
}
