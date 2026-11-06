import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { type ActorType, AuditLog } from './entities/audit-log.entity.js';
import type { AuditQueryDto } from './dto/audit-query.dto.js';

export interface AuditEntry {
  actorType: ActorType;
  actorId: string;
  action: string;
  target?: string;
  /** JSON corto, SIN datos personales (nada de direcciones ni coordenadas). */
  detail?: Record<string, unknown>;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repo.insert({
        actorType: entry.actorType,
        actorId: entry.actorId.slice(0, 100),
        action: entry.action,
        target: entry.target?.slice(0, 100) ?? null,
        detail: entry.detail ? JSON.stringify(entry.detail).slice(0, 1000) : null,
        ip: entry.ip?.slice(0, 45) ?? null,
      });
    } catch (e) {
      // Si la auditoría falla no tumbamos la operación, pero sí queda en el log del servidor.
      this.logger.error(`No se pudo registrar la auditoría ${entry.action}: ${(e as Error).message}`);
    }
  }

  async find(q: AuditQueryDto) {
    const where: FindOptionsWhere<AuditLog> = {};
    if (q.action) where.action = q.action;
    if (q.actorType) where.actorType = q.actorType;
    if (q.target) where.target = q.target;
    if (q.from && q.to) where.createdAt = Between(new Date(q.from), new Date(q.to));
    else if (q.from) where.createdAt = MoreThanOrEqual(new Date(q.from));
    else if (q.to) where.createdAt = LessThanOrEqual(new Date(q.to));

    const pageSize = q.pageSize ?? 50;
    const page = q.page ?? 1;
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
