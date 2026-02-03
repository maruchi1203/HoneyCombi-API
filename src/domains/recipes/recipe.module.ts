import { Module } from '@nestjs/common';
import { RecipesController as RecipesController } from './recipe.controller';
import { COMMENT_REPOSITORY, RECIPE_REPOSITORY } from './recipe.tokens';
import { RecipesUseCase } from './usecases/recipe.usecase';
import { CommentUseCase } from './usecases/comment.usecase';
import { FirebaseRecipesRepository } from './adapters/firebase.recipe.repository';
import { AwsRecipesRepository } from './adapters/aws.recipe.repository';

const recipesRepositoryProvider = {
  provide: RECIPE_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsRecipesRepository
      : FirebaseRecipesRepository,
};

const commentRepositoryProvider = {
  provide: COMMENT_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsRecipesRepository
      : FirebaseRecipesRepository,
};

@Module({
  controllers: [RecipesController],
  providers: [
    RecipesUseCase,
    CommentUseCase,
    recipesRepositoryProvider,
    commentRepositoryProvider,
  ],
})
export class RecipeModule {}
