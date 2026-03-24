/**
 * 레시피 수정 요청에서 사용하는 입력 DTO 정의입니다.
 */
import { IsOptional, IsString } from 'class-validator';
import { RecipeStepEntity } from '../entities/recipe-step.entity';

export class UpdateRecipeDto {
  title?: string;
  price?: number;
  content?: string;
  categories?: string[];
  thumbnailPath?: string;
  steps?: RecipeStepEntity[];
}

export class UpdateRecipeInput {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  price?: number | string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  categories?: string[] | string;

  @IsOptional()
  @IsString()
  thumbnailPath?: string;

  @IsOptional()
  steps?: RecipeStepEntity[] | string;
}
