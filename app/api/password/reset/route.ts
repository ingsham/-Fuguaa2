import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const schema = z.object({ token: z.string().length(64).regex(/^[0-9a-f]+$/), password: z.string().min(8, 'Password must be at least 8 characters').max(100) });

export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000)) return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return NextResponse.json({ error: 'This reset link has expired or was already used. Request a new one.' }, { status: 400 });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const used = await db.passwordResetToken.updateMany({ where: { id: rec.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count === 0) return NextResponse.json({ error: 'This reset link was already used.' }, { status: 400 });
  await db.user.update({ where: { id: rec.userId }, data: { passwordHash } });
  await db.passwordResetToken.deleteMany({ where: { userId: rec.userId, usedAt: null } });
  return NextResponse.json({ ok: true });
}
