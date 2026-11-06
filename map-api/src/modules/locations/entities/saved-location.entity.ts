import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Oracle devuelve NUMBER(9,6) como número de JS; el transformer lo asegura si el driver
// devolviera string en algún modo.
const numeric = { to: (v: number) => v, from: (v: unknown) => (v == null ? v : Number(v)) };

@Entity({ name: 'ME_SAVED_LOCATION' })
export class SavedLocation {
  @PrimaryGeneratedColumn('identity', { name: 'ID', generatedIdentity: 'ALWAYS' })
  id!: number;

  @Column({ name: 'CLIENT_APP_ID', type: 'number' })
  clientAppId!: number;

  @Column({ name: 'EXTERNAL_USER_ID', type: 'varchar2', length: 100 })
  externalUserId!: string;

  @Column({ name: 'LABEL', type: 'varchar2', length: 100, nullable: true })
  label!: string | null;

  @Column({ name: 'ADDRESS', type: 'varchar2', length: 250 })
  address!: string;

  @Column({ name: 'LATITUDE', type: 'number', precision: 9, scale: 6, transformer: numeric })
  latitude!: number;

  @Column({ name: 'LONGITUDE', type: 'number', precision: 9, scale: 6, transformer: numeric })
  longitude!: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'DELETED_AT', type: 'timestamp', nullable: true }) // borrado lógico
  deletedAt!: Date | null;
}
