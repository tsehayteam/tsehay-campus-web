'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const ADMIN_EMAILS = [
  'admin@tsehaycampus.com',
  'tsehayoperation@gmail.com',
  'eyoubsahle@gmail.com',
  'habte@gmail.com',
  'cryptomaster758@gmail.com'
];

export const isEmailAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAdmin: boolean;
  verifyAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  authInitialized: false, 
  isAdmin: false,
  verifyAdminStatus: async () => false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [cachedUserObj] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedUser = localStorage.getItem('tsehay_auth_user_cache');
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(cachedUserObj);

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (localStorage.getItem('adminAuth') === 'true' || localStorage.getItem('tsehay_auth_is_admin') === 'true') {
        return true;
      }
      const cachedUser = localStorage.getItem('tsehay_auth_user_cache');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (isEmailAdmin(parsed?.email)) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  // If user is cached locally, start immediately with loading: false for zero perceived delay
  const [loading, setLoading] = useState<boolean>(!cachedUserObj);
  const [authInitialized, setAuthInitialized] = useState<boolean>(!!cachedUserObj);

  const verifyAdminStatus = async (): Promise<boolean> => {
    const currentUser = auth.currentUser || user;
    if (!currentUser) {
      if (typeof window !== 'undefined' && localStorage.getItem('adminAuth') === 'true') {
        return true;
      }
      return false;
    }

    if (isEmailAdmin(currentUser.email)) {
      setIsAdmin(true);
      return true;
    }

    try {
      const idTokenResult = await currentUser.getIdTokenResult(true);
      if (idTokenResult.claims.admin === true || idTokenResult.claims.role === 'admin') {
        setIsAdmin(true);
        return true;
      }
    } catch (e) {}

    try {
      const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', currentUser.uid, 'profile', 'info'));
      if (userDoc.exists() && (userDoc.data().isAdmin === true || userDoc.data().role === 'admin')) {
        setIsAdmin(true);
        return true;
      }
    } catch (err) {}

    return isAdmin;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const serialized = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(serialized));
        } catch (e) {}

        let userIsAdmin = isEmailAdmin(firebaseUser.email);

        if (!userIsAdmin) {
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            if (tokenResult.claims.admin === true || tokenResult.claims.role === 'admin') {
              userIsAdmin = true;
            }
          } catch (e) {}
        }

        if (!userIsAdmin) {
          try {
            const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', firebaseUser.uid, 'profile', 'info'));
            if (userDoc.exists() && (userDoc.data().isAdmin === true || userDoc.data().role === 'admin')) {
              userIsAdmin = true;
            }
          } catch (err) {
            console.warn("Error fetching admin status:", err);
          }
        }

        if (typeof window !== 'undefined' && localStorage.getItem('adminAuth') === 'true') {
          userIsAdmin = true;
        }

        setIsAdmin(userIsAdmin);
        try {
          localStorage.setItem('tsehay_auth_is_admin', userIsAdmin ? 'true' : 'false');
        } catch (e) {}
      } else {
        const localAdmin = typeof window !== 'undefined' && localStorage.getItem('adminAuth') === 'true';
        setIsAdmin(localAdmin);
        try {
          localStorage.removeItem('tsehay_auth_user_cache');
          if (!localAdmin) {
            localStorage.removeItem('tsehay_auth_is_admin');
          }
        } catch (e) {}
      }
      setLoading(false);
      setAuthInitialized(true);
    });

    const handleAuthCustomEvent = (e: any) => {
      if (e?.detail) {
        setUser(e.detail);
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    window.addEventListener('tsehay_auth_state_changed', handleAuthCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('tsehay_auth_state_changed', handleAuthCustomEvent);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authInitialized, isAdmin, verifyAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
