import { OAuthProfile } from '../auth.types';

export interface OAuthProvider {
  getAuthorizationUrl(state?: string): string;
  exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
