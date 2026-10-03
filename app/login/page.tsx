'use client';
import { Suspense, useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await signIn('credentials', { email: f.get('email'), password: f.get('password'), redirect: false });
    if (res?.error) { setErr(res.error === 'CredentialsSignin' ? 'Email or password is incorrect.' : res.error); setBusy(false); return; }
    const role = (await getSession())?.user.role;
    const cb = params.get('callbackUrl');
    router.push(cb || (role === 'ADMIN' ? '/dashboard/admin' : role === 'SELLER' ? '/dashboard/seller' : '/shop'));
    router.refresh();
  }

  return (
    <div className="container-x max-w-md py-12">
      <h1 className="text-3xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        {err && <p role="alert" className="text-sm font-medium text-red-700">{err}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="mt-6 text-sm text-ink/70">New here? <Link href="/signup" className="font-semibold text-terracotta underline">Create an account</Link> or <Link href="/signup/seller" className="font-semibold text-terracotta underline">apply to sell</Link>.</p>
    </div>
  );
}
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
