import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { canSuspend } from '@/lib/permissions';
import { audit } from '@/lib/audit';

const schema = z.object({ action: z.enum(['suspend', 'reinstate']) });

// Suspend or reinstate a buyer or seller. A suspended seller's shop and listings disappear from the public site.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const target = await db.user.findUnique({ where: { id: params.id }, select: { id: true, role: true, email: true } });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (!canSuspend(admin, target)) return NextResponse.json({ error: 'You cannot suspend yourself or another admin.' }, { status: 403 });
  const suspend = parsed.data.action === 'suspend';
  await db.user.update({ where: { id: target.id }, data: { suspended: suspend } });
  await audit(admin.id, suspend ? 'user.suspend' : 'user.reinstate', 'User', target.id, { role: target.role });
  return NextResponse.json({ ok: true });
}
