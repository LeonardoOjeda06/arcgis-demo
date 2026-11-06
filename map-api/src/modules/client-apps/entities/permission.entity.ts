import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ME_PERMISSION' })
export class Permission {
  @PrimaryColumn({ name: 'CODE', type: 'varchar2', length: 50 })
  code!: string;

  @Column({ name: 'DESCRIPTION', type: 'varchar2', length: 200 })
  description!: string;
}
