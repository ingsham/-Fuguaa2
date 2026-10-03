import { z } from 'zod';
import { OCCASIONS } from './utils';

/** Only photos uploaded through our own endpoints (or bundled seed art) are accepted. Never arbitrary URLs. */
export const isOurUpload = (u: string) =>
  u.startsWith('/uploads/') || u.startsWith('/seed/') || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(u);

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
export type ProductInput = z.infer<typeof productSchema>;
