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
      .getRequest<Request & { user?: { id?: string } }>();

    if (request.user?.id) {
      return true;
    }

    throw new UnauthorizedException('인증용 UserID 필요');
  }
}
