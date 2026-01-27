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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeListQueryDto } from './dto/recipe-list-query.dto';
import { RecipeStepDto } from './dto/recipe-step.dto';
import { PostsUseCase as RecipeUseCase } from './usecases/recipe.usecase';

type CreateRecipeMultipartDto = Omit<
  CreateRecipeDto,
  'categories' | 'steps' | 'price'
> & {
  categories?: string[] | string;
  steps?: RecipeStepDto[] | string;
  price?: number | string;
};

@Controller('recipes')
export class PostsController {
  constructor(private readonly recipeUseCase: RecipeUseCase) {}

  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
    }),
  )
  create(
    @Body() body: CreateRecipeMultipartDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const createRecipeDto = this.parseCreateRecipeBody(body);
    return this.recipeUseCase.createRecipe(createRecipeDto, files);
  }

  @Get()
  findAll(@Query() query: RecipeListQueryDto) {
    const result = this.recipeUseCase.findRecipeListItems(query);
    return result;
  }

  @Get(':recipeId')
  findOneFullRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.findOneFullRecipe(recipeId);
  }

  @Patch(':recipeId')
  updateRecipe(
    @Param('recipeId') recipeId: string,
    @Body() updatePostDto: UpdateRecipeDto,
  ) {
    return this.recipeUseCase.updateOneFullRecipe(recipeId, updatePostDto);
  }

  @Delete(':recipeId')
  deleteRecipe(@Param('recipeId') recipeId: string) {
    return this.recipeUseCase.deleteRecipe(recipeId);
  }

  private parseCreateRecipeBody(body: CreateRecipeMultipartDto): CreateRecipeDto {
    const categories = this.parseJsonValue<string[]>(
      body.categories,
      'categories',
      [],
    );
    const steps = this.parseJsonValue<RecipeStepDto[]>(
      body.steps,
      'steps',
      [],
    );
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

  private parseJsonValue<T>(
    value: T | string | undefined,
    fieldName: string,
    defaultValue: T,
  ): T {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    if (typeof value !== 'string') {
      return value as T;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new BadRequestException(`${fieldName} must be valid JSON`);
    }
  }
}
