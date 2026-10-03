import { db } from './db';

/** Admins get a verified house shop so they can list products with seller powers. */
export async function ensureSellerProfileFor(user: { id: string; role: string }) {
  const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } });
  if (existing || user.role !== 'ADMIN') return existing;
  return db.sellerProfile.create({
    data: { userId: user.id, shopName: 'Fuguaa Official', story: 'Smocks curated by the Fuguaa team.', verificationStatus: 'VERIFIED', reviewedAt: new Date() },
  });
}
