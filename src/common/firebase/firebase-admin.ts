import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import fs from 'node:fs';

// Firebase Admin SDK 인스턴스는 한 번만 초기화해서 재사용합니다.
let firebaseApp: admin.app.App | null = null;
let firestoreInstance: admin.firestore.Firestore | null = null;

/**
 * 환경변수 또는 파일 경로에서 Firebase 서비스 계정 정보를 읽습니다.
 */
function loadServiceAccount(): admin.ServiceAccount {
  const rawInput = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawInput) {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!path) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH is required',
      );
    }
    const fileContent = fs.readFileSync(path, 'utf8');
    return JSON.parse(fileContent) as admin.ServiceAccount;
  }

  let raw = rawInput.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }

  let parsed = JSON.parse(raw) as admin.ServiceAccount;
  if (parsed.privateKey) {
    parsed = {
      ...parsed,
      privateKey: parsed.privateKey.replace(/\\n/g, '\n'),
    };
  }

  return parsed;
}

/**
 * Firebase Admin App을 싱글턴으로 초기화합니다.
 */
export function getFirebaseApp(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });

  return firebaseApp;
}

/**
 * Firestore 인스턴스를 가져오고 undefined 필드 무시 옵션을 적용합니다.
 */
export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const firestore = getFirebaseApp().firestore();
  firestore.settings({ ignoreUndefinedProperties: true });
  firestoreInstance = firestore;
  return firestore;
}

/**
 * Firebase Storage 버킷을 가져옵니다.
 * 버킷명이 지정되지 않았으면 기본 버킷을 사용합니다.
 */
export function getStorageBucket() {
  const app = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);

  if (bucketName) {
    return storage.bucket(bucketName);
  }

  return storage.bucket();
}
