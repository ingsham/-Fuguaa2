import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import OnboardingForm from '@/components/OnboardingForm';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Verify your shop', robots: { index: false } };

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect('/login?callbackUrl=/seller-onboarding');
  if (user.role !== 'SELLER') redirect('/');
  const profile = await db.sellerProfile.findUnique({ where: { userId: user.id } });

  if (profile?.verificationStatus === 'PENDING' || profile?.verificationStatus === 'VERIFIED') {
    return (
      <div className="container-x max-w-xl py-14">
        <h1 className="text-3xl font-bold">{profile.verificationStatus === 'VERIFIED' ? 'You are verified' : 'Your ID is under review'}</h1>
        <p className="mt-3 text-ink/75">{profile.verificationStatus === 'VERIFIED' ? 'You can list smocks now.' : 'We check each ID by hand. You will be able to list smocks as soon as you are approved.'}</p>
        <Link href="/dashboard/seller" className="btn-primary mt-6">Go to your dashboard</Link>
      </div>
    );
  }
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="text-3xl font-bold">Verify your shop</h1>
      <p className="mt-2 text-ink/70">Step 2 of 2. Your ID is encrypted, only used to verify you, and never shown to buyers.</p>
      {profile?.verificationStatus === 'REJECTED' && (
        <p role="alert" className="mt-5 rounded-md bg-red-50 p-4 text-sm text-red-800">Your last submission was not approved{profile.rejectionReason ? `: ${profile.rejectionReason}` : '.'} Please correct the details and submit again.</p>
      )}
      <OnboardingForm initial={{ shopName: profile?.shopName || '', story: profile?.story || '', region: profile?.region || '' }} />
    </div>
  );
}
