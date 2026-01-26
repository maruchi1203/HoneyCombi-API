import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { USERS_REPOSITORY } from './users.tokens';
import { UsersUseCase } from './usecases/users.usecase';
import { FirebaseUsersRepository } from './adapters/firebase-users.repository';
import { AwsUsersRepository } from './adapters/aws-users.repository';

const usersRepositoryProvider = {
  provide: USERS_REPOSITORY,
  useClass:
    process.env.DATA_PROVIDER === 'aws'
      ? AwsUsersRepository
      : FirebaseUsersRepository,
};

@Module({
  controllers: [UsersController],
  providers: [UsersUseCase, usersRepositoryProvider],
})
export class UsersModule {}
