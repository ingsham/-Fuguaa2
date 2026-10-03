import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGhanaPhone, ghs } from '../lib/notify';
import { splitList, avg, firstName } from '../lib/utils';

test('Ghana phone numbers are normalised for the SMS provider', () => {
  assert.equal(normalizeGhanaPhone('0241234567'), '233241234567');
  assert.equal(normalizeGhanaPhone('+233 24 123 4567'), '233241234567');
  assert.equal(normalizeGhanaPhone('00233241234567'), '233241234567');
});

test('small helpers', () => {
  assert.deepEqual(splitList(' M, L ,, XL '), ['M', 'L', 'XL']);
  assert.equal(avg([5, 4, 3]), 4);
  assert.equal(avg([]), 0);
  assert.equal(firstName('  Akosua Ayamga '), 'Akosua');
  assert.equal(ghs(850), 'GHS 850.00');
});
