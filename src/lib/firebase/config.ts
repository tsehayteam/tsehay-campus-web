import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const getAuthDomain = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('tsehaycampus.com')) {
      return host;
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'tsehaycampus-e1a6d.firebaseapp.com';
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDCxlwfYAS_I0D7c-8e-iB-Y-Rh2ZZoHZw',
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tsehaycampus-e1a6d.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '57434937213',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:57434937213:web:53cf97e4ffcbb763e00788'
};

import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
} else {
  app = getApp();
  db = getFirestore(app);
}

const auth = getAuth(app);

export { app, auth, db };
