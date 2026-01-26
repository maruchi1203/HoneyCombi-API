import { LoginUseCase } from './login.usecase';
import { AUTH_REFRESH_TOKEN_REPOSITORY, AUTH_TOKEN_SERVICE, AUTH_USER_IDENTITY } from '../auth.tokens';
import { OAuthProfile } from '../auth.types';
import { RefreshTokenRepository } from '../ports/refresh-token.repository';
import { TokenService } from '../ports/token.service';
import { UserIdentityPort } from '../ports/user-identity.port';

class FakeUserIdentity implements UserIdentityPort {
  async findOrCreateByProvider() {
    return { id: 'user-1', email: 'test@example.com', name: 'tester' };
  }
}

class FakeTokenService implements TokenService {
  createAccessToken() {
    return 'access-token';
  }

  createRefreshToken() {
    return 'refresh-token';
  }

  verifyRefreshToken() {
    return { sub: 'user-1' };
  }
}

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  saved: string[] = [];

  async save(_userId: string, refreshToken: string) {
    this.saved.push(refreshToken);
  }

  async revoke() {
    return;
  }
}

describe('LoginUseCase', () => {
  it('returns tokens and user profile', async () => {
    const userIdentity = new FakeUserIdentity();
    const tokenService = new FakeTokenService();
    const refreshTokenRepository = new FakeRefreshTokenRepository();

    const useCase = new LoginUseCase(
      userIdentity,
      tokenService,
      refreshTokenRepository,
    );

    const profile: OAuthProfile = {
      provider: 'google',
      providerId: 'google-user-id',
      email: 'test@example.com',
      name: 'tester',
    };

    const result = await useCase.login(profile);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('user-1');
    expect(refreshTokenRepository.saved).toContain('refresh-token');
  });
});
