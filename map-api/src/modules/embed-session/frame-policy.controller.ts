import { Controller, Get, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ClientAppsService } from '../client-apps/client-apps.service.js';

/**
 * Lo usa Nginx (auth_request) para armar la cabecera CSP frame-ancestors del iframe.
 * Solo devuelve orígenes, que no son secretos, pero en producción Nginx no debe exponer
 * esta ruta a internet (ver deploy/nginx en el README).
 */
@Controller('embed')
@SkipThrottle()
export class FramePolicyController {
  constructor(private readonly apps: ClientAppsService) {}

  @Get('frame-policy/:clientId')
  async policy(@Param('clientId') clientId: string, @Res({ passthrough: true }) res: Response) {
    const valid = /^[a-z0-9][a-z0-9-]{2,63}$/.test(clientId);
    const origins = valid ? await this.apps.activeOrigins(clientId) : [];
    res.setHeader('X-Frame-Ancestors', origins.length ? origins.join(' ') : "'none'");
    res.setHeader('Cache-Control', 'no-store');
    return '';
  }
}
