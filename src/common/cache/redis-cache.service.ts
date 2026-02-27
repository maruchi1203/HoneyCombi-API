import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

type Primitive = string | number;

@Injectable()
export class RedisCacheService {
  private readonly enabled = process.env.REDIS_ENABLED === 'true';
  private readonly ttlSeconds = Number(process.env.REDIS_CACHE_TTL ?? 120);
  private readonly redis: Redis | null;
  private readonly upstashRestUrl: string | null;
  private readonly upstashRestToken: string | null;

  constructor() {
    if (!this.enabled) {
      this.redis = null;
      this.upstashRestUrl = null;
      this.upstashRestToken = null;
      return;
    }

    const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL ?? null;
    const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? null;

    // Prefer Upstash REST when credentials are provided.
    if (upstashRestUrl && upstashRestToken) {
      this.redis = null;
      this.upstashRestUrl = upstashRestUrl.replace(/\/$/, '');
      this.upstashRestToken = upstashRestToken;
      return;
    }

    this.upstashRestUrl = null;
    this.upstashRestToken = null;

    const redisUrl = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const password = process.env.REDIS_PASSWORD;
    const db = Number(process.env.REDIS_DB ?? 0);
    const tlsEnabled = process.env.REDIS_TLS === 'true';

    if (!redisUrl && !host) {
      this.redis = null;
      return;
    }

    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true });
      this.redis.connect().catch(() => undefined);
      return;
    }

    this.redis = new Redis({
      host,
      port,
      password,
      db,
      lazyConnect: true,
      tls: tlsEnabled ? {} : undefined,
    });
    this.redis.connect().catch(() => undefined);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.upstashRestUrl && this.upstashRestToken) {
      const raw = await this.upstashCommand<string>('GET', key);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    }

    if (!this.redis) {
      return null;
    }

    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const ttl = ttlSeconds ?? this.ttlSeconds;

    if (this.upstashRestUrl && this.upstashRestToken) {
      await this.upstashCommand('SET', key, JSON.stringify(value), 'EX', ttl);
      return;
    }

    if (!this.redis) {
      return;
    }

    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async delByPrefix(prefix: string) {
    if (this.upstashRestUrl && this.upstashRestToken) {
      const match = `${prefix}*`;
      let cursor = '0';
      const keys: string[] = [];

      do {
        const result = await this.upstashCommand<[string, string[]]>(
          'SCAN',
          cursor,
          'MATCH',
          match,
          'COUNT',
          100,
        );

        if (!result) {
          break;
        }

        cursor = result[0] ?? '0';
        const chunk = result[1] ?? [];
        if (chunk.length > 0) {
          keys.push(...chunk);
        }
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.upstashCommand('DEL', ...keys);
      }

      return;
    }

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

  private async upstashCommand<T>(
    command: string,
    ...args: Primitive[]
  ): Promise<T | null> {
    if (!this.upstashRestUrl || !this.upstashRestToken) {
      return null;
    }

    const path = [command, ...args.map((arg) => String(arg))]
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    const response = await fetch(`${this.upstashRestUrl}/${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.upstashRestToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      result?: T;
      error?: string;
    };

    if (payload.error) {
      return null;
    }

    return (payload.result ?? null) as T | null;
  }
}
