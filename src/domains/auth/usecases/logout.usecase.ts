import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REFRESH_TOKEN_REPOSITORY } from '../auth.tokens';
import type { RefreshTokenRepository } from '../ports/refresh-token.repository';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(AUTH_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  logout(refreshToken: string) {
    return this.refreshTokenRepository.revoke(refreshToken);
  }
}
