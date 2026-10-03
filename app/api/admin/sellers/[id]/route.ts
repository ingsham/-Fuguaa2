import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sendEmail, sendSms } from '@/lib/notify';
import { escapeHtml as e } from '@/lib/html';
import { audit } from '@/lib/audit';

const decision = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().trim().max(300).optional() });
const profileEdit = z.object({ shopName: z.string().trim().min(2).max(80), story: z.string().trim().max(2000).nullable().optional(), region: z.string().trim().max(60).nullable().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = decision.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const seller = await db.sellerProfile.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!seller) return NextResponse.json({ error: 'Seller not found.' }, { status: 404 });
  const approve = parsed.data.action === 'approve';
  // Conditional update: two admins clicking at once cannot both act on the same submission.
  const r = await db.sellerProfile.updateMany({
    where: { id: seller.id, verificationStatus: 'PENDING' },
    data: { verificationStatus: approve ? 'VERIFIED' : 'REJECTED', rejectionReason: approve ? null : parsed.data.reason || null, reviewedAt: new Date() },
  });
  if (r.count === 0) return NextResponse.json({ error: 'No pending submission for this seller.' }, { status: 409 });
  await audit(admin.id, approve ? 'seller.approve' : 'seller.reject', 'SellerProfile', seller.id, { shop: seller.shopName, reason: parsed.data.reason });

  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  await Promise.all([
    sendEmail(seller.user.email, approve ? 'Your Fuguaa shop is approved' : 'Your Fuguaa verification needs attention',
      approve ? `<p>Welcome, ${e(seller.user.name)}. You can now list smocks at <a href="${site}/dashboard/seller">${site}/dashboard/seller</a>.</p>`
              : `<p>We could not approve your ID${parsed.data.reason ? `: ${e(parsed.data.reason)}` : '.'} You can submit it again at <a href="${site}/seller-onboarding">${site}/seller-onboarding</a>.</p>`),
    sendSms(seller.user.phone, approve ? 'Fuguaa: your shop is approved. You can now list smocks.' : 'Fuguaa: your ID verification needs attention. Please log in to resubmit.'),
  ]);
  return NextResponse.json({ ok: true });
}

// Admin edits a seller's shop profile (name, story, region).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = profileEdit.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const before = await db.sellerProfile.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: 'Seller not found.' }, { status: 404 });
  await db.sellerProfile.update({ where: { id: before.id }, data: { shopName: parsed.data.shopName, story: parsed.data.story || null, region: parsed.data.region || null } });
  await audit(admin.id, 'seller.edit', 'SellerProfile', before.id, { from: { shop: before.shopName, region: before.region }, to: { shop: parsed.data.shopName, region: parsed.data.region || null } });
  return NextResponse.json({ ok: true });
}
