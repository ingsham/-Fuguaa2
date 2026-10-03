import 'next-auth';
declare module 'next-auth' {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; role: 'BUYER' | 'SELLER' | 'ADMIN' };
  }
}
