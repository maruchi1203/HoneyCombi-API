import { Inject, Injectable } from '@nestjs/common';
import { AUTH_TOKEN_SERVICE } from '../auth.tokens';
import { TokenService } from '../ports/token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenService,
  ) {}

  refresh(refreshToken: string) {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const accessToken = this.tokenService.createAccessToken({ sub: payload.sub });

    return { accessToken };
  }
}
