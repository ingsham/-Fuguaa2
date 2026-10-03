import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sendEmail, sendSms } from '@/lib/notify';

const schema = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().trim().max(300).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const seller = await db.sellerProfile.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!seller || seller.verificationStatus !== 'PENDING') return NextResponse.json({ error: 'No pending submission for this seller.' }, { status: 409 });

  const approve = parsed.data.action === 'approve';
  await db.sellerProfile.update({
    where: { id: seller.id },
    data: { verificationStatus: approve ? 'VERIFIED' : 'REJECTED', rejectionReason: approve ? null : parsed.data.reason || null, reviewedAt: new Date() },
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  await Promise.all([
    sendEmail(seller.user.email, approve ? 'Your Fuguaa shop is approved' : 'Your Fuguaa verification needs attention',
      approve ? `<p>Welcome, ${seller.user.name}. You can now list smocks at <a href="${site}/dashboard/seller">${site}/dashboard/seller</a>.</p>`
              : `<p>We could not approve your ID${parsed.data.reason ? `: ${parsed.data.reason.replace(/</g, '&lt;')}` : '.'} You can submit it again at <a href="${site}/seller-onboarding">${site}/seller-onboarding</a>.</p>`),
    sendSms(seller.user.phone, approve ? 'Fuguaa: your shop is approved. You can now list smocks.' : 'Fuguaa: your ID verification needs attention. Please log in to resubmit.'),
  ]);
  return NextResponse.json({ ok: true });
}
