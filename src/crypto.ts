// @ts-nocheck
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export function checksum(data: Buffer): string { return createHash('sha256').update(data).digest('hex'); }
export function keyFromSecret(secret: string): Buffer { return createHash('sha256').update(secret).digest(); }
export function encrypt(data: Buffer, key: Buffer) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext, checksum: checksum(ciphertext) };
}
export function decrypt(payload: { iv: string; tag: string; ciphertext: Buffer }, key: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
}
