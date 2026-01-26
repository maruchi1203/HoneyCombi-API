import { AccessTokenPayload, RefreshTokenPayload } from '../auth.types';

export interface TokenService {
  createAccessToken(payload: AccessTokenPayload): string;
  createRefreshToken(payload: RefreshTokenPayload): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
