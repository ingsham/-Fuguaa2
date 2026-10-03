import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { decryptBuffer } from '@/lib/crypto';

export const runtime = 'nodejs';

// Admin-only. The photo is stored encrypted and is never exposed on a public URL.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });
  const doc = await db.idDocument.findUnique({ where: { sellerId: params.id } });
  if (!doc) return new NextResponse('Not found', { status: 404 });
  const bytes = decryptBuffer(Buffer.from(doc.dataEnc));
  return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': doc.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
