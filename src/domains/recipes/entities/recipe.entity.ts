import { RecipeStepDto } from '../dto/recipe-step.dto';

export interface Recipe {
  id: string;
  authorId: string;
  title: string;
  price?: number;
  categories: string[];
  summary?: string;

  steps: RecipeStepDto[];

  stats: {
    view: number;
    scrap: number;
    good: number;
    bad: number;
    comment: number;
  };

  createdAt: string;
  updatedAt?: string;
}


