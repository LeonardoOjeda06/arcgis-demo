import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { timingSafeEqual, createHash } from 'node:crypto';
import type { Env } from '../../config/env.js';
import type { AppRequest } from '../types.js';

type Jwks = ReturnType<typeof createRemoteJWKSet>;

/**
 * Valida el access token del SSO corporativo (OIDC) y exige el rol de administrador.
 * En desarrollo (ADMIN_AUTH_MODE=dev) acepta un token fijo de .env; zod impide ese modo en producción.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly log = new Logger(AdminAuthGuard.name);
  private jwks?: Promise<Jwks>;

  constructor(private readonly cfg: ConfigService<Env, true>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = header.slice(7);

    if (this.cfg.get('ADMIN_AUTH_MODE', { infer: true }) === 'dev') {
      if (!sameSecret(token, this.cfg.get('ADMIN_DEV_TOKEN', { infer: true }) ?? '')) {
        throw new UnauthorizedException();
      }
      req.admin = { id: 'dev-admin', name: 'Administrador (desarrollo)' };
      return true;
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, await this.getJwks(), {
        issuer: this.cfg.get('OIDC_ISSUER', { infer: true }),
        audience: this.cfg.get('OIDC_AUDIENCE', { infer: true }),
      }));
    } catch {
      throw new UnauthorizedException();
    }

    const role = this.cfg.get('OIDC_ADMIN_ROLE', { infer: true });
    if (!extractRoles(payload).includes(role)) throw new ForbiddenException();

    req.admin = {
      id: String(payload.sub),
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
    return true;
  }

  private getJwks(): Promise<Jwks> {
    this.jwks ??= this.discoverJwks().catch((e) => {
      this.jwks = undefined; // reintentar en la próxima petición
      throw e;
    });
    return this.jwks;
  }

  private async discoverJwks(): Promise<Jwks> {
    const explicit = this.cfg.get('OIDC_JWKS_URI', { infer: true });
    if (explicit) return createRemoteJWKSet(new URL(explicit));

    const issuer = this.cfg.get('OIDC_ISSUER', { infer: true })!.replace(/\/$/, '');
    const res = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      this.log.error(`No se pudo leer la configuración OIDC (${res.status})`);
      throw new UnauthorizedException();
    }
    const { jwks_uri } = (await res.json()) as { jwks_uri: string };
    return createRemoteJWKSet(new URL(jwks_uri));
  }
}

/** Entra ID publica los roles en `roles`; Keycloak en `realm_access.roles` y `resource_access.*.roles`. */
export function extractRoles(p: JWTPayload): string[] {
  const out = new Set<string>();
  const add = (v: unknown) => Array.isArray(v) && v.forEach((r) => typeof r === 'string' && out.add(r));
  add(p.roles);
  add((p.realm_access as { roles?: unknown } | undefined)?.roles);
  const ra = p.resource_access as Record<string, { roles?: unknown }> | undefined;
  if (ra) Object.values(ra).forEach((x) => add(x?.roles));
  return [...out];
}

function sameSecret(a: string, b: string): boolean {
  // Compara hashes para que la longitud no filtre información y el tiempo sea constante.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return b.length > 0 && timingSafeEqual(ha, hb);
}
