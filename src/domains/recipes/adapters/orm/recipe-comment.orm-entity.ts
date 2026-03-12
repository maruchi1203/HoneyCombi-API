import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RecipeOrmEntity } from '.';

@Entity({ name: 'Comments' })
@Index(['recipeId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class RecipeCommentOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'comment_id' })
  commentId!: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ name: 'stats_good', type: 'int', default: 0 })
  statsGood!: number;

  @Column({ name: 'stats_bad', type: 'int', default: 0 })
  statsBad!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => RecipeOrmEntity, (recipe) => recipe.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: RecipeOrmEntity;
}
