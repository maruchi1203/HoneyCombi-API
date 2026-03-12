import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { USERS_REPOSITORY } from './users.tokens';
import { UsersUseCase } from './usecases/users.usecase';
import { FirebaseUsersRepository } from './adapters/firebase.users.repository';
import { AwsUsersRepository } from './adapters/aws.users.repository';
import { UserOrmEntity } from './adapters/entities/user.orm-entity';

const isAwsProvider = process.env.DATA_PROVIDER === 'aws';
const usersRepositoryClass = isAwsProvider
  ? AwsUsersRepository
  : FirebaseUsersRepository;

const adapterImports = isAwsProvider ? [TypeOrmModule.forFeature([UserOrmEntity])] : [];
const adapterProviders = isAwsProvider
  ? [AwsUsersRepository]
  : [FirebaseUsersRepository];

@Module({
  imports: [...adapterImports],
  controllers: [UsersController],
  providers: [
    UsersUseCase,
    ...adapterProviders,
    { provide: USERS_REPOSITORY, useExisting: usersRepositoryClass },
  ],
})
export class UsersModule {}
