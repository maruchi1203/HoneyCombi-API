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
