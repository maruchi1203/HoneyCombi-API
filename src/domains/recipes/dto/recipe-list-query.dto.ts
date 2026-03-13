import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecipeListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsIn(['latest', 'views', 'likes'])
  sort?: 'latest' | 'views' | 'likes';

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
