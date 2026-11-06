import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AppRequest } from '../types.js';

export const EmbedSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().embed,
);

export const AdminUserParam = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().admin,
);

/** IP del cliente (respeta X-Forwarded-For solo si TRUST_PROXY=true). */
export const ClientIp = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().ip ?? null,
);
