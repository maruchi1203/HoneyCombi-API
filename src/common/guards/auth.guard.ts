import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * 인증 미들웨어가 req.user.id를 채웠는지만 확인하는 얇은 Guard입니다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string } }>();

    // 사용자 식별자가 있으면 이후 컨트롤러에서 그대로 사용합니다.
    if (request.user?.id) {
      return true;
    }

    throw new UnauthorizedException('인증용 UserID 필요');
  }
}
