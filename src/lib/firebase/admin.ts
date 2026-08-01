import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

function initFirebaseAdmin() {
  if (!getApps().length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({ credential: cert(serviceAccount) });
      } else {
        initializeApp();
      }
    } catch (error) {
      console.warn('Firebase Admin app initialization warning:', error);
    }
  }
}

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  initFirebaseAdmin();
  dbInstance = getFirestore();
  authInstance = getAuth();
} catch (e) {
  console.warn('Firebase Admin services initialization deferred:', e);
}

export const adminDb = dbInstance as Firestore;
export const adminAuth = authInstance as Auth;
