import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RecipeCommentOrmEntity } from './recipe-comment.orm-entity';
import type { RecipeStepDto } from '../../dto/index.dto';

@Entity({ name: 'recipes' })
export class RecipeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'author_id', type: 'varchar', length: 128 })
  authorId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'int', nullable: true })
  price?: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  categories!: string[];

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'thumbnail_path', type: 'text', nullable: true })
  thumbnailPath?: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  steps!: RecipeStepDto[];

  @Column({ name: 'stats_view', type: 'int', default: 0 })
  statsView!: number;

  @Column({ name: 'stats_scrap', type: 'int', default: 0 })
  statsScrap!: number;

  @Column({ name: 'stats_good', type: 'int', default: 0 })
  statsGood!: number;

  @Column({ name: 'stats_bad', type: 'int', default: 0 })
  statsBad!: number;

  @Column({ name: 'stats_comment', type: 'int', default: 0 })
  statsComment!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => RecipeCommentOrmEntity, (comment) => comment.recipe)
  comments?: RecipeCommentOrmEntity[];
}
