import { RecipeStepEntity } from '../entities/recipe-step.entity';

export class UpdateRecipeDto {
  title?: string;
  price?: number;
  content?: string;
  categories?: string[];
  thumbnailPath?: string;

  steps?: RecipeStepEntity[];
}
