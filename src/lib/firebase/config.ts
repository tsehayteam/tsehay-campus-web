import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const getAuthDomain = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('tsehaycampus.com')) {
      return 'tsehaycampus.com';
    }
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }
  return 'tsehaycampus.com';
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tsehaycampus-e1a6d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
