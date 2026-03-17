import { Injectable, Inject } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/index.dto';
import { RecipeListQueryDto } from '../dto/index.dto';
import { UpdateRecipeDto } from '../dto/index.dto';
import type { RecipesPort } from '../ports/recipes.port';
import { RECIPE_REPOSITORY } from '../recipe.tokens';

/**
 * 레시피 관련 요청을 저장소 인터페이스에 위임하기 전에
 * 목록 조회 파라미터처럼 공통 규칙이 필요한 값만 정리합니다.
 */
@Injectable()
export class RecipesUseCase {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipesPort,
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
      (await this.recipeRepository.findRecipeListItems(cursor, sort, limit)) ??
      [];

    return items;
  }

  findFullRecipe(recipeId: string) {
    const result = this.recipeRepository.findFullRecipe(recipeId);

    return result;
  }

  updateFullRecipe(recipeId: string, updatePostDto: UpdateRecipeDto) {
    const result = this.recipeRepository.updateFullRecipe(
      recipeId,
      updatePostDto,
    );
    return result;
  }

  deleteRecipe(recipeId: string) {
    const result = this.recipeRepository.deleteRecipe(recipeId);
    return result;
  }

  /**
   * limit은 기본값 20, 최대 100으로 고정해 과도한 조회를 막습니다.
   */
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

