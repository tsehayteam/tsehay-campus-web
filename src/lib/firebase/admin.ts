import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  const defaultProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d';
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || defaultProjectId
        });
      } catch (parseErr) {
        console.warn('Failed parsing FIREBASE_SERVICE_ACCOUNT, falling back to default:', parseErr);
        adminApp = initializeApp({ projectId: defaultProjectId });
      }
    } else {
      adminApp = initializeApp({ projectId: defaultProjectId });
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

export const hasAdminCredentials = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
export const adminDb = dbInstance as Firestore;
export const adminAuth = authInstance as Auth;
