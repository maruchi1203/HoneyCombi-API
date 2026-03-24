/**
 * 레시피와 댓글 관련 HTTP 요청을 받아 입력을 정규화한 뒤 유스케이스로 전달하는 컨트롤러입니다.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
  Req,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import {
  CreateCommentDto,
  CreateCommentInput,
  CreateRecipeDto,
  CreateRecipeInput,
  RecipeListQueryDto,
  UpdateCommentDto,
  UpdateCommentInput,
  UpdateRecipeDto,
  UpdateRecipeInput,
} from './dto/index.dto';
import { RecipesUseCase as RecipeUseCase } from './usecases/recipe.usecase';
import { CommentUseCase } from './usecases/comment.usecase';
import { AuthGuard } from '../../common/guards/auth.guard';
import type { RecipeListItem } from './entities/recipe.list-item.entity';
import { RecipeStepEntity } from './entities/recipe-step.entity';

/**
 * 레시피와 댓글 관련 HTTP 요청을 입력 DTO로 정리해 유스케이스로 전달합니다.
 * 멀티파트 요청에서 넘어오는 문자열 배열, 숫자, 단계 정보를 여기서 정규화합니다.
 */
@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipeUseCase: RecipeUseCase,
    private readonly commentUseCase: CommentUseCase,
  ) {}

  /**
   * 레시피를 생성하여 저장소에 저장합니다.
   */
  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
    }),
  )
  createRecipe(
    @Body() body: CreateRecipeInput,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const createRecipeDto = this.parseCreateRecipeBody(body, currentUserId);
    return this.recipeUseCase.createRecipe(createRecipeDto, files);
  }

  /**
   * 목록 조회 파라미터를 받아 정렬과 커서 조건에 맞는 레시피 목록을 반환합니다.
   * @param query 정렬, 커서, limit 정보
   * @returns 목록용 레시피 요약 배열
   */
  @Get()
  findMultipleRecipes(@Query() query: RecipeListQueryDto) {
    const result = this.recipeUseCase.findRecipeListItems(query);
    return result;
  }

  /**
   * 조회 수 기준 상위 10개 레시피를 목록 모델로 반환합니다.
   * @returns Top10 레시피 요약 배열
   */
  @Get('top')
  findTopRankingRecipes(): Promise<RecipeListItem[]> {
    return this.recipeUseCase.findTopRecipeListItems();
  }

  /**
   * 레시피 ID로 상세 정보를 조회합니다.
   * @param recipeId 조회할 레시피 ID
   * @returns 레시피 상세 정보 또는 null
   */
  @Get(':recipeId')
  findFullRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.findFullRecipe(recipeId);
  }

  /**
   * 레시피 수정 요청을 받아 작성자 본인 여부를 확인한 뒤 수정합니다.
   * @param recipeId 수정 대상 레시피 ID
   * @param updatePostDto 수정 입력 값
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 수정된 레시피 상세 정보
   */
  @Patch(':recipeId')
  @UseGuards(AuthGuard)
  async updateRecipe(
    @Param('recipeId') recipeId: string,
    @Body() updatePostDto: UpdateRecipeInput,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    await this.assertRecipeOwner(recipeId, currentUserId);
    const parsedUpdateDto = this.parseUpdateRecipeBody(updatePostDto);
    return this.recipeUseCase.updateFullRecipe(recipeId, parsedUpdateDto);
  }

  /**
   * 레시피 삭제 요청을 받아 작성자 본인 여부를 확인한 뒤 삭제합니다.
   * @param recipeId 삭제 대상 레시피 ID
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 삭제 완료 결과
   */
  @Delete(':recipeId')
  @UseGuards(AuthGuard)
  async deleteRecipe(
    @Param('recipeId') recipeId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    await this.assertRecipeOwner(recipeId, currentUserId);
    return this.recipeUseCase.deleteRecipe(recipeId);
  }

  /**
   * 특정 레시피에 댓글을 생성합니다.
   * @param recipeId 댓글이 달릴 레시피 ID
   * @param body 댓글 본문 입력 값
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 생성된 댓글 정보
   */
  @Post(':recipeId/comments')
  @UseGuards(AuthGuard)
  createComment(
    @Param('recipeId') recipeId: string,
    @Body() body: CreateCommentInput,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = this.getAuthenticatedUserId(req);
    const payload: CreateCommentDto = {
      recipeId,
      authorId,
      text: body.text,
    };
    return this.commentUseCase.createComment(payload);
  }

  /**
   * 특정 사용자가 작성한 댓글 목록을 조회합니다.
   * @param authorId 댓글 작성자 ID
   * @returns 댓글 배열
   */
  @Get('comments/user/:authorId')
  findCommentsByUser(@Param('authorId') authorId: string) {
    return this.commentUseCase.findCommentsByUser(authorId);
  }

  /**
   * 특정 댓글을 수정합니다.
   * @param recipeId 댓글이 속한 레시피 ID
   * @param commentId 수정 대상 댓글 ID
   * @param body 수정할 댓글 내용
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 수정된 댓글 정보
   */
  @Patch(':recipeId/comments/:commentId')
  @UseGuards(AuthGuard)
  updateComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentInput,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = this.getAuthenticatedUserId(req);
    const payload: UpdateCommentDto = {
      recipeId,
      commentId,
      text: body.text,
    };
    return this.commentUseCase.updateComment(authorId, payload);
  }

  /**
   * 특정 댓글을 삭제합니다.
   * @param recipeId 댓글이 속한 레시피 ID
   * @param commentId 삭제 대상 댓글 ID
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 삭제 완료 결과
   */
  @Delete(':recipeId/comments/:commentId')
  @UseGuards(AuthGuard)
  deleteComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = this.getAuthenticatedUserId(req);
    return this.commentUseCase.deleteComment(authorId, recipeId, commentId);
  }

  // #region local
  /**
   * 생성 요청 본문을 서버 내부 DTO로 변환합니다.
   * multipart/form-data 에서 문자열로 들어온 배열과 숫자를 여기서 정리합니다.
   * @param body 원본 생성 요청 본문
   * @param authorId 인증 사용자 ID
   * @returns 내부 생성 DTO
   */
  private parseCreateRecipeBody(
    body: CreateRecipeInput,
    authorId: string,
  ): CreateRecipeDto {
    if (!body) {
      throw new BadRequestException('request body is required');
    }
    const categories = this.parseStringArray(body.categories);
    const ingredients = this.parseStringArray(body.ingredients);
    const steps = this.parseToRecipeStepEntity(body.steps);
    const price = this.parseNumber(body.price);

    return {
      authorId,
      title: body.title,
      categories,
      price,
      summary: body.summary,
      thumbnailPath: body.thumbnailPath,
      ingredients,
      steps,
    };
  }

  /**
   * 수정 요청에서는 값이 비어 있는 필드를 undefined로 통일해 부분 업데이트 의미를 유지합니다.
   * @param body 원본 수정 요청 본문
   * @returns 내부 수정 DTO
   */
  private parseUpdateRecipeBody(body: UpdateRecipeInput): UpdateRecipeDto {
    if (!body) {
      throw new BadRequestException('request body is required');
    }

    return {
      title: body.title,
      price:
        body.price === undefined || body.price === null || body.price === ''
          ? undefined
          : this.parseNumber(body.price),
      content: body.content,
      categories:
        body.categories === undefined || body.categories === null
          ? undefined
          : this.parseStringArray(body.categories),
      thumbnailPath: body.thumbnailPath,
      steps:
        body.steps === undefined || body.steps === null
          ? undefined
          : this.parseToRecipeStepEntity(body.steps),
    };
  }

  /**
   * 숫자 입력이 문자열로 들어오더라도 안전하게 number로 변환합니다.
   * @param value number 또는 문자열 형태의 가격 값
   * @returns 정규화된 숫자 또는 undefined
   */
  private parseNumber(value?: number | string) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('price must be a number');
    }

    return parsed;
  }

  /**
   * step 정보는 JSON 문자열 또는 배열 둘 다 허용하며, 최종적으로 내부 엔티티 배열로 맞춥니다.
   * @param value 문자열 또는 배열 형태의 step 입력 값
   * @returns 정규화된 레시피 step 배열
   */
  private parseToRecipeStepEntity(
    value?: RecipeStepEntity[] | string,
  ): RecipeStepEntity[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    if (typeof value !== 'string') {
      return value as RecipeStepEntity[];
    }

    try {
      let raw = value.trim();
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        raw = raw.slice(1, -1);
      }

      let parsed: unknown = this.parseLooseJson(raw);
      if (typeof parsed === 'string') {
        parsed = this.parseLooseJson(parsed);
      }
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('steps must be an array');
      }

      const steps = parsed as RecipeStepEntity[];
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('steps must be an array');
      }

      return steps.map((step, index) => ({
        order: Number(step?.order ?? index),
        text: String(step?.text ?? ''),
        image: step?.image ?? [],
      }));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('steps must be valid JSON');
    }
  }

  /**
   * 느슨한 JSON 문자열을 최대한 보정해서 파싱합니다.
   * @param raw 원본 JSON 문자열
   * @returns 파싱된 값
   */
  private parseLooseJson(raw: string) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // key에 따옴표가 없거나 문자열 값이 느슨하게 들어온 경우를 보정합니다.
        const normalized = trimmed
          .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
          .replace(/:\s*([^,"\]\}][^,\]\}]*)/g, (_match, value) => {
            const token = String(value).trim();
            if (
              token === 'true' ||
              token === 'false' ||
              token === 'null' ||
              /^-?\d+(\.\d+)?$/.test(token)
            ) {
              return `:${token}`;
            }
            return `:"${token}"`;
          });

        return JSON.parse(normalized);
      }

      throw error;
    }
  }

  /**
   * 배열 입력은 JSON 문자열과 콤마 구분 문자열을 모두 허용합니다.
   * @param value 문자열 또는 배열 형태의 입력 값
   * @returns 문자열 배열
   */
  private parseStringArray(value?: string[] | string) {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    if (Array.isArray(value)) {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch (error) {
      const normalized =
        trimmed.startsWith('[') && trimmed.endsWith(']')
          ? trimmed.slice(1, -1)
          : trimmed;
      return normalized
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  /**
   * 요청 객체에서 인증 사용자 ID를 꺼냅니다.
   * @param req 인증 사용자 정보가 담긴 요청 객체
   * @returns 인증 사용자 ID
   */
  private getAuthenticatedUserId(req: Request & { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    return userId;
  }

  /**
   * 수정/삭제 전에 현재 사용자가 해당 레시피 작성자인지 확인합니다.
   * @param recipeId 검사 대상 레시피 ID
   * @param userId 현재 인증 사용자 ID
   * @returns 작성자 검증 완료 결과
   */
  private async assertRecipeOwner(recipeId: string, userId: string) {
    const recipe = await this.recipeUseCase.findFullRecipe(recipeId);
    if (!recipe) {
      throw new NotFoundException('Recipe not found.');
    }

    if (recipe.authorId !== userId) {
      throw new ForbiddenException('Not allowed to modify this recipe.');
    }
  }
  // #endregion
}
