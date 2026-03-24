/**
 * 레시피 step 테이블과 매핑되는 TypeORM 엔티티입니다.
 */
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RecipeOrmEntity } from '.';

@Entity({ name: 'RecipeSteps' })
@Index(['recipeId', 'order'])
export class RecipeStepOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'step_id' })
  stepId!: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId!: string;

  @Column({ name: 'image_path', type: 'text', nullable: true })
  imagePath?: string | null;

  @Column({ name: 'text', type: 'text' })
  text!: string;

  @Column({ name: 'order', type: 'int' })
  order!: number;

  @ManyToOne(() => RecipeOrmEntity, (recipe) => recipe.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_id' })
  recipe!: RecipeOrmEntity;
}
