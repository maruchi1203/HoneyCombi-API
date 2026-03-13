import { RecipeStepEntity } from './recipe-step.entity';

export interface Recipe {
  id: string;
  authorId: string;
  title: string;
  price?: number;
  categories: string[];
  summary?: string;
  thumbnailUrl?: string;

  steps: RecipeStepEntity[];

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
