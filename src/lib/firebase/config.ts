import type { User } from './compat/auth';

export interface AuthState {
  currentUser: User | null;
  [key: string]: any;
}

// Lightweight zero-dependency bridge replacing Firebase SDK with native Supabase
export const app: any = {};
export const auth: AuthState = { currentUser: null };
export const db: any = {};
export const storage: any = {};

