import { isExactOrigin, normalizeOrigin } from './origin.js';
import { extractRoles } from '../guards/admin-auth.guard.js';
import { parseBasic } from '../../modules/embed-session/embed-session.controller.js';
import { UnauthorizedException } from '@nestjs/common';

describe('normalizeOrigin', () => {
  it.each([
    ['https://portal.cliente.gov.co/', 'https://portal.cliente.gov.co'],
    ['https://portal.cliente.gov.co/ruta?x=1', 'https://portal.cliente.gov.co'],
    ['http://localhost:5175', 'http://localhost:5175'],
    ['https://a.com:8443', 'https://a.com:8443'],
  ])('%s → %s', (input, out) => expect(normalizeOrigin(input)).toBe(out));

  it.each(['http://evil.com', 'ftp://a.com', 'javascript:alert(1)', 'no-es-url', 'https://user:pw@a.com'])(
    'rechaza %s',
    (input) => expect(normalizeOrigin(input)).toBeNull(),
  );

  it('isExactOrigin no acepta / final ni rutas', () => {
    expect(isExactOrigin('https://a.com')).toBe(true);
    expect(isExactOrigin('https://a.com/')).toBe(false);
    expect(isExactOrigin('https://a.com/x')).toBe(false);
  });
});

describe('extractRoles', () => {
  it('lee roles de Entra ID y Keycloak', () => {
    expect(extractRoles({ roles: ['MAP_ADMIN'] })).toEqual(['MAP_ADMIN']);
    expect(extractRoles({ realm_access: { roles: ['A'] }, resource_access: { app: { roles: ['B'] } } }).sort()).toEqual(['A', 'B']);
    expect(extractRoles({})).toEqual([]);
  });
});

describe('parseBasic', () => {
  const b64 = (s: string) => `Basic ${Buffer.from(s).toString('base64')}`;
  it('separa client_id y secreto (el secreto puede tener ":")', () => {
    expect(parseBasic(b64('app-1:se:cr:et'))).toEqual(['app-1', 'se:cr:et']);
  });
  it.each([undefined, 'Bearer x', b64('sin-dos-puntos'), b64(':secreto'), b64('app:')])('rechaza %s', (h) => {
    expect(() => parseBasic(h)).toThrow(UnauthorizedException);
  });
});
