import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: any }>();

    // request에 user가 있다면 인증 검사 통과
    const existingUserId = request.user?.id;
    if (existingUserId) {
      return true;
    }

    // TODO(auth): remove x-user-id fallback after auth middleware is in place.
    const headerValue = request.headers['x-user-id'];
    const fallbackUserId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    if (fallbackUserId) {
      request.user = { ...(request.user ?? {}), id: fallbackUserId };
      return true;
    }

    // 없다면
    throw new UnauthorizedException('유저를 확인할 수 없습니다');
  }
}
