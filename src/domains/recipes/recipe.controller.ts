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
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeStepDto } from './dto/recipe-step.dto';
import { RecipesUseCase as RecipeUseCase } from './usecases/recipe.usecase';
import { CreateRecipeDto, CreateRecipeInput } from './dto/create-recipe.dto';
import { RecipeListQueryDto } from './dto/recipe-list-query.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipeUseCase: RecipeUseCase) {}

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

  @Get()
  findMultipleRecipes(@Query() query: RecipeListQueryDto) {
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
      const normalized = trimmed.startsWith('[') && trimmed.endsWith(']')
        ? trimmed.slice(1, -1)
        : trimmed;
      return normalized
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
}
