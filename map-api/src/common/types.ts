import type { Request } from 'express';
import type { Scope } from './scopes.js';

/** Contenido del JWT que reciben el iframe y la API. */
export interface EmbedClaims {
  sub: string; // externalUserId (identificador opaco del usuario en la app cliente)
  cid: string; // clientId de la app
  scp: Scope[]; // permisos
  org: string; // origen del host que incrusta el iframe
  exp?: number;
  iat?: number;
  jti?: string;
}

export interface AdminUser {
  id: string;
  name?: string;
}

export interface AppRequest extends Request {
  embed?: EmbedClaims;
  admin?: AdminUser;
}
