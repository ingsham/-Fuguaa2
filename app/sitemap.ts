import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { liveSeller } from '@/lib/queries';
import { SITE_URL } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { id: string; createdAt: Date }[] = [];
  let sellers: { id: string }[] = [];
  try {
    products = await db.product.findMany({ where: { active: true, seller: liveSeller }, select: { id: true, createdAt: true } });
    sellers = await db.sellerProfile.findMany({ where: liveSeller, select: { id: true } });
  } catch {}
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: 0.9 },
    ...['wedding', 'funeral', 'festival', 'everyday', 'children'].map((o) => ({ url: `${SITE_URL}/shop?occasion=${o}`, priority: 0.7 })),
    ...products.map((p) => ({ url: `${SITE_URL}/product/${p.id}`, lastModified: p.createdAt, priority: 0.8 })),
    ...sellers.map((s) => ({ url: `${SITE_URL}/seller/${s.id}`, priority: 0.6 })),
  ];
}
