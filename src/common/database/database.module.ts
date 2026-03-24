import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './typeorm.config';

// aws 경로에서는 PostgreSQL(TypeORM)을 사용하고, 그 외 경로에서는 DB 모듈을 올리지 않습니다.
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
