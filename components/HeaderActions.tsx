'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useCart } from './CartProvider';

export default function HeaderActions({ loggedIn, name, dashboardHref, isBuyer }: { loggedIn: boolean; name: string; dashboardHref: string | null; isBuyer: boolean }) {
  const { count } = useCart();
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/cart" className="relative rounded-md px-2 py-1.5 font-medium hover:text-terracotta" aria-label={`Cart, ${count} items`}>
        Cart{count > 0 && <span className="ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-xs text-white">{count}</span>}
      </Link>
      {loggedIn ? (
        <>
          {dashboardHref && <Link href={dashboardHref} className="font-medium hover:text-terracotta">Dashboard</Link>}
          <Link href="/orders" className="hidden font-medium hover:text-terracotta sm:inline">Orders</Link>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-ghost !py-1.5" title={name}>Sign out</button>
        </>
      ) : (
        <>
          <Link href="/login" className="font-medium hover:text-terracotta">Log in</Link>
          <Link href="/signup" className="btn-primary !py-1.5">Create account</Link>
        </>
      )}
    </div>
  );
}
