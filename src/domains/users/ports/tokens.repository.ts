export interface UserTokensRepository {
  saveTokens(userId: string, refreshToken: string): Promise<void>;
}
