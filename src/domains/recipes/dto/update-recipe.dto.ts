import { RecipeStepDto } from './recipe-step.dto';

export class UpdateRecipeDto {
  title?: string;
  price?: number;
  content?: string;
  categories?: string[];
  thumbnailPath?: string;

  steps: RecipeStepDto[];
}
