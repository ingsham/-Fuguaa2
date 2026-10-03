import { NextResponse } from 'next/server';
import { validWebhookSignature } from '@/lib/paystack';
import { markPaid } from '@/lib/orders';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  const event = JSON.parse(raw);
  if (event.event === 'charge.success' && event.data?.currency === 'GHS') await markPaid(event.data.reference);
  return NextResponse.json({ ok: true });
}
