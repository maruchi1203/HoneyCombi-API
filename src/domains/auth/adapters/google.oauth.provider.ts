import { Injectable } from '@nestjs/common';
import { OAuthProfile } from '../auth.types';
import { OAuthProvider } from '../ports/oauth.provider';
import { Auth } from 'googleapis';

@Injectable()
export class GoogleOAuthProvider implements OAuthProvider {
  oauth2Client = new Auth.OAuth2Client(
    
  );

  getAuthorizationUrl(_state?: string): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }

  async exchangeCodeForProfile(_code: string): Promise<OAuthProfile> {
    return { provider: 'google', providerId: 'google-user-id' };
  }
}
