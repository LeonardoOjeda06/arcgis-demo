import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ClientOrigin } from './client-origin.entity.js';
import { ClientPermission } from './client-permission.entity.js';

export type AppStatus = 'ACTIVE' | 'DISABLED';

@Entity({ name: 'ME_CLIENT_APP' })
export class ClientApp {
  @PrimaryGeneratedColumn('identity', { name: 'ID', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'CLIENT_ID', type: 'varchar2', length: 64, unique: true })
  clientId!: string;

  @Column({ name: 'NAME', type: 'varchar2', length: 150 })
  name!: string;

  @Column({ name: 'SECRET_HASH', type: 'varchar2', length: 255, select: false }) // no se lee por accidente
  secretHash!: string;

  @Column({ name: 'STATUS', type: 'varchar2', length: 10, default: 'ACTIVE' })
  status!: AppStatus;

  @Column({ name: 'SECRET_ROTATED_AT', type: 'timestamp' })
  secretRotatedAt!: Date;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'UPDATED_AT', type: 'timestamp', nullable: true })
  updatedAt!: Date | null;

  @OneToMany(() => ClientOrigin, (o) => o.app)
  origins!: ClientOrigin[];

  @OneToMany(() => ClientPermission, (p) => p.app)
  permissions!: ClientPermission[];
}
