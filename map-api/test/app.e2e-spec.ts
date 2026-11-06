/**
 * Pruebas e2e de la capa HTTP: guards, validación, CORS y filtrado por dueño.
 * Oracle y ArcGIS se reemplazan por dobles en memoria para que corran sin infraestructura.
 */
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as argon2 from 'argon2';
import request from 'supertest';
import { configureApp } from '../src/setup.js';
import { EmbedSessionController } from '../src/modules/embed-session/embed-session.controller.js';
import { FramePolicyController } from '../src/modules/embed-session/frame-policy.controller.js';
import { EmbedSessionService } from '../src/modules/embed-session/embed-session.service.js';
import { LocationsController } from '../src/modules/locations/locations.controller.js';
import { LocationsService } from '../src/modules/locations/locations.service.js';
import { SavedLocation } from '../src/modules/locations/entities/saved-location.entity.js';
import { RoutingController } from '../src/modules/routing/routing.controller.js';
import { ClientAppsAdminController } from '../src/modules/client-apps/client-apps.admin.controller.js';
import { ClientAppsAdminService } from '../src/modules/client-apps/client-apps.admin.service.js';
import { HealthController } from '../src/modules/health/health.controller.js';
import { ClientAppsService, type AuthApp } from '../src/modules/client-apps/client-apps.service.js';
import { ArcgisClient } from '../src/modules/arcgis/arcgis.client.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { EmbedAuthGuard } from '../src/common/guards/embed-auth.guard.js';
import { AdminAuthGuard } from '../src/common/guards/admin-auth.guard.js';
import { EMBED_AUDIENCE, EMBED_ISSUER } from '../src/modules/embed-session/embed-jwt.constants.js';
import type { Scope } from '../src/common/scopes.js';

const JWT_SECRET = 'e2e-'.repeat(12);
const SECRET = 'secreto-e2e';
const HOST = 'http://localhost:5175';
const EMBED = 'http://localhost:5173';
const ADMIN_DEV_TOKEN = 'dev-token-'.repeat(4);

/** Repositorio en memoria que aplica los WHERE simples que usa LocationsService. */
function memoryRepo() {
  const rows: SavedLocation[] = [];
  const matches = (r: SavedLocation, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === 'object' && '_type' in v ? r[k as keyof SavedLocation] == null : r[k as keyof SavedLocation] === v,
    );
  return {
    rows,
    create: (x: Partial<SavedLocation>) => x,
    save: async (x: SavedLocation) => {
      const row = { ...x, id: rows.length + 1, createdAt: new Date() };
      rows.push(row);
      return row;
    },
    find: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => matches(r, where)),
    update: async (where: Record<string, unknown>, patch: Partial<SavedLocation>) => {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, patch));
      return { affected: hit.length };
    },
  };
}

