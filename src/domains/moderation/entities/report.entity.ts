import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportStatus {
  Pending = 'PENDING',
  Resolved = 'RESOLVED',
}

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  reporterId: string;

  @Column({ length: 64 })
  targetUserId: string;

  @Column({ length: 255 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.Pending })
  status: ReportStatus;

  @Column({ length: 64, nullable: true })
  resolvedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  actionNote?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
