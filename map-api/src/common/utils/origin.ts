/**
 * Normaliza un origen (esquema + host + puerto) y verifica que sea https,
 * o http solo para localhost. Devuelve null si no es válido.
 */
export function normalizeOrigin(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return null;
  if (url.username || url.password) return null;
  return url.origin;
}

/** Igual que normalizeOrigin pero exige que el texto ya sea un origen exacto (sin ruta ni / final). */
export function isExactOrigin(input: string): boolean {
  return normalizeOrigin(input) === input;
}
