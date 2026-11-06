import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { ClientApp } from './client-app.entity.js';

@Entity({ name: 'ME_CLIENT_PERMISSION' })
export class ClientPermission {
  @PrimaryColumn({ name: 'CLIENT_APP_ID', type: 'number' })
  clientAppId!: number;

  @PrimaryColumn({ name: 'PERMISSION_CODE', type: 'varchar2', length: 50 })
  permissionCode!: string;

  @ManyToOne(() => ClientApp, (a) => a.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'CLIENT_APP_ID' })
  app!: Relation<ClientApp>;
}
