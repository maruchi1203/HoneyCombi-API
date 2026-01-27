import { Module } from '@nestjs/common';
import { RecipesController as RecipesController } from './recipe.controller';
import { RECIPE_REPOSITORY } from './recipe.tokens';
import { RecipesUseCase } from './usecases/recipe.usecase';
import { FirebaseRecipesRepository } from './adapters/firebase.recipe.repository';
import { AwsRecipesRepository } from './adapters/aws.recipe.repository';

const recipesRepositoryProvider = {
  provide: RECIPE_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsRecipesRepository
      : FirebaseRecipesRepository,
};

@Module({
  controllers: [RecipesController],
  providers: [RecipesUseCase, recipesRepositoryProvider],
})
export class RecipeModule {}
