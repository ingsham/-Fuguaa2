import test from 'node:test';
import assert from 'node:assert/strict';
import { productSchema, isOurUpload } from '../lib/product-schema';

const base = { title: 'Wedding Fugu', price: 850, stock: 3, photos: ['/uploads/a.jpg'], sizes: ['M'], colors: ['Gold'], occasionTags: ['wedding'] as const };

test('only our own uploads are accepted as photos, never arbitrary URLs', () => {
  assert.equal(isOurUpload('/uploads/a.jpg'), true);
  assert.equal(isOurUpload('https://abc123.public.blob.vercel-storage.com/products/x.jpg'), true);
  assert.equal(isOurUpload('https://evil.example.com/x.jpg'), false);
  assert.equal(isOurUpload('javascript:alert(1)'), false);
  assert.equal(isOurUpload('data:text/html;base64,AAAA'), false);
});

test('valid product passes; bad price, stock, tag and empty photos fail', () => {
  assert.equal(productSchema.safeParse(base).success, true);
  assert.equal(productSchema.safeParse({ ...base, price: -5 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, stock: 1.5 }).success, false);
  assert.equal(productSchema.safeParse({ ...base, occasionTags: ['party'] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, photos: [] }).success, false);
  assert.equal(productSchema.safeParse({ ...base, photos: ['http://evil.com/a.jpg'] }).success, false);
});
