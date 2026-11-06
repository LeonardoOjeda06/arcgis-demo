import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

/** 256 bits aleatorios, seguros para URL. */
export const generateSecret = () => randomBytes(32).toString('base64url');

export const hashSecret = (secret: string) => argon2.hash(secret, { type: argon2.argon2id });

export const verifySecret = async (hash: string, secret: string) => {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false; // hash con formato inválido
  }
};

/** client_id legible: prefijo a partir del nombre + sufijo aleatorio. */
export function generateClientId(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${slug || 'app'}-${randomBytes(4).toString('hex')}`;
}
