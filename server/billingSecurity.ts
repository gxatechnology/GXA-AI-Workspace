import crypto from 'node:crypto';

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const received = Buffer.from(signature, 'utf8'), expectedBuffer = Buffer.from(expected, 'utf8');
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}
