import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validWebhookSignature } from '../lib/paystack';

const body = JSON.stringify({ event: 'charge.success', data: { reference: 'FGU-1', amount: 85000 } });
const sig = createHmac('sha512', 'sk_test_key').update(body).digest('hex');

test('accepts a correctly signed webhook', () => assert.equal(validWebhookSignature(body, sig, 'sk_test_key'), true));
test('rejects a wrong key, tampered body, missing or truncated signature', () => {
  assert.equal(validWebhookSignature(body, sig, 'other_key'), false);
  assert.equal(validWebhookSignature(body.replace('85000', '1'), sig, 'sk_test_key'), false);
  assert.equal(validWebhookSignature(body, null, 'sk_test_key'), false);
  assert.equal(validWebhookSignature(body, sig.slice(0, 20), 'sk_test_key'), false);
  assert.equal(validWebhookSignature(body, sig, ''), false);
});
