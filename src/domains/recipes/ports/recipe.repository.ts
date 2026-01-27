import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { RecipeListItem } from '../entities/recipe-list-item.entity';
import { Recipe } from '../entities/recipe.entity';

export interface PostsRepository {
  createRecipe(
    data: CreateRecipeDto,
    files?: Express.Multer.File[],
  ): Promise<Recipe>;
  findManyRecipes(
    start: number,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[] | null>;
  findOneFullRecipe(stringId: string): Promise<Recipe | null>;
  updateOneFullRecipe(stringId: string, data: UpdateRecipeDto): Promise<Recipe>;
  deleteRecipe(stringId: string): Promise<void>;
}
