/**
 * recipes 도메인의 컨트롤러, 유스케이스, 저장소 구현을 조립하는 Nest 모듈입니다.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController as RecipesController } from './recipe.controller';
import { COMMENT_REPOSITORY, RECIPE_REPOSITORY } from './recipe.tokens';
import { RecipesUseCase } from './usecases/recipe.usecase';
import { CommentUseCase } from './usecases/comment.usecase';
import { SupabaseRecipesRepository } from './adapters/supabase.recipe.repository';
import { FirebaseRecipesRepository } from './adapters/firebase.recipe.repository';
import {
  RecipeCommentOrmEntity,
  RecipeOrmEntity,
  RecipeStepOrmEntity,
} from './adapters/orm';
import { S3StorageService } from '../../common/storage/s3.storage.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

// 모듈 선택
const isAwsProvider = process.env.DATA_PROVIDER === 'aws';
const recipesRepositoryClass = isAwsProvider
  ? SupabaseRecipesRepository
  : FirebaseRecipesRepository;

  // 
const adapterImports = isAwsProvider
  ? [
      TypeOrmModule.forFeature([
        RecipeOrmEntity,
        RecipeStepOrmEntity,
        RecipeCommentOrmEntity,
      ]),
    ]
  : [];

const adapterProviders = isAwsProvider
  ? [S3StorageService, RedisCacheService, SupabaseRecipesRepository]
  : [FirebaseRecipesRepository];

@Module({
  imports: [...adapterImports],
  controllers: [RecipesController],
  providers: [
    RecipesUseCase,
    CommentUseCase,
    ...adapterProviders,
    { provide: RECIPE_REPOSITORY, useExisting: recipesRepositoryClass },
    { provide: COMMENT_REPOSITORY, useExisting: recipesRepositoryClass },
  ],
})
export class RecipeModule {}
