// Email via Resend, SMS via Arkesel (Ghana). Both fail soft and time out: a provider outage must never
// break checkout or leave a request hanging. Failures are logged so you can see them in Vercel logs.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn(`[email skipped: RESEND_API_KEY not set] to=${to} subject=${subject}`); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Fuguaa <onboarding@resend.dev>', to, subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error('[email failed]', res.status, await res.text().catch(() => '')); return false; }
    return true;
  } catch (e) { console.error('[email failed]', e); return false; }
}

export function normalizeGhanaPhone(p: string) {
  const d = p.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return '233' + d.slice(1);
  return d;
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const key = process.env.ARKESEL_API_KEY;
  if (!key) { console.warn(`[sms skipped: ARKESEL_API_KEY not set] to=${to}`); return false; }
  try {
    const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: process.env.SMS_SENDER_ID || 'Fuguaa', message: message.slice(0, 300), recipients: [normalizeGhanaPhone(to)] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error('[sms failed]', res.status, await res.text().catch(() => '')); return false; }
    return true;
  } catch (e) { console.error('[sms failed]', e); return false; }
}

export const ghs = (n: number) => `GHS ${n.toFixed(2)}`;
