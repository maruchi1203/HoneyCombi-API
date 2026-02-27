import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController as RecipesController } from './recipe.controller';
import { COMMENT_REPOSITORY, RECIPE_REPOSITORY } from './recipe.tokens';
import { RecipesUseCase } from './usecases/recipe.usecase';
import { CommentUseCase } from './usecases/comment.usecase';
import { AwsRecipesRepository } from './adapters/aws.recipe.repository';
import { FirebaseRecipesRepository } from './adapters/firebase.recipe.repository';
import { RecipeOrmEntity } from './adapters/entities/recipe.orm-entity';
import { RecipeCommentOrmEntity } from './adapters/entities/recipe-comment.orm-entity';
import { S3StorageService } from '../../common/storage/s3.storage.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

const isAwsProvider = process.env.DATA_PROVIDER === 'aws';
const recipesRepositoryClass = isAwsProvider
  ? AwsRecipesRepository
  : FirebaseRecipesRepository;

const adapterImports = isAwsProvider
  ? [TypeOrmModule.forFeature([RecipeOrmEntity, RecipeCommentOrmEntity])]
  : [];

const adapterProviders = isAwsProvider
  ? [S3StorageService, RedisCacheService, AwsRecipesRepository]
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
