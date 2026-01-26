import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  AUTH_OAUTH_PROVIDERS,
  AUTH_REFRESH_TOKEN_REPOSITORY,
  AUTH_TOKEN_SERVICE,
  AUTH_USER_IDENTITY,
} from './auth.tokens';
import { DummyUserIdentityAdapter } from './adapters/dummy-user-identity.adapter';
import { FacebookOAuthProvider } from './adapters/facebook.oauth.provider';
import { GoogleOAuthProvider } from './adapters/google.oauth.provider';
import { InMemoryRefreshTokenRepository } from './adapters/in-memory-refresh-token.repository';
import { KakaoOAuthProvider } from './adapters/kakao.oauth.provider';
import { SimpleTokenService } from './adapters/simple-token.service';
import { LoginUseCase } from './usecases/login.usecase';
import { LogoutUseCase } from './usecases/logout.usecase';
import { RefreshTokenUseCase } from './usecases/refresh-token.usecase';

const oauthProvidersMapProvider = {
  provide: AUTH_OAUTH_PROVIDERS,
  useFactory: (
    google: GoogleOAuthProvider,
    facebook: FacebookOAuthProvider,
    kakao: KakaoOAuthProvider,
  ) => ({
    google,
    facebook,
    kakao,
  }),
  inject: [GoogleOAuthProvider, FacebookOAuthProvider, KakaoOAuthProvider],
};

@Module({
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GoogleOAuthProvider,
    FacebookOAuthProvider,
    KakaoOAuthProvider,
    SimpleTokenService,
    InMemoryRefreshTokenRepository,
    DummyUserIdentityAdapter,
    oauthProvidersMapProvider,
    { provide: AUTH_TOKEN_SERVICE, useClass: SimpleTokenService },
    {
      provide: AUTH_REFRESH_TOKEN_REPOSITORY,
      useClass: InMemoryRefreshTokenRepository,
    },
    { provide: AUTH_USER_IDENTITY, useClass: DummyUserIdentityAdapter },
  ],
})
export class AuthModule {}
