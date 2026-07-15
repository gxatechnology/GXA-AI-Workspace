import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { verifyRazorpaySignature } from '../server/billingSecurity';

test('accepts the exact Razorpay HMAC signature', () => {
  const signature = crypto.createHmac('sha256', 'secret').update('order_123|pay_456').digest('hex');
  assert.equal(verifyRazorpaySignature('order_123', 'pay_456', signature, 'secret'), true);
});
test('rejects a forged payment signature', () => assert.equal(verifyRazorpaySignature('order_123', 'pay_456', '0'.repeat(64), 'secret'), false));
test('rejects missing verification inputs', () => assert.equal(verifyRazorpaySignature('', 'pay_456', 'signature', 'secret'), false));
