import { Injectable } from '@nestjs/common';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { Recipe } from '../entities/recipe.entity';
import { RecipeListItem } from '../entities/recipe-list-item.entity';
import { PostsRepository } from '../ports/recipe.repository';

@Injectable()
export class AwsPostsRepository implements PostsRepository {
  async createRecipe(
    data: CreateRecipeDto,
    _files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    return { id: 'aws-post-id', ...data } as Recipe;
  }

  async findManyRecipes(
    _start: number,
    _sort: string,
    _limit: number,
  ): Promise<RecipeListItem[]> {
    return [];
  }

  async findOneFullRecipe(id: string): Promise<Recipe | null> {
    return {
      id,
      title: 'aws-post',
      authorId: 'aws-user-id',
      categories: [],
      steps: [],
      stats: {
        view: 0,
        scrap: 0,
        good: 0,
        bad: 0,
        comment: 0,
      },
      createdAt: '',
    } as Recipe;
  }

  async updateOneFullRecipe(
    id: string,
    data: UpdateRecipeDto,
  ): Promise<Recipe> {
    return {
      id,
      title: data.title ?? 'aws-post',
      authorId: 'aws-user-id',
      categories: data.categories ?? [],
      steps: data.steps ?? [],
      stats: {
        view: 0,
        scrap: 0,
        good: 0,
        bad: 0,
        comment: 0,
      },
      createdAt: '',
    } as Recipe;
  }

  async deleteRecipe(_id: string): Promise<void> {
    return;
  }
}
