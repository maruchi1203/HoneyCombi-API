import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * 레시피 목록과 상세 응답처럼 읽기 위주의 데이터를 Redis에 캐시합니다.
 * Redis가 비활성화된 환경에서는 조용히 no-op 또는 null 반환으로 동작합니다.
 */
@Injectable()
export class RedisCacheService {
  private readonly enabled = process.env.REDIS_ENABLED === 'true';
  private readonly ttlSeconds = Number(process.env.REDIS_CACHE_TTL ?? 120);
  private readonly redis: Redis | null = null;

  constructor() {
    // 캐시를 끈 환경에서는 Redis 연결 자체를 만들지 않습니다.
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

  /**
   * JSON 문자열로 저장된 캐시 값을 읽어 원래 타입으로 복원합니다.
   */
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

  /**
   * 값을 JSON 문자열로 저장하고 TTL을 설정합니다.
   */
  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    if (!this.redis) {
      return;
    }

    const ttl = ttlSeconds ?? this.ttlSeconds;
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  /**
   * 주어진 prefix로 시작하는 캐시 키를 찾아 한 번에 삭제합니다.
   */
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
