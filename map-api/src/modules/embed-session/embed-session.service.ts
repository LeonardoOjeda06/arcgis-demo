import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ClientAppsService } from '../client-apps/client-apps.service.js';
import { generateSecret, hashSecret, verifySecret } from '../client-apps/secret.util.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { EMBED_AUDIENCE, EMBED_ISSUER } from './embed-jwt.constants.js';
import { normalizeOrigin } from '../../common/utils/origin.js';
import type { EmbedClaims } from '../../common/types.js';
import type { Env } from '../../config/env.js';

// Hash argon2id de un valor aleatorio: se verifica contra él cuando la app no existe,
// para que la respuesta tarde lo mismo y no revele qué client_id son válidos.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashSecret(generateSecret()));

@Injectable()
export class EmbedSessionService {
  constructor(
    private readonly apps: ClientAppsService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService<Env, true>,
    private readonly audit: AuditService,
  ) {}

  async create(clientId: string, clientSecret: string, dto: CreateSessionDto, ip: string | null) {
    const app = await this.apps.findForAuth(clientId);

    // Mismo mensaje para "no existe", "desactivada" y "secreto incorrecto": no revelamos cuál falló.
    const secretOk = await verifySecret(app?.secretHash ?? (await getDummyHash()), clientSecret);
    if (!app || !secretOk || app.status !== 'ACTIVE') {
      await this.audit.log({
        actorType: 'CLIENT', actorId: clientId.slice(0, 100) || '?', action: 'EMBED_SESSION_DENIED', ip,
        detail: { reason: !app ? 'unknown_client' : !secretOk ? 'bad_secret' : 'disabled' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const origin = normalizeOrigin(dto.origin); // quita rutas y / final
    if (!origin || !app.origins.includes(origin)) {
      await this.audit.log({ actorType: 'CLIENT', actorId: app.clientId, action: 'EMBED_ORIGIN_DENIED', ip });
      throw new ForbiddenException('Origen no registrado para esta aplicación');
    }

    const claims: EmbedClaims = { sub: dto.externalUserId, cid: app.clientId, scp: app.scopes, org: origin };
    const ttl = this.cfg.get('EMBED_TOKEN_TTL_SECONDS', { infer: true });
    const token = await this.jwt.signAsync(claims, {
      expiresIn: ttl,
      audience: EMBED_AUDIENCE,
      issuer: EMBED_ISSUER,
      jwtid: randomUUID(),
    });

    await this.audit.log({ actorType: 'CLIENT', actorId: app.clientId, action: 'EMBED_SESSION_CREATED', ip });
    return { token, expiresIn: ttl, scopes: app.scopes };
  }
}
