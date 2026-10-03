import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

const pageAuth = withAuth({ pages: { signIn: '/login' } });
// Called by Paystack / Vercel cron / NextAuth themselves, not by our own browser pages.
const NO_ORIGIN_CHECK = ['/api/paystack/webhook', '/api/cron/', '/api/auth/'];

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    // CSRF defence in depth: browsers always send Origin on cross-site POSTs. Reject any that is not us.
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !NO_ORIGIN_CHECK.some((p) => pathname.startsWith(p))) {
      const origin = req.headers.get('origin');
      if (origin) {
        let host = '';
        try { host = new URL(origin).host; } catch {}
        if (host !== req.headers.get('host')) return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
      }
    }
    return NextResponse.next();
  }
  // Pages that need a login. Role checks happen on the server in each page and API route.
  return (pageAuth as unknown as (r: NextRequest, e: NextFetchEvent) => Response | Promise<Response>)(req, event);
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/orders/:path*', '/checkout/:path*', '/seller-onboarding'],
};
