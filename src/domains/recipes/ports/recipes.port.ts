import { CreateRecipeDto } from '../dto/index.dto';
import { UpdateRecipeDto } from '../dto/index.dto';
import { RecipeListItem } from '../entities/recipe.list-item.entity';
import { Recipe } from '../entities/recipe.entity';

export interface RecipesPort {
  createRecipe(
    input: CreateRecipeDto,
    files?: Express.Multer.File[],
  ): Promise<Recipe>;
  findTopRecipeListItems(limit: number): Promise<RecipeListItem[] | null>;
  findRecipeListItems(
    cursor: string | undefined,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[] | null>;
  findFullRecipe(stringId: string): Promise<Recipe | null>;
  updateFullRecipe(stringId: string, data: UpdateRecipeDto): Promise<Recipe>;
  deleteRecipe(stringId: string): Promise<void>;
}

