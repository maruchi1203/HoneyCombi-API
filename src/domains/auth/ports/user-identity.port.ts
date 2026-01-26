import { AuthUser, OAuthProfile } from '../auth.types';

export interface UserIdentityPort {
  findOrCreateByProvider(profile: OAuthProfile): Promise<AuthUser>;
}
