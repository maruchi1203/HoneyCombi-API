import { Injectable } from '@nestjs/common';
import { OAuthProfile } from '../auth.types';
import { OAuthProvider } from '../ports/oauth.provider';

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  getAuthorizationUrl(_state?: string): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  async exchangeCodeForProfile(_code: string): Promise<OAuthProfile> {
    return { provider: 'google', providerId: 'google-user-id' };
  }
}
