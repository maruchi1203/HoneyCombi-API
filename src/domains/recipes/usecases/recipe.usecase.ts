import { Injectable, Inject } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { RecipeListQueryDto } from '../dto/recipe-list-query.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import type { RecipesRepository } from '../ports/recipe.repository';
import { RECIPE_REPOSITORY } from '../recipe.tokens';

@Injectable()
export class RecipesUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipesRepository,
  ) {}

  createRecipe(createPostDto: CreateRecipeDto, files?: Express.Multer.File[]) {
    const result = this.recipeRepository.createRecipe(createPostDto, files);
    return result;
  }

  async findRecipeListItems(query?: RecipeListQueryDto) {
    const cursor = query?.cursor;
    const sort = query?.sort ?? 'latest';
    const limit = this.parseLimit(query?.limit);

    const items =
      (await this.recipeRepository.findManyRecipes(cursor, sort, limit)) ?? [];

    return items;
  }

  findOneFullRecipe(recipeId: string) {
    const result = this.recipeRepository.findOneFullRecipe(recipeId);

    return result;
  }

  updateOneFullRecipe(recipeId: string, updatePostDto: UpdateRecipeDto) {
    const result = this.recipeRepository.updateOneFullRecipe(
      recipeId,
      updatePostDto,
    );
    return result;
  }

  deleteRecipe(recipeId: string) {
    const result = this.recipeRepository.deleteRecipe(recipeId);
    return result;
  }

  private parseLimit(rawLimit?: number) {
    const defaultLimit = 20;
    const parsed =
      typeof rawLimit === 'number' ? rawLimit : Number(rawLimit ?? NaN);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return defaultLimit;
    }

    return Math.min(Math.floor(parsed), 100);
  }
}
