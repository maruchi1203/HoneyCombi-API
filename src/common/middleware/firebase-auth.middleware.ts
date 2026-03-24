import type { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import { getFirebaseApp } from '../firebase/firebase-admin';

type AuthRequest = Request & { user?: { id?: string; email?: string } };

/**
 * AuthGuard 통과를 위한 미들웨어
 * @param req HTTP 요청 객체
 * @param next 미들웨어나 다음 단계로 요청 처리를 넘기는 함수
 * @returns
 */
export async function firebaseAuthMiddleware(
  req: AuthRequest,
  next: NextFunction,
) {
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
