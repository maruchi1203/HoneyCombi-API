export class RecipeListQueryDto {
  start?: number;
  sort?: 'latest' | 'views' | 'likes';
  limit?: number;
}
