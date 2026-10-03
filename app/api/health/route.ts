import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Open https://YOUR-SITE/api/health after deploying. It lists which settings are present (never their values)
// and whether the database is reachable with its tables created.
const REQUIRED = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'ENCRYPTION_KEY', 'PAYSTACK_SECRET_KEY', 'NEXT_PUBLIC_SITE_URL'];
const OPTIONAL = ['NEXTAUTH_URL', 'BLOB_READ_WRITE_TOKEN', 'RESEND_API_KEY', 'ARKESEL_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PHONE', 'CRON_SECRET'];

export async function GET() {
  const set = (k: string) => !!process.env[k];
  const missingRequired = REQUIRED.filter((k) => !set(k));
  const badKey = set('ENCRYPTION_KEY') && !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY || '');
  let database = 'ok';
  if (!set('DATABASE_URL')) database = 'DATABASE_URL is not set';
  else {
    try { await db.user.count(); }
    catch (e: any) { database = e?.code === 'P2021' || e?.code === 'P2022' ? 'Connected, but tables are missing. Run: npx prisma db push (with your production DATABASE_URL)' : `Cannot reach or query the database (${e?.code || 'error'}). Check DATABASE_URL.`; }
  }
  const ok = missingRequired.length === 0 && !badKey && database === 'ok';
  return NextResponse.json({
    ok, database, missingRequired,
    encryptionKeyInvalid: badKey ? 'ENCRYPTION_KEY must be exactly 64 hex characters' : undefined,
    optional: Object.fromEntries(OPTIONAL.map((k) => [k, set(k)])),
  }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
