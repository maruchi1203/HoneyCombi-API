export interface RefreshTokenRepository {
  save(userId: string, refreshToken: string): Promise<void>;
  revoke(refreshToken: string): Promise<void>;
}
