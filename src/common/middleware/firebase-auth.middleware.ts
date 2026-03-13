import type { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import { getFirebaseApp } from '../firebase/firebase-admin';

type AuthRequest = Request & { user?: { id?: string; email?: string } };

/**
 * AuthGuard 통과를 위한 미들웨어
 * @param req
 * @param _res
 * @param next
 * @returns
 */
export async function firebaseAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const allowDevHeaderAuth = process.env.ALLOW_DEV_AUTH_HEADER === 'true';
  const devUserIdHeader = req.headers['x-user-id'];
  const devUserEmailHeader = req.headers['x-user-email'];

  if (allowDevHeaderAuth) {
    const devUserId = Array.isArray(devUserIdHeader)
      ? devUserIdHeader[0]
      : devUserIdHeader;
    const devUserEmail = Array.isArray(devUserEmailHeader)
      ? devUserEmailHeader[0]
      : devUserEmailHeader;

    if (devUserId) {
      req.user = {
        ...(req.user ?? {}),
        id: devUserId,
        email: devUserEmail,
      };
      return next();
    }
  }

  const header = req.headers['authorization'];
  if (!header) {
    return next();
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next();
  }

  try {
    getFirebaseApp();
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      ...(req.user ?? {}),
      id: decoded.uid,
      email: decoded.email,
    };
    return next();
  } catch (error) {
    return next();
  }
}
