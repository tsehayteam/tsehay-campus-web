// Zero-dependency Supabase bridge for legacy Firebase Auth

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  getIdToken: () => Promise<string>;
  [key: string]: any;
}

const mockUser: User = {
  uid: 'user_mock',
  email: 'user@example.com',
  displayName: 'Student',
  photoURL: '',
  phoneNumber: '',
  emailVerified: true,
  getIdToken: async () => ''
};

export const getAuth = (_app?: any): any => ({ currentUser: null });

export const onAuthStateChanged = (
  _auth: any, 
  cb: (user: User | null) => void
): any => {
  if (typeof cb === 'function') cb(null);
  return () => {};
};

export const signInWithEmailAndPassword = async (..._args: any[]): Promise<{ user: User }> => ({ user: mockUser });
export const createUserWithEmailAndPassword = async (..._args: any[]): Promise<{ user: User }> => ({ user: mockUser });
export const signOut = async (..._args: any[]): Promise<any> => {};
export const updateProfile = async (..._args: any[]): Promise<any> => {};
export const signInWithCustomToken = async (..._args: any[]): Promise<{ user: User }> => ({ user: mockUser });
export const sendPasswordResetEmail = async (..._args: any[]): Promise<any> => {};
export const confirmPasswordReset = async (..._args: any[]): Promise<any> => {};
export const verifyPasswordResetCode = async (..._args: any[]): Promise<string> => '';
export const applyActionCode = async (..._args: any[]): Promise<any> => {};

export type Auth = any;
