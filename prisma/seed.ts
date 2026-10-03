import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createCipheriv, randomBytes } from 'crypto';

const db = new PrismaClient();

function enc(text: string) {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (hex.length !== 64) throw new Error('Set ENCRYPTION_KEY (64 hex chars) before seeding');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), iv);
  const body = Buffer.concat([c.update(Buffer.from(text)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fuguaa.com';
  const admin = await db.user.upsert({
    where: { email: adminEmail }, update: {},
    create: { name: 'Fuguaa Admin', email: adminEmail, phone: process.env.ADMIN_PHONE || '+233200000000', country: 'Ghana', role: 'ADMIN', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'change-me-please', 12) },
  });
  await db.sellerProfile.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id, shopName: 'Fuguaa Official', story: 'Smocks curated by the Fuguaa team.', verificationStatus: 'VERIFIED', reviewedAt: new Date() } });

  const sellers = [
    { email: 'tamale.weavers@example.com', name: 'Abdul Rahman', shop: 'Tamale Loom House', region: 'Northern', story: 'Three generations at the loom. My grandfather taught my father, who taught me. Every strip is woven by hand in Tamale.' },
    { email: 'bolga.fugu@example.com', name: 'Akosua Ayamga', shop: 'Bolga Strips', region: 'Upper East', story: 'We weave fine cotton strips for weddings and festivals across the Upper East.' },
  ];
  const pw = await bcrypt.hash('Seller12345', 12);
  for (const s of sellers) {
    const u = await db.user.upsert({ where: { email: s.email }, update: {}, create: { name: s.name, email: s.email, phone: '+233240000000', country: 'Ghana', role: 'SELLER', passwordHash: pw } });
    const p = await db.sellerProfile.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, shopName: s.shop, story: s.story, region: s.region, idType: 'GHANA_CARD', idNumberEnc: enc('GHA-000000000-0'), verificationStatus: 'VERIFIED', reviewedAt: new Date() },
    });
    if ((await db.product.count({ where: { sellerId: p.id } })) === 0) {
      await db.product.createMany({
        data: [
          { sellerId: p.id, title: 'Classic Wedding Fugu', description: 'Fine handwoven cotton strips, lined for comfort. Made to be worn and remembered.', price: 850, stock: 6, photos: ['/seed/terracotta.svg'], sizes: ['M', 'L', 'XL'], colors: ['Terracotta', 'Gold'], fabricType: 'Handwoven cotton', occasionTags: ['wedding', 'festival'], sizeGuide: 'M: chest 104 cm, shoulder 46 cm\nL: chest 112 cm, shoulder 48 cm\nXL: chest 120 cm, shoulder 50 cm' },
          { sellerId: p.id, title: 'Indigo Funeral Smock', description: 'Deep indigo and dark strips, dignified and breathable.', price: 620, stock: 4, photos: ['/seed/indigo.svg'], sizes: ['M', 'L', 'XL'], colors: ['Indigo'], fabricType: 'Handwoven cotton', occasionTags: ['funeral'], sizeGuide: 'M: chest 104 cm\nL: chest 112 cm\nXL: chest 120 cm' },
          { sellerId: p.id, title: 'Little Weaver Kids Smock', description: 'A small smock with the same craft as the grown-up ones.', price: 280, stock: 10, photos: ['/seed/green.svg'], sizes: ['2-3Y', '4-5Y', '6-7Y'], colors: ['Green', 'Gold'], fabricType: 'Soft cotton', occasionTags: ['children', 'everyday'], sizeGuide: '2-3Y: chest 56 cm\n4-5Y: chest 62 cm\n6-7Y: chest 68 cm' },
        ],
      });
    }
  }
  console.log(`Seeded. Admin login: ${adminEmail}. Sample sellers use password Seller12345 (delete them before launch).`);
}
main().finally(() => db.$disconnect());
