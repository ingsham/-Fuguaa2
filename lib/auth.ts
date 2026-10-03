import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { rateLimit } from './rate-limit';
import type { Role } from './permissions';

let dummyHash: string | undefined;

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
        const ip = String((req?.headers as Record<string, string> | undefined)?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
        if (!rateLimit(`login-ip:${ip}`, 25, 5 * 60_000) || !rateLimit(`login:${ip}:${email}`, 8, 5 * 60_000)) throw new Error('Too many attempts. Try again in a few minutes.');
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          // same work as a real check so response time does not reveal which emails exist
          dummyHash ??= await bcrypt.hash('not-a-real-password', 12);
          await bcrypt.compare(password, dummyHash);
          return null;
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        if (user.suspended) throw new Error('This account has been suspended. Contact Fuguaa support.');
        return { id: user.id, name: user.name, email: user.email, role: user.role } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.uid = (user as { id: string }).id; token.role = (user as { role: Role }).role; }
      return token;
    },
    async session({ session, token }) {
      (session.user as { id?: unknown; role?: unknown }).id = token.uid;
      (session.user as { id?: unknown; role?: unknown }).role = token.role;
      return session;
    },
  },
};

export type SessionUser = { id: string; name: string; email: string; role: Role };

/**
 * The signed-in user, re-read from the database on every call. The JWT only proves who they are;
 * role and suspension always come from the database, so a demoted or suspended user loses access immediately.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const s = await getServerSession(authOptions);
  const id = (s?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const u = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, suspended: true } });
  if (!u || u.suspended) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}
