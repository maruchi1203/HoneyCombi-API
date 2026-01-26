import { RefreshTokenUseCase } from './refresh-token.usecase';
import { TokenService } from '../ports/token.service';

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

describe('RefreshTokenUseCase', () => {
  it('issues new access token', () => {
    const tokenService = new FakeTokenService();
    const useCase = new RefreshTokenUseCase(tokenService);

    const result = useCase.refresh('refresh-token');

    expect(result.accessToken).toBe('access-token');
  });
});
