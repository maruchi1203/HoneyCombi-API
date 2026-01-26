import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_REFRESH_TOKEN_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  AUTH_USER_IDENTITY,
} from '../auth.tokens';
import { OAuthProfile } from '../auth.types';
import type { RefreshTokenRepository } from '../ports/refresh-token.repository';
import type { TokenService } from '../ports/token.service';
import type { UserIdentityPort } from '../ports/user-identity.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_USER_IDENTITY)
    private readonly userIdentity: UserIdentityPort,
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(AUTH_REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async login(profile: OAuthProfile) {
    const user = await this.userIdentity.findOrCreateByProvider(profile);
    const accessToken = this.tokenService.createAccessToken({
      sub: user.id,
      provider: profile.provider,
    });
    const refreshToken = this.tokenService.createRefreshToken({ sub: user.id });

    await this.refreshTokenRepository.save(user.id, refreshToken);

    return { accessToken, refreshToken, user };
  }
}
