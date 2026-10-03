import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().trim().min(7).max(20).regex(/^[+\d][\d\s-]+$/, 'Enter a valid phone number'),
  country: z.string().trim().min(2).max(60),
  role: z.enum(['BUYER', 'SELLER']),
});

export async function POST(req: Request) {
  if (!rateLimit(`signup:${clientIp(req)}`, 5, 10 * 60_000)) return NextResponse.json({ error: 'Too many sign-ups from this network. Try again later.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return NextResponse.json({ error: 'An account with this email already exists. Log in instead.' }, { status: 409 });
  await db.user.create({ data: { name: d.name, email: d.email, phone: d.phone, country: d.country, role: d.role, passwordHash: await bcrypt.hash(d.password, 12) } });
  return NextResponse.json({ ok: true });
}
