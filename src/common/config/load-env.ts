import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const cwd = process.cwd();
const envPath = resolve(cwd, '.env');
const envLocalPath = resolve(cwd, '.env.local');

if (existsSync(envPath)) {
  config({ path: envPath });
}

if (process.env.NODE_ENV !== 'production' && existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}
