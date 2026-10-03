import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { rateLimit } from './rate-limit';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: { email: {}, password: {} },
      async authorize(creds, req) {
        const email = String(creds?.email || '').toLowerCase().trim();
        const password = String(creds?.password || '');
        const ip = (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0] || 'unknown';
        if (!rateLimit(`login:${ip}:${email}`, 8, 5 * 60_000)) throw new Error('Too many attempts. Try again in a few minutes.');
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.uid;
      (session.user as any).role = token.role;
      return session;
    },
  },
};

export type SessionUser = { id: string; name?: string | null; email?: string | null; role: 'BUYER' | 'SELLER' | 'ADMIN' };

export async function currentUser(): Promise<SessionUser | null> {
  const s = await getServerSession(authOptions);
  return (s?.user as SessionUser) || null;
}
