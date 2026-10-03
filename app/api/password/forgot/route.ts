import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/notify';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/html';

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// Always answers the same way so nobody can use this to find out which emails have accounts.
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (parsed.success && rateLimit(`forgot-email:${parsed.data.email}`, 3, 60 * 60_000)) {
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (user && !user.suspended) {
      const token = randomBytes(32).toString('hex');
      await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60 * 60_000) } });
      const link = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password/${token}`;
      await sendEmail(user.email, 'Reset your Fuguaa password', `<p>Hi ${escapeHtml(user.name)}, use this link to choose a new password. It works once and expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email.</p>`);
    }
  }
  return NextResponse.json({ ok: true });
}
