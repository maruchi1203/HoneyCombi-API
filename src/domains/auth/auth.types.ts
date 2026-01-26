export type OAuthProviderName = 'google' | 'facebook' | 'kakao';

export interface OAuthProfile {
  provider: OAuthProviderName;
  providerId: string;
  email?: string;
  name?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

export interface AccessTokenPayload {
  sub: string;
  provider?: OAuthProviderName;
}

export interface RefreshTokenPayload {
  sub: string;
}
