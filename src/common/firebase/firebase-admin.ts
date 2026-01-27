import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

let firebaseApp: admin.app.App | null = null;
let firestoreInstance: admin.firestore.Firestore | null = null;

function loadServiceAccount(): admin.ServiceAccount {
  const rawInput = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawInput) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH is required',
    );
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

export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const firestore = getFirebaseApp().firestore();
  firestore.settings({ ignoreUndefinedProperties: true });
  firestoreInstance = firestore;
  return firestore;
}

export function getStorageBucket(): Bucket {
  const app = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);

  if (bucketName) {
    return storage.bucket(bucketName);
  }

  return storage.bucket();
}
