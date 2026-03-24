import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Supabase PostgreSQL 연결에 사용하는 TypeORM 설정을 생성합니다.
 */
export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    // 각 도메인 모듈에서 등록한 entity를 자동으로 연결 설정에 포함합니다.
    autoLoadEntities: true,
    // SQL 로그 출력 여부는 환경변수로 제어합니다.
    logging: process.env.TYPEORM_LOGGING === 'true',
    // Supabase 연결 시 필요한 SSL 옵션을 환경변수로 조절합니다.
    ssl:
      process.env.PG_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  };
}
