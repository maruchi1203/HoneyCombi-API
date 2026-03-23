export interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  text: string;

  stats: {
    good: number;
    bad: number;
  };

  createdAt: string;
  updatedAt?: string;
}
