import { z } from 'zod';
import { db } from './db';
import { OCCASIONS } from './utils';

const isOurUpload = (u: string) => u.startsWith('/uploads/') || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(u);

export const productSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).optional().nullable(),
  price: z.number().positive().max(100000),
  stock: z.number().int().min(0).max(100000),
  photos: z.array(z.string().refine(isOurUpload, 'Photos must be uploaded from your device')).min(1, 'Add at least one photo').max(10),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20),
  colors: z.array(z.string().trim().min(1).max(30)).max(20),
  fabricType: z.string().trim().max(60).optional().nullable(),
  occasionTags: z.array(z.enum(OCCASIONS)).max(5),
  sizeGuide: z.string().trim().max(1500).optional().nullable(),
});

/** Admins get a verified house shop so they can list products with seller powers. */
export async function ensureSellerProfileFor(user: { id: string; role: string }) {
  const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  if (existing || user.role !== 'ADMIN') return existing;
  return db.sellerProfile.create({
    data: { userId: user.id, shopName: 'Fuguaa Official', story: 'Smocks curated by the Fuguaa team.', verificationStatus: 'VERIFIED', reviewedAt: new Date() },
  });
}
