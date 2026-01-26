import { Injectable } from '@nestjs/common';
import { AccessTokenPayload, RefreshTokenPayload } from '../auth.types';
import { TokenService } from '../ports/token.service';

@Injectable()
export class SimpleTokenService implements TokenService {
  createAccessToken(payload: AccessTokenPayload): string {
    return `access-${payload.sub}`;
  }

  createRefreshToken(payload: RefreshTokenPayload): string {
    return `refresh-${payload.sub}`;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const parts = token.split('-');
    const sub = parts.length > 1 ? parts.slice(1).join('-') : token;

    return { sub };
  }
}
