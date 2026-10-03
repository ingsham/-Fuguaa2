import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptText, decryptText, encryptBuffer, decryptBuffer, hashId } from '../lib/crypto';

process.env.ENCRYPTION_KEY = 'ab'.repeat(32);

test('text round-trips and is not stored in the clear', () => {
  const enc = encryptText('GHA-123456789-0');
  assert.ok(!enc.includes('GHA'));
  assert.equal(decryptText(enc), 'GHA-123456789-0');
});

test('same text encrypts differently each time (random IV)', () => {
  assert.notEqual(encryptText('x'), encryptText('x'));
});

test('tampered ciphertext is rejected', () => {
  const buf = encryptBuffer(Buffer.from('secret photo bytes'));
  buf[buf.length - 1] ^= 0xff;
  assert.throws(() => decryptBuffer(buf));
});

test('hashId ignores case, spaces and dashes but separates different IDs', () => {
  assert.equal(hashId('gha-123 456'), hashId('GHA123456'));
  assert.notEqual(hashId('GHA123456'), hashId('GHA123457'));
});

test('a bad key is refused', () => {
  const good = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = 'short';
  assert.throws(() => encryptText('x'), /64 hex/);
  process.env.ENCRYPTION_KEY = good;
});
