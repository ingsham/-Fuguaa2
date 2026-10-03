import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import HeaderActions from './HeaderActions';

export default async function Header() {
  const user = await currentUser();
  const dash = user?.role === 'ADMIN' ? '/dashboard/admin' : user?.role === 'SELLER' ? '/dashboard/seller' : null;
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Fuguaa home">
          <img src="/logo-mark.png" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="text-xl font-bold lowercase tracking-tight">fuguaa</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex" aria-label="Main">
          <Link href="/shop" className="hover:text-terracotta">Shop smocks</Link>
          <Link href="/shop?occasion=wedding" className="hover:text-terracotta">Weddings</Link>
          <Link href="/shop?occasion=funeral" className="hover:text-terracotta">Funerals</Link>
          <Link href="/shop?occasion=children" className="hover:text-terracotta">Children</Link>
        </nav>
        <HeaderActions loggedIn={!!user} name={user?.name || ''} dashboardHref={dash} isBuyer={user?.role === 'BUYER'} />
      </div>
      <div className="weave" aria-hidden />
    </header>
  );
}
