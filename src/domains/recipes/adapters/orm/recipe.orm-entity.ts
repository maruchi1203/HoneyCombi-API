import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RecipeCommentOrmEntity, RecipeStepOrmEntity } from '.';

@Entity({ name: 'Recipes' })
@Index(['userId', 'createdAt'])
export class RecipeOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'recipe_id' })
  recipeId!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'int', nullable: true })
  price?: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'", nullable: true })
  categories?: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'", nullable: true })
  ingredients?: string[];

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ name: 'thumbnail_path', type: 'text', nullable: true })
  thumbnailPath?: string | null;

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

  @OneToMany(() => RecipeStepOrmEntity, (step) => step.recipe)
  steps!: RecipeStepOrmEntity[];

  @OneToMany(() => RecipeCommentOrmEntity, (comment) => comment.recipe)
  comments?: RecipeCommentOrmEntity[];
}
