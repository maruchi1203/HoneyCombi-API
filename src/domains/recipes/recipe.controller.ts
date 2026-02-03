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
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeStepDto } from './dto/recipe-step.dto';
import { RecipesUseCase as RecipeUseCase } from './usecases/recipe.usecase';
import { CreateRecipeDto, CreateRecipeInput } from './dto/create-recipe.dto';
import { RecipeListQueryDto } from './dto/recipe-list-query.dto';
import { CommentUseCase } from './usecases/comment.usecase';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly recipeUseCase: RecipeUseCase,
    private readonly commentUseCase: CommentUseCase,
  ) {}

  /**
   * 꿀조합 레시피를 생성하여 저장소에 저장합니다
   * @param body
   * @param files
   * @returns
   */
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
    }),
  )
  createRecipe(
    @Body() body: CreateRecipeInput,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    console.log(body);
    const createRecipeDto = this.parseCreateRecipeBody(body);
    return this.recipeUseCase.createRecipe(createRecipeDto, files);
  }

  /**
   *
   * @param query
   * @returns
   */
  @Get()
  findMultipleRecipes(@Query() query: RecipeListQueryDto) {
    const result = this.recipeUseCase.findRecipeListItems(query);
    return result;
  }

  /**
   *
   * @param recipeId
   * @returns
   */
  @Get(':recipeId')
  findFullRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.findFullRecipe(recipeId);
  }

  /**
   *
   * @param recipeId
   * @param updatePostDto
   * @returns
   */
  @Patch(':recipeId')
  updateRecipe(
    @Param('recipeId') recipeId: string,
    @Body() updatePostDto: UpdateRecipeDto,
  ) {
    return this.recipeUseCase.updateFullRecipe(recipeId, updatePostDto);
  }

  /**
   *
   * @param recipeId
   * @returns
   */
  @Delete(':recipeId')
  deleteRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.deleteRecipe(recipeId);
  }

  /**
   *
   * @param recipeId
   * @param body
   * @param req
   * @returns
   */
  @Post(':recipeId/comments')
  @UseGuards(AuthGuard) // 권한 점검
  createComment(
    @Param('recipeId') recipeId: string,
    @Body() body: CreateCommentDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = req.user?.id ?? '';
    const payload: CreateCommentDto = {
      recipeId,
      authorId,
      text: body.text,
    };
    return this.commentUseCase.createComment(payload);
  }

  /**
   *
   * @param authorId
   * @returns
   */
  @Get('comments/user/:authorId')
  findCommentsByUser(@Param('authorId') authorId: string) {
    return this.commentUseCase.findCommentsByUser(authorId);
  }

  /**
   *
   * @param recipeId
   * @param commentId
   * @param body
   * @param req 필요
   * @returns
   */
  @Patch(':recipeId/comments/:commentId')
  @UseGuards(AuthGuard)
  updateComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = req.user?.id ?? '';
    const payload: UpdateCommentDto = {
      recipeId,
      commentId,
      text: body.text,
    };
    return this.commentUseCase.updateComment(authorId, payload);
  }

  /**
   *
   * @param recipeId
   * @param commentId
   * @param req
   * @returns
   */
  @Delete(':recipeId/comments/:commentId')
  @UseGuards(AuthGuard)
  deleteComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const authorId = req.user?.id ?? '';
    return this.commentUseCase.deleteComment(authorId, recipeId, commentId);
  }

  // #region private
  private parseCreateRecipeBody(body: CreateRecipeInput): CreateRecipeDto {
    if (!body) {
      throw new BadRequestException('request body is required');
    }
    const categories = this.parseStringArray(body.categories);
    const steps = this.parseToRecipeStepDTO(body.steps);
    const price = this.parseNumber(body.price);

    return {
      authorId: body.authorId,
      title: body.title,
      categories,
      price,
      summary: body.summary,
      thumbnailPath: body.thumbnailPath,
      steps,
    };
  }

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

  private parseToRecipeStepDTO(
    value?: RecipeStepDto[] | string,
  ): RecipeStepDto[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    if (typeof value !== 'string') {
      return value as RecipeStepDto[];
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

      const steps = parsed as RecipeStepDto[];
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

  private parseLooseJson(raw: string) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
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
  // #endregion
}
