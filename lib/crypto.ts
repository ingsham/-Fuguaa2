import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32)');
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM. Output layout: iv(12) | tag(16) | ciphertext */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}

export function decryptBuffer(data: Buffer): Buffer {
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const d = createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data.subarray(28)), d.final()]);
}

export const encryptText = (t: string) => encryptBuffer(Buffer.from(t, 'utf8')).toString('base64');
export const decryptText = (t: string) => decryptBuffer(Buffer.from(t, 'base64')).toString('utf8');

/** Stable keyed hash so the same ID number on two accounts can be detected without storing it in the clear. */
export const hashId = (t: string) => createHmac('sha256', key()).update(t.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
