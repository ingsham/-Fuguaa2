import test from 'node:test';
import assert from 'node:assert/strict';
import { sniffImage } from '../lib/image-sniff';

const pad = (b: number[]) => Buffer.from([...b, ...new Array(32).fill(0)]);

test('recognises real image signatures', () => {
  assert.equal(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(16)]);
  assert.equal(sniffImage(webp), 'image/webp');
});

test('rejects SVG, HTML, executables and empty files even if renamed .jpg', () => {
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniffImage(Buffer.from('<html><script>alert(1)</script></html>        ')), null);
  assert.equal(sniffImage(pad([0x4d, 0x5a])), null);
  assert.equal(sniffImage(Buffer.alloc(0)), null);
});
