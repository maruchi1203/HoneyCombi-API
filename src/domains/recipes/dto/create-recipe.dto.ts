import { RecipeStepEntity } from '../entities/recipe-step.entity';

export class CreateRecipeDto {
  authorId!: string;
  title!: string;
  categories!: string[];
  price?: number;
  summary?: string;
  thumbnailPath?: string;
  ingredients!: string[];

  steps!: RecipeStepEntity[];
}

export class CreateRecipeInput {
  authorId!: string;
  title!: string;
  categories!: string[];
  price?: number;
  summary?: string;
  thumbnailPath?: string;
  ingredients!: string[];

  steps!: string;
}
