import test from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../lib/rate-limit';

test('blocks after the limit and recovers after the window', () => {
  const t = 1_000_000;
  assert.ok(rateLimit('k1', 3, 1000, t));
  assert.ok(rateLimit('k1', 3, 1000, t + 1));
  assert.ok(rateLimit('k1', 3, 1000, t + 2));
  assert.equal(rateLimit('k1', 3, 1000, t + 3), false);
  assert.ok(rateLimit('k1', 3, 1000, t + 2000));
});

test('keys are independent', () => {
  assert.ok(rateLimit('a', 1, 1000, 5));
  assert.ok(rateLimit('b', 1, 1000, 5));
});
