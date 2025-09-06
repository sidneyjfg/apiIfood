import crypto from 'crypto';

export function verifyHmacSHA256(secret: string, data: string, expectedSignature: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data, 'utf8');
  const calculated = hmac.digest('hex');
  return calculated === expectedSignature;
}
