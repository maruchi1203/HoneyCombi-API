export class RecipeListQueryDto {
  cursor?: string;
  sort?: 'latest' | 'views' | 'likes';
  limit?: number;
}
