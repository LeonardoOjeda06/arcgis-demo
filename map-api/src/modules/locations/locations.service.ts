import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SavedLocation } from './entities/saved-location.entity.js';
import { ClientAppsService } from '../client-apps/client-apps.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { EmbedClaims } from '../../common/types.js';
import type { CreateLocationDto } from './dto/create-location.dto.js';

const round6 = (n: number) => Math.round(n * 1e6) / 1e6; // NUMBER(9,6)

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(SavedLocation) private readonly repo: Repository<SavedLocation>,
    private readonly apps: ClientAppsService,
    private readonly audit: AuditService,
  ) {}

  async create(s: EmbedClaims, dto: CreateLocationDto) {
    const appId = await this.apps.idFromClientId(s.cid);
    const saved = await this.repo.save(
      this.repo.create({
        clientAppId: appId,
        externalUserId: s.sub, // SIEMPRE del token, nunca del body
        address: dto.address.trim(),
        label: dto.label?.trim() || null,
        latitude: round6(dto.latitude),
        longitude: round6(dto.longitude),
        deletedAt: null,
      }),
    );
    await this.audit.log({ actorType: 'CLIENT', actorId: s.cid, action: 'LOCATION_SAVED', target: String(saved.id) });
    return { id: saved.id, createdAt: saved.createdAt };
  }

  async findMine(s: EmbedClaims) {
    const appId = await this.apps.idFromClientId(s.cid);
    return this.repo.find({
      where: { clientAppId: appId, externalUserId: s.sub, deletedAt: IsNull() },
      select: { id: true, label: true, address: true, latitude: true, longitude: true, createdAt: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async softDelete(s: EmbedClaims, id: number) {
    const appId = await this.apps.idFromClientId(s.cid);
    // El WHERE incluye al dueño: si el id es de otra persona, simplemente no lo encuentra.
    const r = await this.repo.update(
      { id, clientAppId: appId, externalUserId: s.sub, deletedAt: IsNull() },
      { deletedAt: new Date() },
    );
    if (!r.affected) throw new NotFoundException();
    await this.audit.log({ actorType: 'CLIENT', actorId: s.cid, action: 'LOCATION_DELETED', target: String(id) });
  }
}
