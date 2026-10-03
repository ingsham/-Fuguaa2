'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COUNTRIES = ['Ghana', 'Nigeria', 'Togo', "Côte d'Ivoire", 'Burkina Faso', 'United Kingdom', 'United States', 'Canada', 'Germany', 'South Africa'];

export default function SignupForm({ seller = false }: { seller?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, role: seller ? 'SELLER' : 'BUYER' }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(json.error || 'Could not create your account.'); setBusy(false); return; }
    const s = await signIn('credentials', { email: f.email, password: f.password, redirect: false });
    if (s?.error) { setErr('Account created. Please log in.'); setBusy(false); router.push('/login'); return; }
    router.push(seller ? '/seller-onboarding' : '/shop');
    router.refresh();
  }

  return (
    <div className="container-x max-w-md py-12">
      <h1 className="text-3xl font-bold">{seller ? 'Apply to sell on Fuguaa' : 'Create your account'}</h1>
      <p className="mt-2 text-ink/70">{seller ? 'Step 1 of 2. Next you will verify your identity so buyers can trust your shop.' : 'Shop handwoven smocks and track your orders.'}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" className="input" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /><p className="mt-1 text-xs text-ink/60">At least 8 characters.</p></div>
        <div><label className="label" htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="0241234567" className="input" />
          {seller && <p className="mt-1 text-xs text-ink/60">We text this number when you get an order.</p>}</div>
        <div><label className="label" htmlFor="country">Country</label><input id="country" name="country" list="countries" required defaultValue="Ghana" className="input" /><datalist id="countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist></div>
        {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Creating account...' : seller ? 'Create seller account' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-ink/70">Already have an account? <Link href="/login" className="font-semibold text-terracotta underline">Log in</Link></p>
    </div>
  );
}
