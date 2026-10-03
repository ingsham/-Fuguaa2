// Email via Resend, SMS via Arkesel (Ghana). Both fail soft: a missing key logs instead of crashing checkout.
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return console.log(`[email skipped] to=${to} subject=${subject}`);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Fuguaa <onboarding@resend.dev>', to, subject, html }),
    });
    if (!res.ok) console.error('Resend error', res.status, await res.text());
  } catch (e) {
    console.error('Email failed', e);
  }
}

function normalizeGhanaPhone(p: string) {
  const d = p.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('0')) return '233' + d.slice(1);
  return d;
}

export async function sendSms(to: string, message: string) {
  const key = process.env.ARKESEL_API_KEY;
  if (!key) return console.log(`[sms skipped] to=${to} msg=${message}`);
  try {
    const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: process.env.SMS_SENDER_ID || 'Fuguaa', message, recipients: [normalizeGhanaPhone(to)] }),
    });
    if (!res.ok) console.error('Arkesel error', res.status, await res.text());
  } catch (e) {
    console.error('SMS failed', e);
  }
}

export const ghs = (n: number) => `GHS ${n.toFixed(2)}`;
