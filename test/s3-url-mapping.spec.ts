import { DataSource, Repository } from 'typeorm';
import { RedisCacheService } from '../src/common/cache/redis-cache.service';
import { S3StorageService } from '../src/common/storage/s3.storage.service';
import { SupabaseRecipesRepository } from '../src/domains/recipes/adapters/supabase.recipe.repository';
import { RecipeCommentOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-comment.orm-entity';
import { RecipeOrmEntity } from '../src/domains/recipes/adapters/orm/recipe.orm-entity';
import { RecipeStepOrmEntity } from '../src/domains/recipes/adapters/orm/recipe-step.orm-entity';
import { SupabaseUsersRepository } from '../src/domains/users/adapters/supabase.users.repository';
import { UserOrmEntity } from '../src/domains/users/adapters/entities/user.orm-entity';

const USER_PROFILE_KEY = 'users/user-1/profile.png';
const RECIPE_THUMBNAIL_KEY = 'recipes/recipe-1/thumbnail.png';
const RECIPE_STEP_IMAGE_KEY = 'recipes/recipe-1/steps/0/0.png';

const buildSignedUrl = (key: string) =>
  `https://signed.example.com/${key}?sig=test`;

/**
 * S3 이미지 응답 계약을 고정하는 테스트입니다.
 * UTF-8 한글 주석 기준으로 관리하며, 내부 저장 경로(path)와 서명 URL이
 * 서로 다른 목적의 필드라는 점을 명시적으로 검증합니다.
 */
describe('S3 URL mapping', () => {
  it('returns both S3 storage path and signed URL for user profile images', async () => {
    // DB 행은 S3 내부 key만 저장하고 있다고 가정합니다.
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'user-1',
        nickname: 'tester',
        profileImgPath: USER_PROFILE_KEY,
      } satisfies Partial<UserOrmEntity>),
    } as unknown as Repository<UserOrmEntity>;

    // S3 서비스는 저장 key를 받아 다운로드용 signed URL을 만든다고 가정합니다.
    const s3Storage = {
      getDownloadUrl: jest
        .fn()
        .mockImplementation(async (key: string | undefined | null) =>
          key ? buildSignedUrl(key) : undefined,
        ),
    } as unknown as S3StorageService;

    const repository = new SupabaseUsersRepository(userRepo, s3Storage);

    const result = await repository.findOne('user-1');

    // 응답은 내부 경로와 외부 접근 URL을 모두 유지해야 합니다.
    expect(result).toEqual({
      userId: 'user-1',
      nickname: 'tester',
      profileImgPath: USER_PROFILE_KEY,
      profileImgUrl: buildSignedUrl(USER_PROFILE_KEY),
    });
    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(USER_PROFILE_KEY);
  });

  it('keeps recipe step image path as the source key and adds signed URLs on detail responses', async () => {
    // 레시피 본문은 썸네일 경로를 내부 key로 보관합니다.
    const recipeRepo = {
      findOne: jest.fn().mockResolvedValue({
        recipeId: 'recipe-1',
        userId: 'author-1',
        title: 'Recipe',
        price: 12000,
        categories: ['korean'],
        summary: 'summary',
        thumbnailPath: RECIPE_THUMBNAIL_KEY,
        statsView: 10,
        statsScrap: 2,
        statsGood: 5,
        statsBad: 1,
        statsComment: 3,
        createdAt: new Date('2026-03-17T00:00:00.000Z'),
        updatedAt: new Date('2026-03-17T01:00:00.000Z'),
      } satisfies Partial<RecipeOrmEntity>),
    } as unknown as Repository<RecipeOrmEntity>;

    // step 이미지도 URL이 아니라 imagePath 정본 키만 저장돼 있다고 가정합니다.
    const recipeStepRepo = {
      find: jest.fn().mockResolvedValue([
        {
          recipeId: 'recipe-1',
          order: 0,
          text: 'step 1',
          imagePath: RECIPE_STEP_IMAGE_KEY,
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

    // 저장소는 응답 직전에만 path를 signed URL로 변환합니다.
    const s3Storage = {
      getDownloadUrl: jest
        .fn()
        .mockImplementation(async (key: string | undefined | null) => {
          if (!key) {
            return undefined;
          }

          return buildSignedUrl(key);
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

    // 핵심 검증:
    // 1) path는 내부 key 그대로 남아 있어야 하고
    // 2) 클라이언트 다운로드용 URL은 별도 필드로 추가돼야 합니다.
    expect(result).toMatchObject({
      id: 'recipe-1',
      thumbnailUrl: buildSignedUrl(RECIPE_THUMBNAIL_KEY),
      steps: [
        {
          order: 0,
          text: 'step 1',
          image: [
            {
              path: RECIPE_STEP_IMAGE_KEY,
              url: buildSignedUrl(RECIPE_STEP_IMAGE_KEY),
            },
          ],
        },
      ],
    });

    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(
      RECIPE_THUMBNAIL_KEY,
    );
    expect(s3Storage.getDownloadUrl).toHaveBeenCalledWith(
      RECIPE_STEP_IMAGE_KEY,
    );
  });
});
