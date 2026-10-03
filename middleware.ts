export { default } from 'next-auth/middleware';
export const config = {
  matcher: ['/dashboard/:path*', '/orders/:path*', '/checkout/:path*', '/seller-onboarding'],
};
