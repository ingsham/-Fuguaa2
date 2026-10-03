'use client';
import { useState } from 'react';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/password/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: new FormData(e.currentTarget).get('email') }) });
    if (res.status === 429) setErr('Too many requests. Please try again later.'); else setSent(true);
    setBusy(false);
  }
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="text-3xl font-bold">Reset your password</h1>
      {sent ? <p role="status" className="mt-6 rounded-lg bg-cream p-5">If an account exists for that email, we have sent a reset link. It works once and expires in 1 hour.</p> : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
          {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Sending...' : 'Send reset link'}</button>
        </form>
      )}
    </div>
  );
}
