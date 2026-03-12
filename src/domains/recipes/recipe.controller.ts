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
  CreateRecipeDto,
  CreateRecipeInput,
  RecipeListQueryDto,
  UpdateCommentDto,
  UpdateRecipeDto,
} from './dto/index.dto';
import { RecipesUseCase as RecipeUseCase } from './usecases/recipe.usecase';
import { CommentUseCase } from './usecases/comment.usecase';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RecipeStepEntity } from './entities/recipe-step.entity';

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

  @Get()
  findMultipleRecipes(@Query() query: RecipeListQueryDto) {
    const result = this.recipeUseCase.findRecipeListItems(query);
    return result;
  }

  @Get('top')
  findTopRankingRecipes(@Query() query: RecipeListQueryDto) {}

  @Get(':recipeId')
  findFullRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.findFullRecipe(recipeId);
  }

  @Patch(':recipeId')
  @UseGuards(AuthGuard)
  async updateRecipe(
    @Param('recipeId') recipeId: string,
    @Body() updatePostDto: UpdateRecipeDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    await this.assertRecipeOwner(recipeId, currentUserId);
    return this.recipeUseCase.updateFullRecipe(recipeId, updatePostDto);
  }

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

  @Post(':recipeId/comments')
  @UseGuards(AuthGuard)
  createComment(
    @Param('recipeId') recipeId: string,
    @Body() body: CreateCommentDto,
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

  @Get('comments/user/:authorId')
  findCommentsByUser(@Param('authorId') authorId: string) {
    return this.commentUseCase.findCommentsByUser(authorId);
  }

  @Patch(':recipeId/comments/:commentId')
  @UseGuards(AuthGuard)
  updateComment(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
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

  // #region private
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

  private getAuthenticatedUserId(req: Request & { user?: { id?: string } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid authentication context.');
    }

    return userId;
  }

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
