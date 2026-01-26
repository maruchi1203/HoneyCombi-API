import { Injectable } from '@nestjs/common';
import { OAuthProfile } from '../auth.types';
import { OAuthProvider } from '../ports/oauth.provider';

@Injectable()
export class FacebookOAuthProvider implements OAuthProvider {
  getAuthorizationUrl(_state?: string): string {
    return 'https://www.facebook.com/v21.0/dialog/oauth';
  }

  async exchangeCodeForProfile(_code: string): Promise<OAuthProfile> {
    return { provider: 'facebook', providerId: 'facebook-user-id' };
  }
}
