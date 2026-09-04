// Lightweight zero-dependency bridge replacing Firebase Admin SDK with native Supabase
import {
  adminDb as compatAdminDb,
  adminAuth as compatAdminAuth,
  getAdminDb as compatGetAdminDb,
  getAdminAuth as compatGetAdminAuth,
  hasAdminCredentials as compatHasAdminCredentials,
  FieldValue as compatFieldValue,
  Timestamp as compatTimestamp,
  type AdminQuery
} from './compat/admin';

export const adminDb: AdminQuery = compatAdminDb;
export const adminAuth = compatAdminAuth;
export const getAdminDb = compatGetAdminDb;
export const getAdminAuth = compatGetAdminAuth;
export const hasAdminCredentials = compatHasAdminCredentials;
export const FieldValue = compatFieldValue;
export const Timestamp = compatTimestamp;

const defaultAdmin = {
  initializeApp: () => ({}),
  credential: { cert: () => ({}) },
  firestore: () => adminDb,
  auth: () => adminAuth,
  apps: []
};

export default defaultAdmin;
