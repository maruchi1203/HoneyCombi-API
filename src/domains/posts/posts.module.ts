import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { POSTS_REPOSITORY } from './posts.tokens';
import { PostsUseCase } from './usecases/posts.usecase';
import { FirebasePostsRepository } from './adapters/firebase-posts.repository';
import { AwsPostsRepository } from './adapters/aws-posts.repository';

const postsRepositoryProvider = {
  provide: POSTS_REPOSITORY,
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
