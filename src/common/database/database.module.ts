import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './typeorm.config';

const isAwsProvider = process.env.DATA_PROVIDER === 'aws';

@Module({
  imports: isAwsProvider
    ? [
        TypeOrmModule.forRootAsync({
          useFactory: () => getTypeOrmConfig(),
        }),
      ]
    : [],
})
export class DatabaseModule {}
