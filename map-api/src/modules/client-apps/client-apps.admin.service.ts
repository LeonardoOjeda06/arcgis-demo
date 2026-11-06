import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientApp } from './entities/client-app.entity.js';
import { ClientOrigin } from './entities/client-origin.entity.js';
import { ClientPermission } from './entities/client-permission.entity.js';
import { Permission } from './entities/permission.entity.js';
import { ClientAppsService } from './client-apps.service.js';
import { AuditService } from '../audit/audit.service.js';
import { generateClientId, generateSecret, hashSecret } from './secret.util.js';
import type { CreateClientAppDto } from './dto/admin.dto.js';
import type { AdminUser } from '../../common/types.js';
import type { Scope } from '../../common/scopes.js';

export interface ClientAppView {
  id: number;
  clientId: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED';
  origins: string[];
  permissions: string[];
  secretRotatedAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

const toView = (a: ClientApp): ClientAppView => ({
  id: a.id,
  clientId: a.clientId,
  name: a.name,
  status: a.status,
  origins: (a.origins ?? []).map((o) => o.origin).sort(),
  permissions: (a.permissions ?? []).map((p) => p.permissionCode).sort(),
  secretRotatedAt: a.secretRotatedAt,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
});

@Injectable()
export class ClientAppsAdminService {
  constructor(
    @InjectRepository(ClientApp) private readonly repo: Repository<ClientApp>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly cache: ClientAppsService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<ClientAppView[]> {
    const apps = await this.repo.find({
      relations: { origins: true, permissions: true },
      order: { name: 'ASC' },
    });
    return apps.map(toView);
  }

  async get(id: number): Promise<ClientAppView> {
    return toView(await this.load(id));
  }

  listPermissions() {
    return this.permRepo.find({ order: { code: 'ASC' } });
  }

  async create(dto: CreateClientAppDto, admin: AdminUser, ip: string | null) {
    const clientId = dto.clientId ?? generateClientId(dto.name);
    if (await this.repo.exists({ where: { clientId } })) {
      throw new ConflictException('Ya existe una aplicación con ese clientId');
    }
    const secret = generateSecret();
    const secretHash = await hashSecret(secret);

    const id = await this.ds.transaction(async (m) => {
      const res = await m.insert(ClientApp, {
        clientId,
        name: dto.name.trim(),
        secretHash,
        status: 'ACTIVE',
        secretRotatedAt: new Date(),
      });
      const appId = Number(res.identifiers[0].id);
      if (dto.origins.length) {
        await m.insert(ClientOrigin, dto.origins.map((origin) => ({ clientAppId: appId, origin })));
      }
      if (dto.permissions.length) {
        await m.insert(ClientPermission, dto.permissions.map((permissionCode) => ({ clientAppId: appId, permissionCode })));
      }
      return appId;
    });

    await this.audit.log({
      actorType: 'ADMIN', actorId: admin.id, action: 'CLIENT_APP_CREATED', target: String(id), ip,
      detail: { clientId, permissions: dto.permissions, origins: dto.origins },
    });
    // El secreto se devuelve UNA sola vez; en BD solo queda su hash.
    return { app: await this.get(id), clientSecret: secret };
  }

  async setPermissions(id: number, permissions: Scope[], admin: AdminUser, ip: string | null) {
    const app = await this.load(id);
    await this.ds.transaction(async (m) => {
      await m.delete(ClientPermission, { clientAppId: id });
      if (permissions.length) {
        await m.insert(ClientPermission, permissions.map((permissionCode) => ({ clientAppId: id, permissionCode })));
      }
      await m.update(ClientApp, id, { updatedAt: new Date() });
    });
    this.cache.invalidate(app.clientId);
    await this.audit.log({
      actorType: 'ADMIN', actorId: admin.id, action: 'PERMISSIONS_UPDATED', target: String(id), ip,
      detail: { before: app.permissions.map((p) => p.permissionCode), after: permissions },
    });
    return this.get(id);
  }

  async setOrigins(id: number, origins: string[], admin: AdminUser, ip: string | null) {
    const app = await this.load(id);
    await this.ds.transaction(async (m) => {
      await m.delete(ClientOrigin, { clientAppId: id });
      if (origins.length) {
        await m.insert(ClientOrigin, origins.map((origin) => ({ clientAppId: id, origin })));
      }
      await m.update(ClientApp, id, { updatedAt: new Date() });
    });
    this.cache.invalidate(app.clientId);
    await this.audit.log({
      actorType: 'ADMIN', actorId: admin.id, action: 'ORIGINS_UPDATED', target: String(id), ip,
      detail: { before: app.origins.map((o) => o.origin), after: origins },
    });
    return this.get(id);
  }

  async rotateSecret(id: number, admin: AdminUser, ip: string | null) {
    const app = await this.load(id);
    const secret = generateSecret();
    const secretHash = await hashSecret(secret);
    await this.repo.update(id, { secretHash, secretRotatedAt: new Date(), updatedAt: new Date() });
    this.cache.invalidate(app.clientId);
    await this.audit.log({ actorType: 'ADMIN', actorId: admin.id, action: 'SECRET_ROTATED', target: String(id), ip });
    return { clientSecret: secret }; // se muestra una vez; después nadie puede recuperarlo
  }

  async setStatus(id: number, status: 'ACTIVE' | 'DISABLED', admin: AdminUser, ip: string | null) {
    const app = await this.load(id);
    await this.repo.update(id, { status, updatedAt: new Date() });
    this.cache.invalidate(app.clientId);
    await this.audit.log({
      actorType: 'ADMIN', actorId: admin.id, action: status === 'ACTIVE' ? 'APP_ENABLED' : 'APP_DISABLED',
      target: String(id), ip,
    });
    return this.get(id);
  }

  private async load(id: number): Promise<ClientApp> {
    const app = await this.repo.findOne({ where: { id }, relations: { origins: true, permissions: true } });
    if (!app) throw new NotFoundException('Aplicación no encontrada');
    return app;
  }
}
