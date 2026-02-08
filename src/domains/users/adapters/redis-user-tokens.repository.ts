import { Injectable } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { UserTokensPort } from '../ports/tokens.port';

@Injectable()
export class RedisUserTokensRepository implements UserTokensPort {
  private readonly client: RedisClientType;
  private readonly ready: Promise<any>;
  private readonly ttlSeconds: number | null;

  constructor() {
    const url = process.env.REDIS_URL;
    const host = process.env.REDIS_HOST ?? '127.0.0.1';
    const port = Number(process.env.REDIS_PORT ?? 6379);
    const password = process.env.REDIS_PASSWORD;
    const ttlRaw = process.env.S_TTL_SECONDS;
    const ttl = ttlRaw ? Number(ttlRaw) : null;

    this.ttlSeconds = Number.isFinite(ttl) && ttl && ttl > 0 ? ttl : null;

    this.client = createClient(
      url
        ? { url }
        : {
            socket: { host, port },
            password: password || undefined,
          },
    );

    this.client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Redis error:', err);
    });

    this.ready = this.client.connect();
  }

  async saveTokens(userId: string, refreshToken: string): Promise<void> {
    await this.ready;
    const key = this.tokensKey(userId);
    await this.client.hSet(key, {
      refreshToken,
    });

    if (this.ttlSeconds) {
      await this.client.expire(key, this.ttlSeconds);
    }
  }

  private tokensKey(userId: string) {
    return `users:tokens:${userId}`;
  }
}
