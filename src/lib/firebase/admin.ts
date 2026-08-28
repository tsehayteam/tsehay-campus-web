import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminApp = initializeApp({ credential: cert(serviceAccount) });
      } catch (parseErr) {
        console.warn('Failed parsing FIREBASE_SERVICE_ACCOUNT, falling back to default:', parseErr);
        adminApp = initializeApp();
      }
    } else {
      adminApp = initializeApp();
    }
  } else {
    adminApp = getApps()[0];
  }

  if (adminApp) {
    try {
      dbInstance = getFirestore(adminApp);
    } catch (dbInitErr) {
      console.warn('Firebase Admin getFirestore warning:', dbInitErr);
    }
    try {
      authInstance = getAuth(adminApp);
    } catch (authInitErr) {
      console.warn('Firebase Admin getAuth warning:', authInitErr);
    }
  }
} catch (error) {
  console.warn('Firebase Admin initialization deferred/skipped:', error);
}

export const adminDb = dbInstance as Firestore;
export const adminAuth = authInstance as Auth;
