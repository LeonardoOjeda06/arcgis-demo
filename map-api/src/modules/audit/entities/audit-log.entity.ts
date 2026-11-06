import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ActorType = 'ADMIN' | 'CLIENT' | 'SYSTEM';

@Entity({ name: 'ME_AUDIT_LOG' })
export class AuditLog {
  @PrimaryGeneratedColumn('identity', { name: 'ID', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'ACTOR_TYPE', type: 'varchar2', length: 10 })
  actorType!: ActorType;

  @Column({ name: 'ACTOR_ID', type: 'varchar2', length: 100 })
  actorId!: string;

  @Column({ name: 'ACTION', type: 'varchar2', length: 50 })
  action!: string;

  @Column({ name: 'TARGET', type: 'varchar2', length: 100, nullable: true })
  target!: string | null;

  @Column({ name: 'DETAIL', type: 'varchar2', length: 1000, nullable: true })
  detail!: string | null;

  @Column({ name: 'IP', type: 'varchar2', length: 45, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt!: Date;
}
