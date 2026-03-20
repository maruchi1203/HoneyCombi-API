import { DataSource, Repository } from 'typeorm';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';
import { S3StorageService } from '../src/common/storage/s3.storage.service';
import { SupabaseRecipesRepository } from '../src/domains/recipes/adapters/supabase.recipe.repository';
import { RecipeCommentOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-comment.orm-entity';
import { RecipeOrmEntity } from '../src/domains/recipes/adapters/orm/recipe.orm-entity';
import { RecipeStepOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-step.orm-entity';

describe('recipe top cache', () => {
  it('returns cached top recipes without hitting the database', async () => {
    const cachedItems = [
      {
        recipeId: 'recipe-1',
        userId: 'user-1',
        title: 'cached recipe',
        categories: [],
        stats: {
          totalRate: 0,
          comment: 0,
          view: 999,
        },
        createdAt: '2026-03-20T00:00:00.000Z',
      },
    ];

    const cache = {
      getJson: jest.fn().mockResolvedValue(cachedItems),
      setJson: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisCacheService;

    const recipeRepo = {
      find: jest.fn(),
    } as unknown as Repository<RecipeOrmEntity>;

    const repository = new SupabaseRecipesRepository(
      {} as DataSource,
      recipeRepo,
      {} as Repository<RecipeStepOrmEntity>,
      {} as Repository<RecipeCommentOrmEntity>,
      {} as S3StorageService,
      cache,
    );

    const result = await repository.findTopRecipeListItems(10);

    expect(result).toEqual(cachedItems);
    expect(recipeRepo.find).not.toHaveBeenCalled();
    expect(cache.getJson).toHaveBeenCalledWith('recipes:top:view:10');
  });
});
