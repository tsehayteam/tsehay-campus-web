// Lazy dynamic loader for Firebase Admin to prevent module loading crashes on Vercel
import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

function initFirebaseAdmin() {
  if (adminApp && dbInstance && authInstance) return;

  try {
    let serviceAccount: any = null;
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (raw && raw.trim()) {
      try {
        serviceAccount = JSON.parse(raw);
      } catch {
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
        } catch {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fs = require('fs');
            if (fs.existsSync(raw.trim())) {
              serviceAccount = JSON.parse(fs.readFileSync(raw.trim(), 'utf8'));
            }
          } catch {}
        }
      }
    }

    if (!serviceAccount) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path');
        const localKeyPath = path.join(process.cwd(), 'src/lib/firebase/serviceAccountKey.json');
        if (fs.existsSync(localKeyPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
        }
      } catch {}
    }

    if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      serviceAccount = {
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d',
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY
      };
    }

    if (!serviceAccount?.private_key || !serviceAccount?.client_email) return;

    if (typeof serviceAccount.private_key === 'string' && serviceAccount.private_key.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

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
  ((process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 10) ||
   (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL))
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
