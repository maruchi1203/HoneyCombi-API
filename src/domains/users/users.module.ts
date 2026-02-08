import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { USERS_REPOSITORY, USERS_TOKENS_REPOSITORY } from './users.tokens';
import { UsersUseCase } from './usecases/users.usecase';
import { FirebaseUsersRepository } from './adapters/firebase.users.repository';
import { AwsUsersRepository } from './adapters/aws.users.repository';
import { RedisUserTokensRepository } from './adapters/redis-user-tokens.repository';

const usersRepositoryProvider = {
  provide: USERS_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsUsersRepository
      : FirebaseUsersRepository,
};

@Module({
  controllers: [UsersController],
  providers: [
    UsersUseCase,
    usersRepositoryProvider,
    { provide: USERS_TOKENS_REPOSITORY, useClass: RedisUserTokensRepository },
  ],
})
export class UsersModule {}
