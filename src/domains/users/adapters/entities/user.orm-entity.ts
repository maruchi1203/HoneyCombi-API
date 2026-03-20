import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'Users' })
export class UserOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  nickname!: string;

  @Column({ name: 'profile_image_path', type: 'text', nullable: true })
  profileImgPath?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
