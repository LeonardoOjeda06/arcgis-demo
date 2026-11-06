import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator.js';
import type { Scope } from '../scopes.js';
import type { AppRequest } from '../types.js';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Scope[] | undefined>(SCOPES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const granted: Scope[] = ctx.switchToHttp().getRequest<AppRequest>().embed?.scp ?? [];
    const ok = required.every((s) => granted.includes(s));
    if (!ok) throw new ForbiddenException('La aplicación no tiene permiso para esta acción');
    return true;
  }
}
