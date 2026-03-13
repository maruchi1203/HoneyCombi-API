import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { USERS_REPOSITORY } from './users.tokens';
import { UsersUseCase } from './usecases/users.usecase';
import { FirebaseUsersRepository } from './adapters/firebase.users.repository';
import { SupabaseUsersRepository } from './adapters/supabase.users.repository';
import { UserOrmEntity } from './adapters/entities/user.orm-entity';
import { S3StorageService } from '../../common/storage/s3.storage.service';

// 
const isAwsProvider = process.env.DATA_PROVIDER === 'aws';
const usersRepositoryClass = isAwsProvider
  ? SupabaseUsersRepository
  : FirebaseUsersRepository;

const adapterImports = isAwsProvider
  ? [TypeOrmModule.forFeature([UserOrmEntity])]
  : [];
const adapterProviders = isAwsProvider
  ? [S3StorageService, SupabaseUsersRepository]
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
