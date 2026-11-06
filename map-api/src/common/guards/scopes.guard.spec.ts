import { Reflector } from '@nestjs/core';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ScopesGuard } from './scopes.guard.js';

const ctxWith = (scp: string[] | undefined) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ embed: scp ? { scp } : undefined }) }),
  }) as unknown as ExecutionContext;

const guardRequiring = (required: string[] | undefined) =>
  new ScopesGuard({ getAllAndOverride: () => required } as unknown as Reflector);

describe('ScopesGuard', () => {
  it('permite cuando el token tiene el permiso', () => {
    expect(guardRequiring(['route:calculate']).canActivate(ctxWith(['route:calculate']))).toBe(true);
  });

  it('niega con 403 cuando falta el permiso', () => {
    expect(() => guardRequiring(['route:calculate']).canActivate(ctxWith(['location:write']))).toThrow(ForbiddenException);
  });

  it('exige TODOS los permisos requeridos', () => {
    expect(() =>
      guardRequiring(['location:read', 'location:write']).canActivate(ctxWith(['location:read'])),
    ).toThrow(ForbiddenException);
  });

  it('niega si no hay sesión embebida', () => {
    expect(() => guardRequiring(['location:read']).canActivate(ctxWith(undefined))).toThrow(ForbiddenException);
  });

  it('deja pasar endpoints sin @RequireScopes', () => {
    expect(guardRequiring(undefined).canActivate(ctxWith([]))).toBe(true);
  });
});
