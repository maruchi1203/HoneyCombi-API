import type { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import { getFirebaseApp } from '../firebase/firebase-admin';

// 인증이 성공하면 req.user에 최소 식별 정보만 남깁니다.
type AuthRequest = Request & { user?: { id?: string; email?: string } };

/**
 * Authorization 헤더의 Firebase ID 토큰을 검증한 뒤 req.user를 채웁니다.
 * 인증이 없거나 검증 실패여도 여기서는 차단하지 않고 다음 단계로 넘깁니다.
 * 실제 접근 제어는 AuthGuard가 담당합니다.
 */
export async function firebaseAuthMiddleware(
  req: AuthRequest,
  next: NextFunction,
) {
  // Bearer 토큰이 없으면 비인증 요청으로 간주하고 그대로 통과시킵니다.
  const header = req.headers['authorization'];
  if (!header) {
    return next();
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next();
  }

  try {
    // Firebase 앱 초기화가 보장된 뒤 ID 토큰을 검증합니다.
    getFirebaseApp();
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      ...(req.user ?? {}),
      id: decoded.uid,
      email: decoded.email,
    };
    return next();
  } catch (error) {
    // 토큰 오류는 여기서 응답을 끊지 않고, 뒤의 Guard가 판단하게 둡니다.
    return next();
  }
}
