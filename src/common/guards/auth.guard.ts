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

    const existingUserId = request.user?.id;
    if (existingUserId) {
      return true;
    }

    throw new UnauthorizedException('Authentication required.');
  }
}
