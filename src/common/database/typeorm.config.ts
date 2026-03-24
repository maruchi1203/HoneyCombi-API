import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    // Nest 모듈에 등록된 entity를 연결 설정에 자동으로 포함
    autoLoadEntities: true,
    // 콘솔 로깅 : prod 상태일 때는 성능을 위해 false
    logging: process.env.TYPEORM_LOGGING === 'true',
    // SSL 설정 : PG_SSL_REJECT_UNAUTHORIZED === false면 인증서 검증 안함
    ssl:
      process.env.PG_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
          }
        : false,
  };
}
