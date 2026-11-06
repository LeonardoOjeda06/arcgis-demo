import { Body, Controller, Get, Headers, HttpCode, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmbedSessionService } from './embed-session.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { EmbedAuthGuard } from '../../common/guards/embed-auth.guard.js';
import { ClientIp, EmbedSession } from '../../common/decorators/embed-session.decorator.js';
import type { EmbedClaims } from '../../common/types.js';

@Controller('embed')
export class EmbedSessionController {
  constructor(private readonly service: EmbedSessionService) {}

  /** Llamado por el BACKEND de la app cliente (servidor a servidor). */
  @Post('sessions')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // más estricto: frena fuerza bruta
  create(
    @Headers('authorization') auth: string | undefined,
    @Body() dto: CreateSessionDto,
    @ClientIp() ip: string | null,
  ) {
    const [clientId, clientSecret] = parseBasic(auth);
    return this.service.create(clientId, clientSecret, dto, ip);
  }

  /** Llamado por el IFRAME para saber qué puede mostrar. */
  @Get('session')
  @UseGuards(EmbedAuthGuard)
  me(@EmbedSession() s: EmbedClaims) {
    return { scopes: s.scp, origin: s.org, expiresAt: s.exp };
  }
}

export function parseBasic(header?: string): [string, string] {
  if (!header?.startsWith('Basic ')) throw new UnauthorizedException();
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 1 || i === decoded.length - 1 || decoded.length > 512) throw new UnauthorizedException();
  return [decoded.slice(0, i), decoded.slice(i + 1)];
}
