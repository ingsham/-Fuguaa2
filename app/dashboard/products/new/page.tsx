import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureSellerProfileFor } from '@/lib/products';
import ProductForm from '@/components/ProductForm';

export const metadata = { title: 'New listing', robots: { index: false } };

export default async function Page() {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') redirect('/login');
  const profile = await ensureSellerProfileFor(user);
  if (!profile || profile.verificationStatus !== 'VERIFIED') redirect('/dashboard/seller');
  return (
    <div className="container-x max-w-2xl py-10">
      <h1 className="mb-6 text-3xl font-bold">New listing</h1>
      <ProductForm backHref="/dashboard/seller" />
    </div>
  );
}