describe('map-api (e2e)', () => {
  let app: NestExpressApplication;
  let jwt: JwtService;
  let authApp: AuthApp;
  const live = { id: 1, status: 'ACTIVE' as 'ACTIVE' | 'DISABLED', scopes: [] as Scope[], origins: [HOST] };
  const arcgis = {
    solveRoute: vi.fn(async () => ({
      routes: { features: [{ attributes: { Total_Kilometers: 3.456, Total_TravelTime: 9.6 }, geometry: { paths: [[[-74, 4.7], [-74.1, 4.71]]] } }] },
      directions: [{ features: [{ attributes: { text: 'Gire a la derecha' } }] }],
    })),
    geocode: vi.fn(async () => ({ candidates: [{ address: 'Calle 10', location: { x: -74, y: 4.7 }, score: 99 }] })),
    reverseGeocode: vi.fn(async () => ({ address: { LongLabel: 'Calle 10, Bogotá' } })),
  };

  beforeAll(async () => {
    authApp = {
      id: 1, clientId: 'portal-test', status: 'ACTIVE',
      secretHash: await argon2.hash(SECRET, { type: argon2.argon2id }),
      origins: [HOST], scopes: ['location:read', 'location:write'],
    };
    const clientApps = {
      findForAuth: async (id: string) => (id === authApp.clientId ? authApp : null),
      getLiveAccess: async (id: string) => (id === authApp.clientId ? live : null),
      idFromClientId: async () => 1,
      activeOrigins: async (id: string) => (id === authApp.clientId && live.status === 'ACTIVE' ? live.origins : []),
    };

    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true, ignoreEnvFile: true,
          load: [() => ({ EMBED_TOKEN_TTL_SECONDS: 600, ADMIN_AUTH_MODE: 'dev', ADMIN_DEV_TOKEN })],
        }),
        JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } }),
      ],
      controllers: [EmbedSessionController, FramePolicyController, LocationsController, RoutingController, ClientAppsAdminController],
      providers: [
        EmbedSessionService,
        LocationsService,
        { provide: getRepositoryToken(SavedLocation), useValue: memoryRepo() },
        { provide: ClientAppsService, useValue: clientApps },
        { provide: ClientAppsAdminService, useValue: { list: async () => [] } },
        { provide: ArcgisClient, useValue: arcgis },
        { provide: AuditService, useValue: { log: vi.fn(), find: vi.fn(async () => ({ items: [] })) } },
      ],
    }).compile();

    app = mod.createNestApplication<NestExpressApplication>();
    configureApp(app, { corsOrigins: [EMBED, 'http://localhost:5174'], trustProxy: false });
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(() => app.close());

  const basic = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
  const tokenFor = (sub: string, scp: Scope[]) =>
    jwt.signAsync({ sub, cid: 'portal-test', scp, org: HOST }, { expiresIn: 600, audience: EMBED_AUDIENCE, issuer: EMBED_ISSUER });

  describe('POST /embed/sessions', () => {
    it('emite token con credenciales válidas y origen registrado', async () => {
      live.scopes = ['location:read', 'location:write'];
      const r = await request(app.getHttpServer())
        .post('/api/v1/embed/sessions')
        .set('Authorization', basic('portal-test', SECRET))
        .send({ origin: HOST, externalUserId: 'usr_12345678' })
        .expect(201);
      expect(r.body.expiresIn).toBe(600);
      const s = await request(app.getHttpServer()).get('/api/v1/embed/session').set('Authorization', `Bearer ${r.body.token}`).expect(200);
      expect(s.body).toMatchObject({ origin: HOST, scopes: ['location:read', 'location:write'] });
    });

    it('401 con secreto incorrecto o sin Basic', async () => {
      await request(app.getHttpServer()).post('/api/v1/embed/sessions').set('Authorization', basic('portal-test', 'mal'))
        .send({ origin: HOST, externalUserId: 'usr_12345678' }).expect(401);
      await request(app.getHttpServer()).post('/api/v1/embed/sessions').send({ origin: HOST, externalUserId: 'usr_12345678' }).expect(401);
    });

    it('403 con origen no registrado', async () => {
      await request(app.getHttpServer()).post('/api/v1/embed/sessions').set('Authorization', basic('portal-test', SECRET))
        .send({ origin: 'https://evil.com', externalUserId: 'usr_12345678' }).expect(403);
    });

    it('400 si el externalUserId parece una cédula corta o un correo', async () => {
      await request(app.getHttpServer()).post('/api/v1/embed/sessions').set('Authorization', basic('portal-test', SECRET))
        .send({ origin: HOST, externalUserId: 'ana@correo.com' }).expect(400);
    });
  });

  describe('autenticación y permisos', () => {
    it('401 sin token, con token alterado o con alg distinto', async () => {
      const srv = app.getHttpServer();
      await request(srv).get('/api/v1/locations/mine').expect(401);
      const t = await tokenFor('usr_aaaaaaaa', ['location:read']);
      await request(srv).get('/api/v1/locations/mine').set('Authorization', `Bearer ${t}x`).expect(401);
      const forged = new JwtService({ secret: 'otro-secreto-'.repeat(4) });
      const bad = await forged.signAsync({ sub: 'x', cid: 'portal-test', scp: ['location:read'], org: HOST }, { audience: EMBED_AUDIENCE, issuer: EMBED_ISSUER });
      await request(srv).get('/api/v1/locations/mine').set('Authorization', `Bearer ${bad}`).expect(401);
    });

    it('token sin route:calculate → 403 en /routes', async () => {
      const t = await tokenFor('usr_aaaaaaaa', ['location:read', 'location:write', 'route:calculate']);
      live.scopes = ['location:read', 'location:write']; // el admin quitó route:calculate
      await request(app.getHttpServer()).post('/api/v1/routes').set('Authorization', `Bearer ${t}`)
        .send({ stops: [{ latitude: 4.7, longitude: -74 }, { latitude: 4.71, longitude: -74.1 }] }).expect(403);
    });

    it('con route:calculate devuelve la ruta reducida', async () => {
      live.scopes = ['route:calculate'];
      const t = await tokenFor('usr_aaaaaaaa', ['route:calculate']);
      const r = await request(app.getHttpServer()).post('/api/v1/routes').set('Authorization', `Bearer ${t}`)
        .send({ stops: [{ latitude: 4.7, longitude: -74 }, { latitude: 4.71, longitude: -74.1 }] }).expect(200);
      expect(r.body).toEqual({ distanceKm: 3.46, minutes: 10, path: [[[-74, 4.7], [-74.1, 4.71]]], directions: ['Gire a la derecha'] });
    });

    it('400 con una sola parada o coordenadas inválidas', async () => {
      live.scopes = ['route:calculate'];
      const t = await tokenFor('usr_aaaaaaaa', ['route:calculate']);
      await request(app.getHttpServer()).post('/api/v1/routes').set('Authorization', `Bearer ${t}`)
        .send({ stops: [{ latitude: 4.7, longitude: -74 }] }).expect(400);
      await request(app.getHttpServer()).post('/api/v1/routes').set('Authorization', `Bearer ${t}`)
        .send({ stops: [{ latitude: 95, longitude: -74 }, { latitude: 4.7, longitude: -74 }] }).expect(400);
    });

    it('app desactivada → 401 aunque el token no haya expirado', async () => {
      live.scopes = ['location:read'];
      live.status = 'DISABLED';
      const t = await tokenFor('usr_aaaaaaaa', ['location:read']);
      await request(app.getHttpServer()).get('/api/v1/locations/mine').set('Authorization', `Bearer ${t}`).expect(401);
      live.status = 'ACTIVE';
    });
  });

  describe('ubicaciones', () => {
    beforeAll(() => { live.scopes = ['location:read', 'location:write']; });

    it('body con campos extra (p. ej. externalUserId) → 400', async () => {
      const t = await tokenFor('usr_aaaaaaaa', ['location:write']);
      await request(app.getHttpServer()).post('/api/v1/locations').set('Authorization', `Bearer ${t}`)
        .send({ latitude: 4.7, longitude: -74, address: 'Calle 1', externalUserId: 'usr_bbbbbbbb' }).expect(400);
    });

    it('usuario A no ve ni borra ubicaciones de B (IDOR)', async () => {
      const srv = app.getHttpServer();
      const a = await tokenFor('usr_aaaaaaaa', ['location:read', 'location:write']);
      const b = await tokenFor('usr_bbbbbbbb', ['location:read', 'location:write']);

      const saved = await request(srv).post('/api/v1/locations').set('Authorization', `Bearer ${a}`)
        .send({ latitude: 4.7, longitude: -74.07, address: 'Calle 10 # 20-30' }).expect(201);

      const listB = await request(srv).get('/api/v1/locations/mine').set('Authorization', `Bearer ${b}`).expect(200);
      expect(listB.body).toHaveLength(0);
      await request(srv).delete(`/api/v1/locations/${saved.body.id}`).set('Authorization', `Bearer ${b}`).expect(404);

      const listA = await request(srv).get('/api/v1/locations/mine').set('Authorization', `Bearer ${a}`).expect(200);
      expect(listA.body).toHaveLength(1);
      await request(srv).delete(`/api/v1/locations/${saved.body.id}`).set('Authorization', `Bearer ${a}`).expect(204);
    });
  });

  describe('admin', () => {
    it('401 sin token y 200 con el token de desarrollo', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/client-apps').expect(401);
      await request(app.getHttpServer()).get('/api/v1/admin/client-apps').set('Authorization', 'Bearer otro').expect(401);
      await request(app.getHttpServer()).get('/api/v1/admin/client-apps').set('Authorization', `Bearer ${ADMIN_DEV_TOKEN}`).expect(200);
    });

    it('un token del iframe no sirve en /admin', async () => {
      const t = await tokenFor('usr_aaaaaaaa', ['location:read']);
      await request(app.getHttpServer()).get('/api/v1/admin/client-apps').set('Authorization', `Bearer ${t}`).expect(401);
    });
  });

  describe('frame-policy y CORS', () => {
    it('devuelve los orígenes de la app activa y none para desconocidas', async () => {
      const ok = await request(app.getHttpServer()).get('/api/v1/embed/frame-policy/portal-test').expect(200);
      expect(ok.headers['x-frame-ancestors']).toBe(HOST);
      const no = await request(app.getHttpServer()).get('/api/v1/embed/frame-policy/otra-app').expect(200);
      expect(no.headers['x-frame-ancestors']).toBe("'none'");
    });

    it('CORS solo para el iframe y el panel', async () => {
      const ok = await request(app.getHttpServer()).options('/api/v1/locations/mine').set('Origin', EMBED).set('Access-Control-Request-Method', 'GET');
      expect(ok.headers['access-control-allow-origin']).toBe(EMBED);
      const no = await request(app.getHttpServer()).options('/api/v1/locations/mine').set('Origin', 'https://evil.com').set('Access-Control-Request-Method', 'GET');
      expect(no.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  it('ningún endpoint queda abierto por olvido', () => {
    // Endpoints públicos a propósito: la emisión de tokens (usa Basic), frame-policy (interno) y health.
    const allowed = new Set(['EmbedSessionController.create', 'FramePolicyController.policy', 'HealthController.check']);
    const controllers = [EmbedSessionController, FramePolicyController, LocationsController, RoutingController, ClientAppsAdminController, HealthController];
    const open: string[] = [];
    for (const C of controllers) {
      const classGuards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, C) ?? [];
      for (const name of Object.getOwnPropertyNames(C.prototype)) {
        const handler = C.prototype[name];
        if (name === 'constructor' || Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
        const guards = [...classGuards, ...(Reflect.getMetadata(GUARDS_METADATA, handler) ?? [])];
        const protectedRoute = guards.includes(EmbedAuthGuard) || guards.includes(AdminAuthGuard);
        if (!protectedRoute && !allowed.has(`${C.name}.${name}`)) open.push(`${C.name}.${name}`);
      }
    }
    expect(open).toEqual([]);
  });
});
