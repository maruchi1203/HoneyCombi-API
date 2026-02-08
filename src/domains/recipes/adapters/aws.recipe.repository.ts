import { Injectable } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { Recipe } from '../entities/recipe.entity';
import { RecipeListItem } from '../entities/recipe.list-item.entity';
import { RecipesPort } from '../ports/recipes.port';

@Injectable()
export class AwsRecipesRepository implements RecipesPort {
  async createRecipe(
    data: CreateRecipeDto,
    _files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    return { id: 'aws-post-id', ...data } as Recipe;
  }

  async findRecipeListItems(
    _cursor: string | undefined,
    _sort: string,
    _limit: number,
  ): Promise<RecipeListItem[]> {
    return [];
  }

  async findFullRecipe(id: string): Promise<Recipe | null> {
    return {
      id,
      title: 'aws-post',
      authorId: 'aws-user-id',
      categories: [],
      steps: [],
      stats: {
        view: 0,
        scrap: 0,
        good: 0,
        bad: 0,
        comment: 0,
      },
      createdAt: '',
    } as Recipe;
  }

  async updateFullRecipe(id: string, data: UpdateRecipeDto): Promise<Recipe> {
    return {
      id,
      title: data.title ?? 'aws-post',
      authorId: 'aws-user-id',
      categories: data.categories ?? [],
      steps: data.steps ?? [],
      stats: {
        view: 0,
        scrap: 0,
        good: 0,
        bad: 0,
        comment: 0,
      },
      createdAt: '',
    } as Recipe;
  }

  async deleteRecipe(_id: string): Promise<void> {
    return;
  }
}
