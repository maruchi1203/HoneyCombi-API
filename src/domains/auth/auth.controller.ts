import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AUTH_OAUTH_PROVIDERS } from './auth.tokens';
import type { OAuthProviderName } from './auth.types';
import { OAuthProvider } from './ports/oauth.provider';
import { LoginUseCase } from './usecases/login.usecase';
import { LogoutUseCase } from './usecases/logout.usecase';
import { RefreshTokenUseCase } from './usecases/refresh-token.usecase';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_OAUTH_PROVIDERS)
    private readonly oauthProviders: Record<string, OAuthProvider>,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Get(':provider')
  start(@Param('provider') provider: OAuthProviderName) {
    const oauthProvider = this.oauthProviders[provider];

    return { url: oauthProvider.getAuthorizationUrl() };
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: OAuthProviderName,
    @Query('code') code: string,
  ) {
    const oauthProvider = this.oauthProviders[provider];
    const profile = await oauthProvider.exchangeCodeForProfile(code);

    return this.loginUseCase.login(profile);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.refreshTokenUseCase.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Body('refreshToken') refreshToken: string) {
    return this.logoutUseCase.logout(refreshToken);
  }
}
