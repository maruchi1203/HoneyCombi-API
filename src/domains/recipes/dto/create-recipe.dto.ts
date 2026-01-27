import { RecipeStepDto } from './recipe-step.dto';

export class CreateRecipeDto {
  authorId: string;
  title: string;
  categories: string[];
  price?: number;
  summary?: string;
  thumbnailPath?: string;

  steps: RecipeStepDto[];
}
