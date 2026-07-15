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


import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const adminDb = getFirestore();
export const adminAuth = getAuth();
