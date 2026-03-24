import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

// 현재 프로세스 작업 디렉토리를 기준으로 환경변수 파일 경로를 계산합니다.
const cwd = process.cwd();
const envPath = resolve(cwd, '.env');
const envLocalPath = resolve(cwd, '.env.local');

// 공통 환경변수를 먼저 읽습니다.
if (existsSync(envPath)) {
  config({ path: envPath });
}

// 개발 환경에서는 .env.local이 마지막에 덮어쓰도록 적용합니다.
if (process.env.NODE_ENV !== 'production' && existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}
