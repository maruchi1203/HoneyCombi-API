import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Report } from './report.entity';

export enum BlockStatus {
  Active = 'ACTIVE',
  Released = 'RELEASED',
}

@Entity({ name: 'blocks' })
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  targetUserId: string;

  @Column({ length: 64, nullable: true })
  reportId?: string | null;

  @ManyToOne(() => Report, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reportId' })
  report?: Report | null;

  @Column({ type: 'enum', enum: BlockStatus, default: BlockStatus.Active })
  status: BlockStatus;

  @Column({ length: 64, nullable: true })
  createdBy?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ length: 64, nullable: true })
  releasedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  releaseNote?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
