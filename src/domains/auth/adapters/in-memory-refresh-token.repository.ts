import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../ports/refresh-token.repository';

@Injectable()
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Set<string>();

  async save(_userId: string, refreshToken: string): Promise<void> {
    this.tokens.add(refreshToken);
  }

  async revoke(refreshToken: string): Promise<void> {
    this.tokens.delete(refreshToken);
  }
}
