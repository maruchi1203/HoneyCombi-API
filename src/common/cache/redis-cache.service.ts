import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly enabled = process.env.REDIS_ENABLED === 'true';
  private readonly ttlSeconds = Number(process.env.REDIS_CACHE_TTL ?? 120);
  private readonly redis: Redis | null = null;

  constructor() {
    if (!this.enabled) {
      return;
    }

    const redisUrl = process.env.REDIS_URL ?? null;
    if (!redisUrl) {
      return;
    }

    this.redis = new Redis(redisUrl);
    this.redis.connect().catch(() => undefined);
  }

  // 데이터 불러오기
  async getJson<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  // 데이터 불러오기
  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    if (!this.redis) {
      return;
    }

    const ttl = ttlSeconds ?? this.ttlSeconds;
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async delByPrefix(prefix: string) {
    if (!this.redis) {
      return;
    }

    const stream = this.redis.scanStream({ match: `${prefix}*`, count: 100 });
    const keys: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (resultKeys: string[]) => keys.push(...resultKeys));
      stream.on('end', () => resolve());
      stream.on('error', (error) => reject(error));
    });

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
