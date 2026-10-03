import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import ProductForm from '@/components/ProductForm';

export const metadata = { title: 'Edit listing', robots: { index: false } };

export default async function Page({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role === 'BUYER') redirect('/login');
  const p = await db.product.findUnique({ where: { id: params.id }, include: { seller: true } });
  if (!p) notFound();
  if (user.role !== 'ADMIN' && p.seller.userId !== user.id) redirect('/dashboard/seller');
  return (
    <div className="container-x max-w-2xl py-10">
      <h1 className="text-3xl font-bold">Edit listing</h1>
      <p className="mb-6 text-sm text-ink/60">Shop: {p.seller.shopName}</p>
      <ProductForm
        backHref={user.role === 'ADMIN' ? '/dashboard/admin?tab=listings' : '/dashboard/seller'}
        initial={{ id: p.id, title: p.title, description: p.description || '', price: String(p.price), stock: String(p.stock), photos: p.photos, sizes: p.sizes.join(', '), colors: p.colors.join(', '), fabricType: p.fabricType || '', occasionTags: p.occasionTags, sizeGuide: p.sizeGuide || '' }}
      />
    </div>
  );
}
