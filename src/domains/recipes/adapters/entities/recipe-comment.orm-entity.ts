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
import { RecipeOrmEntity } from './recipe.orm-entity';

@Entity({ name: 'recipe_comments' })
@Index(['recipeId', 'createdAt'])
@Index(['authorId', 'createdAt'])
export class RecipeCommentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId!: string;

  @Column({ name: 'author_id', type: 'varchar', length: 128 })
  authorId!: string;

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
