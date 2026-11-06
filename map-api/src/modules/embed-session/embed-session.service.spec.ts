import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { EmbedSessionService } from './embed-session.service.js';
import type { AuthApp, ClientAppsService } from '../client-apps/client-apps.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { EMBED_AUDIENCE, EMBED_ISSUER } from './embed-jwt.constants.js';

const SECRET = 'secreto-correcto-de-prueba';
const JWT_SECRET = 'x'.repeat(48);

describe('EmbedSessionService', () => {
  let app: AuthApp;
  let service: EmbedSessionService;
  const jwt = new JwtService({ secret: JWT_SECRET, signOptions: { algorithm: 'HS256' } });
  const audit = { log: vi.fn() } as unknown as AuditService;

  beforeAll(async () => {
    app = {
      id: 1,
      clientId: 'portal-ciudadano',
      status: 'ACTIVE',
      secretHash: await argon2.hash(SECRET, { type: argon2.argon2id }),
      origins: ['https://portal.cliente.gov.co'],
      scopes: ['location:read', 'location:write'],
    };
  });

  beforeEach(() => {
    const apps = { findForAuth: vi.fn(async (id: string) => (id === app.clientId ? app : null)) } as unknown as ClientAppsService;
    const cfg = { get: () => 600 } as unknown as ConfigService;
    service = new EmbedSessionService(apps, jwt, cfg as never, audit);
  });

  const dto = { origin: 'https://portal.cliente.gov.co/tramites', externalUserId: 'usr_8f3a2b1c' };

  it('emite un JWT con scopes, origen normalizado, aud, iss y jti', async () => {
    const r = await service.create('portal-ciudadano', SECRET, dto, null);
    const claims = await jwt.verifyAsync(r.token, { audience: EMBED_AUDIENCE, issuer: EMBED_ISSUER });
    expect(claims).toMatchObject({
      sub: 'usr_8f3a2b1c',
      cid: 'portal-ciudadano',
      scp: ['location:read', 'location:write'],
      org: 'https://portal.cliente.gov.co',
    });
    expect(claims.jti).toBeTruthy();
    expect(claims.exp - claims.iat).toBe(600);
  });

  it('rechaza secreto incorrecto con 401', async () => {
    await expect(service.create('portal-ciudadano', 'otro', dto, null)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza app inexistente con el mismo 401', async () => {
    await expect(service.create('no-existe', SECRET, dto, null)).rejects.toThrow('Credenciales inválidas');
  });

  it('rechaza app desactivada con 401', async () => {
    app.status = 'DISABLED';
    await expect(service.create('portal-ciudadano', SECRET, dto, null)).rejects.toThrow(UnauthorizedException);
    app.status = 'ACTIVE';
  });

  it('rechaza origen no registrado con 403', async () => {
    await expect(
      service.create('portal-ciudadano', SECRET, { ...dto, origin: 'https://evil.com' }, null),
    ).rejects.toThrow(ForbiddenException);
  });
});
