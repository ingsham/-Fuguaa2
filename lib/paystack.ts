import { createHmac, timingSafeEqual } from 'crypto';

const BASE = 'https://api.paystack.co';
const secret = () => {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return k;
};

export async function initTransaction(args: { email: string; amountGHS: number; reference: string; callbackUrl: string }) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: args.email, amount: Math.round(args.amountGHS * 100), currency: 'GHS', reference: args.reference,
      callback_url: args.callbackUrl, channels: ['mobile_money', 'card'],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack init failed');
  return json.data as { authorization_url: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack verify failed');
  return json.data as { status: string; amount: number; currency: string; reference: string };
}

export function validWebhookSignature(rawBody: string, signature: string | null, key = process.env.PAYSTACK_SECRET_KEY) {
  if (!signature || !key) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
