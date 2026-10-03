import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { decryptBuffer } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin-only. The photo is stored encrypted, never on a public URL, and every view is logged.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });
  const doc = await db.idDocument.findUnique({ where: { sellerId: params.id } });
  if (!doc) return new NextResponse('Not found', { status: 404 });
  let bytes: Buffer;
  try { bytes = decryptBuffer(Buffer.from(doc.dataEnc)); } catch { return new NextResponse('Could not decrypt (check ENCRYPTION_KEY)', { status: 500 }); }
  await audit(admin.id, 'seller.view_id_photo', 'SellerProfile', params.id);
  return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': doc.mimeType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
