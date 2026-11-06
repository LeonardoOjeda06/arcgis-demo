import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientAppsService } from '../../modules/client-apps/client-apps.service.js';
import { EMBED_AUDIENCE, EMBED_ISSUER } from '../../modules/embed-session/embed-jwt.constants.js';
import type { AppRequest, EmbedClaims } from '../types.js';

@Injectable()
export class EmbedAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly apps: ClientAppsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();

    let claims: EmbedClaims;
    try {
      claims = await this.jwt.verifyAsync<EmbedClaims>(header.slice(7), {
        audience: EMBED_AUDIENCE,
        issuer: EMBED_ISSUER,
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Defensa extra: permisos VIGENTES (caché de 60 s). Si el admin desactivó la app
    // o quitó un permiso, aplica de inmediato aunque el token aún no expire.
    const live = await this.apps.getLiveAccess(claims.cid);
    if (!live || live.status !== 'ACTIVE') throw new UnauthorizedException('Aplicación desactivada');
    claims.scp = (claims.scp ?? []).filter((s) => live.scopes.includes(s));

    req.embed = claims;
    return true;
  }
}
