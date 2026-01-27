import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

function loadServiceAccount(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is required');
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
  return getFirebaseApp().firestore();
}

export function getStorageBucket(): admin.storage.Bucket {
  const app = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

  if (bucketName) {
    return app.storage().bucket(bucketName);
  }

  return app.storage().bucket();
}
