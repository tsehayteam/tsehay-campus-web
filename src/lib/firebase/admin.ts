import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('Firebase Admin Initialized successfully with Service Account.');
    } else {
      initializeApp();
      console.log('Firebase Admin Initialized with default credentials.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}


import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let db: Firestore | null = null;
let auth: Auth | null = null;

try {
    db = getFirestore();
    auth = getAuth();
} catch (error) {
    console.error('Firebase Admin services failed to initialize:', error);
}

export const adminDb = db as Firestore;
export const adminAuth = auth as Auth;
