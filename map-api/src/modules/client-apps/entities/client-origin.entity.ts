import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { ClientApp } from './client-app.entity.js';

@Entity({ name: 'ME_CLIENT_ORIGIN' })
export class ClientOrigin {
  @PrimaryGeneratedColumn('identity', { name: 'ID', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'CLIENT_APP_ID', type: 'number' })
  clientAppId!: number;

  @Column({ name: 'ORIGIN', type: 'varchar2', length: 255 })
  origin!: string;

  @ManyToOne(() => ClientApp, (a) => a.origins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'CLIENT_APP_ID' })
  app!: Relation<ClientApp>;
}
