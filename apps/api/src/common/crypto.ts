import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

/** Jeton opaque de 256 bits, encodé en base64url (sans caractères ambigus). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte SHA-256 : seule cette valeur est stockée en base. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Empreinte d'adresse IP avec poivre applicatif (jamais d'IP en clair en base). */
export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${env.APP_SECRET}:${ip}`).digest('hex').slice(0, 64);
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
