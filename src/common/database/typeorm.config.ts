import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    autoLoadEntities: true,
    synchronize: process.env.TYPEORM_SYNC === 'true',
    logging: process.env.TYPEORM_LOGGING === 'true',
    ssl:
      process.env.PG_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  };
}
