import { DataSource, Repository } from 'typeorm';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';
import { S3StorageService } from '../src/common/storage/s3.storage.service';
import { SupabaseRecipesRepository } from '../src/domains/recipes/adapters/supabase.recipe.repository';
import { RecipeCommentOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-comment.orm-entity';
import { RecipeOrmEntity } from '../src/domains/recipes/adapters/orm/recipe.orm-entity';
import { RecipeStepOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-step.orm-entity';
import { SupabaseUsersRepository } from '../src/domains/users/adapters/supabase.users.repository';
import { UserOrmEntity } from '../src/domains/users/adapters/entities/user.orm-entity';

describe('S3 URL mapping', () => {
  it('returns both S3 storage path and signed URL for user profile images', async () => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        nickname: 'tester',
        profileImgPath: 'users/user-1/profile.png',
      } satisfies Partial<UserOrmEntity>),
    } as unknown as Repository<UserOrmEntity>;

    const s3Storage = {
      getDownloadUrl: jest
        .fn()
        .mockResolvedValue(
          'https://signed.example.com/users/user-1/profile.png?sig=1',
        ),
    } as unknown as S3StorageService;

    const repository = new SupabaseUsersRepository(userRepo, s3Storage);

    const result = await repository.findOne('user-1');

    expect(result).toEqual({
      id: 'user-1',
      nickname: 'tester',
      profileImgPath: 'users/user-1/profile.png',
      profileImgUrl:
        'https://signed.example.com/users/user-1/profile.png?sig=1',
    });
    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(
      'users/user-1/profile.png',
    );
  });

  it('keeps recipe step image path as the source key and adds signed URLs on detail responses', async () => {
    const recipeRepo = {
      findOne: jest.fn().mockResolvedValue({
        recipeId: 'recipe-1',
        userId: 'author-1',
        title: 'Recipe',
        price: 12000,
        categories: ['korean'],
        summary: 'summary',
        thumbnailPath: 'recipes/recipe-1/thumbnail.png',
        statsView: 10,
        statsScrap: 2,
        statsGood: 5,
        statsBad: 1,
        statsComment: 3,
        createdAt: new Date('2026-03-17T00:00:00.000Z'),
        updatedAt: new Date('2026-03-17T01:00:00.000Z'),
      } satisfies Partial<RecipeOrmEntity>),
    } as unknown as Repository<RecipeOrmEntity>;

    const recipeStepRepo = {
      find: jest.fn().mockResolvedValue([
        {
          recipeId: 'recipe-1',
          order: 0,
          text: 'step 1',
          imagePath: 'recipes/recipe-1/steps/0/0.png',
        } satisfies Partial<RecipeStepOrmEntity>,
      ]),
    } as unknown as Repository<RecipeStepOrmEntity>;

    const commentRepo = {} as Repository<RecipeCommentOrmEntity>;
    const dataSource = {} as DataSource;
    const cache = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
    } as unknown as RedisCacheService;
    const s3Storage = {
      getDownloadUrl: jest
        .fn()
        .mockImplementation(async (key: string | undefined | null) => {
          if (!key) {
            return undefined;
          }

          return `https://signed.example.com/${key}?sig=1`;
        }),
    } as unknown as S3StorageService;

    const repository = new SupabaseRecipesRepository(
      dataSource,
      recipeRepo,
      recipeStepRepo,
      commentRepo,
      s3Storage,
      cache,
    );

    const result = await repository.findFullRecipe('recipe-1');

    expect(result).toMatchObject({
      id: 'recipe-1',
      thumbnailUrl:
        'https://signed.example.com/recipes/recipe-1/thumbnail.png?sig=1',
      steps: [
        {
          order: 0,
          text: 'step 1',
          image: [
            {
              path: 'recipes/recipe-1/steps/0/0.png',
              url: 'https://signed.example.com/recipes/recipe-1/steps/0/0.png?sig=1',
            },
          ],
        },
      ],
    });

    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(
      'recipes/recipe-1/thumbnail.png',
    );
    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(
      'recipes/recipe-1/steps/0/0.png',
    );
  });
});
