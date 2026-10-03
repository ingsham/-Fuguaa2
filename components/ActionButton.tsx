'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  url: string; method?: 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown>; label: string;
  variant?: 'primary' | 'ghost' | 'danger' | 'dark'; confirm?: string; promptReason?: string;
};

const VARIANTS = { primary: 'btn-primary', ghost: 'btn-ghost', danger: 'btn-danger', dark: 'btn-dark' } as const;

/** One button for every server action. Posts JSON, refreshes the page, shows errors inline. */
export default function ActionButton({ url, method = 'POST', body = {}, label, variant = 'ghost', confirm: confirmText, promptReason }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    let extra: Record<string, unknown> = {};
    if (promptReason) {
      const r = window.prompt(promptReason);
      if (!r || r.trim().length < 5) return;
      extra = { reason: r.trim() };
    }
    setBusy(true); setErr('');
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ...extra }) });
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error || 'Something went wrong.');
    setBusy(false);
    router.refresh();
  }
  return (
    <span className="inline-block">
      <button onClick={run} disabled={busy} className={`${VARIANTS[variant]} !px-3.5 !py-1.5`}>{busy ? 'Working...' : label}</button>
      {err && <span role="alert" className="ml-2 text-xs text-red-700">{err}</span>}
    </span>
  );
}
