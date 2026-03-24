/**
 * 레시피 관련 요청을 정리해 저장소 포트로 전달하는 유스케이스 계층입니다.
 */
import { Injectable, Inject } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/index.dto';
import { RecipeListQueryDto } from '../dto/index.dto';
import { UpdateRecipeDto } from '../dto/index.dto';
import type { RecipeListItem } from '../entities/recipe.list-item.entity';
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

  /**
   * 레시피 생성 요청을 저장소에 전달합니다.
   * @param createPostDto 생성 DTO
   * @param files 업로드 이미지 파일 목록
   * @returns 생성된 레시피 상세 정보
   */
  createRecipe(createPostDto: CreateRecipeDto, files?: Express.Multer.File[]) {
    const result = this.recipeRepository.createRecipe(createPostDto, files);
    return result;
  }

  /**
   * 목록 조회 조건을 정규화한 뒤 레시피 목록을 조회합니다.
   * @param query 목록 조회 조건
   * @returns 레시피 요약 배열
   */
  async findRecipeListItems(query?: RecipeListQueryDto) {
    const cursor = query?.cursor;
    const sort = query?.sort ?? 'latest';
    const limit = this.parseLimit(query?.limit);

    const items =
      (await this.recipeRepository.findRecipeListItems(cursor, sort, limit)) ??
      [];

    return items;
  }

  /**
   * 조회 수 기준 Top10 목록을 조회합니다.
   * @returns 상위 레시피 요약 배열
   */
  async findTopRecipeListItems(): Promise<RecipeListItem[]> {
    const items = (await this.recipeRepository.findTopRecipeListItems(10)) ?? [];
    return items;
  }

  /**
   * 레시피 상세 정보를 조회합니다.
   * @param recipeId 조회할 레시피 ID
   * @returns 레시피 상세 정보 또는 null
   */
  findFullRecipe(recipeId: string) {
    const result = this.recipeRepository.findFullRecipe(recipeId);

    return result;
  }

  /**
   * 레시피 수정 요청을 저장소에 전달합니다.
   * @param recipeId 수정 대상 레시피 ID
   * @param updatePostDto 수정 DTO
   * @returns 수정된 레시피 상세 정보
   */
  updateFullRecipe(recipeId: string, updatePostDto: UpdateRecipeDto) {
    const result = this.recipeRepository.updateFullRecipe(
      recipeId,
      updatePostDto,
    );
    return result;
  }

  /**
   * 레시피 삭제 요청을 저장소에 전달합니다.
   * @param recipeId 삭제 대상 레시피 ID
   * @returns 삭제 완료 결과
   */
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

