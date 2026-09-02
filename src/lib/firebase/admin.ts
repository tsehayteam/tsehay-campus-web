import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let hasValidCredentials = false;

try {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (rawServiceAccount && rawServiceAccount.trim()) {
    try {
      const serviceAccount = JSON.parse(rawServiceAccount);
      if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
        if (!getApps().length) {
          adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d'
          });
        } else {
          adminApp = getApps()[0];
        }

        if (adminApp) {
          dbInstance = getFirestore(adminApp);
          authInstance = getAuth(adminApp);
          hasValidCredentials = true;
        }
      }
    } catch (parseErr) {
      console.warn('Firebase Admin credential parse warning:', parseErr);
    }
  }
} catch (error) {
  console.warn('Firebase Admin initialization deferred/skipped:', error);
}

export const hasAdminCredentials = hasValidCredentials;
export const adminDb = (hasValidCredentials ? dbInstance : null) as Firestore;
export const adminAuth = (hasValidCredentials ? authInstance : null) as Auth;
