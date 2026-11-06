import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type AppStatus, ClientApp } from './entities/client-app.entity.js';
import { isScope, type Scope } from '../../common/scopes.js';

export interface AuthApp {
  id: number;
  clientId: string;
  status: AppStatus;
  secretHash: string;
  origins: string[];
  scopes: Scope[];
}

export interface LiveAccess {
  id: number;
  status: AppStatus;
  scopes: Scope[];
  origins: string[];
}

const CACHE_TTL_MS = 60_000;

/** Lecturas que usan los flujos del iframe. Mantiene una caché corta de permisos vigentes. */
@Injectable()
export class ClientAppsService {
  private readonly cache = new Map<string, { expires: number; value: LiveAccess | null }>();

  constructor(@InjectRepository(ClientApp) private readonly repo: Repository<ClientApp>) {}

  /** Incluye el hash del secreto. Solo para validar credenciales. */
  async findForAuth(clientId: string): Promise<AuthApp | null> {
    const app = await this.repo
      .createQueryBuilder('a')
      .addSelect('a.secretHash')
      .leftJoinAndSelect('a.origins', 'o')
      .leftJoinAndSelect('a.permissions', 'p')
      .where('a.clientId = :clientId', { clientId })
      .getOne();
    if (!app) return null;
    return {
      id: app.id,
      clientId: app.clientId,
      status: app.status,
      secretHash: app.secretHash,
      origins: app.origins.map((o) => o.origin),
      scopes: app.permissions.map((p) => p.permissionCode).filter(isScope),
    };
  }

  /** Estado y permisos actuales de la app (caché de 60 s). */
  async getLiveAccess(clientId: string): Promise<LiveAccess | null> {
    const hit = this.cache.get(clientId);
    if (hit && hit.expires > Date.now()) return hit.value;

    const app = await this.repo.findOne({
      where: { clientId },
      relations: { origins: true, permissions: true },
    });
    const value: LiveAccess | null = app
      ? {
          id: app.id,
          status: app.status,
          scopes: app.permissions.map((p) => p.permissionCode).filter(isScope),
          origins: app.origins.map((o) => o.origin),
        }
      : null;
    this.cache.set(clientId, { expires: Date.now() + CACHE_TTL_MS, value });
    return value;
  }

  async idFromClientId(clientId: string): Promise<number> {
    const live = await this.getLiveAccess(clientId);
    if (!live) throw new Error(`App ${clientId} no encontrada`);
    return live.id;
  }

  /** Orígenes que pueden incrustar el iframe ([] si la app no existe o está inactiva). */
  async activeOrigins(clientId: string): Promise<string[]> {
    const live = await this.getLiveAccess(clientId);
    return live?.status === 'ACTIVE' ? live.origins : [];
  }

  invalidate(clientId: string) {
    this.cache.delete(clientId);
  }
}
