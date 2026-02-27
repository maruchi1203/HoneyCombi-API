import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT ?? 5432),
    username: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
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
