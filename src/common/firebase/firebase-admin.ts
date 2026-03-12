import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import fs from 'node:fs';

let firebaseApp: admin.app.App | null = null;
let firestoreInstance: admin.firestore.Firestore | null = null;

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

export function getStorageBucket() {
  const app = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);

  if (bucketName) {
    return storage.bucket(bucketName);
  }

  return storage.bucket();
}

