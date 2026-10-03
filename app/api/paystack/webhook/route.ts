import { NextResponse } from 'next/server';
import { validWebhookSignature } from '@/lib/paystack';
import { markPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (event.event === 'charge.success' && event.data?.status === 'success' && typeof event.data.reference === 'string') {
    try {
      await markPaid(event.data.reference, { amountPesewas: Number(event.data.amount), currency: String(event.data.currency) });
    } catch (e) {
      console.error('[webhook markPaid failed]', e);
      return NextResponse.json({ error: 'retry' }, { status: 500 }); // non-2xx makes Paystack retry later
    }
  }
  return NextResponse.json({ ok: true });
}
