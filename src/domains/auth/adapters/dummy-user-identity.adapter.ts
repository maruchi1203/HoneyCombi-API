import { Injectable } from '@nestjs/common';
import { AuthUser, OAuthProfile } from '../auth.types';
import { UserIdentityPort } from '../ports/user-identity.port';

@Injectable()
export class DummyUserIdentityAdapter implements UserIdentityPort {
  async findOrCreateByProvider(profile: OAuthProfile): Promise<AuthUser> {
    return {
      id: `${profile.provider}-${profile.providerId}`,
      email: profile.email,
      name: profile.name,
    };
  }
}
