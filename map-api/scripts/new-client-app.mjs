// Genera un client_id, un client_secret y el SQL para registrar una app cliente
// sin pasar por el panel admin (útil antes de tener SSO, etapa 3 de la guía).
//
// Uso:
//   pnpm new-app "Portal de prueba" http://localhost:5175 [scopes separados por coma]
//
// El secreto se imprime UNA vez: guárdalo en el .env del backend de la app cliente.
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

const SCOPES = ['location:read', 'location:write', 'geocode:search', 'route:calculate'];
const [name = 'App de prueba', origin = 'http://localhost:5175', scopesArg] = process.argv.slice(2);
const scopes = scopesArg ? scopesArg.split(',').map((s) => s.trim()) : SCOPES;

const bad = scopes.filter((s) => !SCOPES.includes(s));
if (bad.length) {
  console.error(`Permisos desconocidos: ${bad.join(', ')}`);
  process.exit(1);
}
const normalized = new URL(origin).origin;
if (normalized !== origin) {
  console.error(`El origen debe ser exacto, sin ruta ni / final. ¿Quisiste decir ${normalized}?`);
  process.exit(1);
}

const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const clientId = `${slug || 'app'}-${randomBytes(4).toString('hex')}`;
const secret = randomBytes(32).toString('base64url');
const hash = await argon2.hash(secret, { type: argon2.argon2id });
const q = (s) => `'${s.replace(/'/g, "''")}'`;

console.log(`-- ===== Ejecutar en Oracle (como MAP_OWNER o MAP_APP) =====
INSERT INTO ME_CLIENT_APP (CLIENT_ID, NAME, SECRET_HASH) VALUES (${q(clientId)}, ${q(name)}, ${q(hash)});
INSERT INTO ME_CLIENT_ORIGIN (CLIENT_APP_ID, ORIGIN)
  SELECT ID, ${q(origin)} FROM ME_CLIENT_APP WHERE CLIENT_ID = ${q(clientId)};
${scopes
  .map((s) => `INSERT INTO ME_CLIENT_PERMISSION (CLIENT_APP_ID, PERMISSION_CODE)\n  SELECT ID, ${q(s)} FROM ME_CLIENT_APP WHERE CLIENT_ID = ${q(clientId)};`)
  .join('\n')}
COMMIT;

-- ===== Credenciales para el backend de la app cliente (se muestran una sola vez) =====
-- MAP_CLIENT_ID=${clientId}
-- MAP_CLIENT_SECRET=${secret}`);
