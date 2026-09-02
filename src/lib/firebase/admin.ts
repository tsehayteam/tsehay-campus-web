// Lazy dynamic loader for Firebase Admin to prevent module loading crashes on Vercel
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return;
  initialized = true;

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw || !raw.trim()) return;

    let serviceAccount: any = null;
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      return;
    }

    if (!serviceAccount?.private_key || !serviceAccount?.client_email) return;

    // Dynamically require firebase-admin at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin');
    if (!admin.apps || !admin.apps.length) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d'
      });
    } else {
      adminApp = admin.apps[0];
    }

    if (adminApp) {
      dbInstance = admin.firestore(adminApp);
      authInstance = admin.auth(adminApp);
    }
  } catch (err) {
    console.warn('Firebase Admin dynamic init notice:', err);
  }
}

export function getAdminDb(): Firestore | null {
  initFirebaseAdmin();
  return dbInstance;
}

export function getAdminAuth(): Auth | null {
  initFirebaseAdmin();
  return authInstance;
}

export const hasAdminCredentials = Boolean(
  typeof process !== 'undefined' &&
  process.env &&
  process.env.FIREBASE_SERVICE_ACCOUNT &&
  process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 10
);

// Resilient Proxy that never crashes during module evaluation or if credentials are absent
export const adminDb = new Proxy({} as Firestore, {
  get(target, prop) {
    initFirebaseAdmin();
    if (!dbInstance) return undefined;
    const val = (dbInstance as any)[prop];
    return typeof val === 'function' ? val.bind(dbInstance) : val;
  }
});

export const adminAuth = new Proxy({} as Auth, {
  get(target, prop) {
    initFirebaseAdmin();
    if (!authInstance) return undefined;
    const val = (authInstance as any)[prop];
    return typeof val === 'function' ? val.bind(authInstance) : val;
  }
});
