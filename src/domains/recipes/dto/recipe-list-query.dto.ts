/**
 * 레시피 목록 조회의 정렬, 커서, 개수 조건을 받는 DTO입니다.
 */
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
