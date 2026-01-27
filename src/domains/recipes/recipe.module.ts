import { Module } from '@nestjs/common';
import { PostsController } from './recipe.controller';
import { RECIPE_REPOSITORY } from './recipe.tokens';
import { PostsUseCase } from './usecases/recipe.usecase';
import { FirebasePostsRepository } from './adapters/firebase.recipe.repository';
import { AwsPostsRepository } from './adapters/aws.recipe.repository';

const postsRepositoryProvider = {
  provide: RECIPE_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsPostsRepository
      : FirebasePostsRepository,
};

@Module({
  controllers: [PostsController],
  providers: [PostsUseCase, postsRepositoryProvider],
})
export class PostsModule {}
