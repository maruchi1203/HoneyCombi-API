/**
 * 레시피 생성 요청에서 사용하는 입력 DTO 정의입니다.
 */
import { IsOptional, IsString } from 'class-validator';
import { RecipeStepEntity } from '../entities/recipe-step.entity';

export class CreateRecipeDto {
  authorId!: string;
  title!: string;
  categories!: string[];
  price?: number;
  summary?: string;
  thumbnailPath?: string;
  ingredients!: string[];
  steps!: RecipeStepEntity[];
}

export class CreateRecipeInput {
  @IsOptional()
  @IsString()
  authorId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  categories?: string[] | string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  thumbnailPath?: string;

  @IsOptional()
  ingredients?: string[] | string;

  @IsOptional()
  steps?: RecipeStepEntity[] | string;
}
