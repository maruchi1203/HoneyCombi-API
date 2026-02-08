export interface UserTokensPort {
  saveTokens(userId: string, refreshToken: string): Promise<void>;
}
