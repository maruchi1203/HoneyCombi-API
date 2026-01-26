import { Injectable } from '@nestjs/common';
import { OAuthProfile } from '../auth.types';
import { OAuthProvider } from '../ports/oauth.provider';

@Injectable()
export class KakaoOAuthProvider implements OAuthProvider {
  getAuthorizationUrl(_state?: string): string {
    return 'https://kauth.kakao.com/oauth/authorize';
  }

  async exchangeCodeForProfile(_code: string): Promise<OAuthProfile> {
    return { provider: 'kakao', providerId: 'kakao-user-id' };
  }
}
