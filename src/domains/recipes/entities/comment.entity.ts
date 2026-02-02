export class Comment {
  id: string;
  recipeId: string;
  authorId: string;
  text: string;

  stats: {
    good: number;
    bad: number;
  };

  createdAt: string;
  updatedAt?: string;
}
