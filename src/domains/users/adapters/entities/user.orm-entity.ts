import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'Users' })
export class UserOrmEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  nickname!: string;

  @Column({ name: 'profile_img_path', type: 'text', nullable: true })
  profileImgPath?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
