'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const ADMIN_EMAILS = [
  'eyobsahle@gmail.com'
];

export const isEmailAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

export const clearUserSessionData = (previousUid?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('tsehay_auth_user_cache');
    localStorage.removeItem('tsehay_auth_is_admin');
    localStorage.removeItem('tsehay_user_courses_cache');
    localStorage.removeItem('tsehay_user_active_course');
    localStorage.removeItem('tsehay_user_active_modules');
    localStorage.removeItem('tsehay_user_active_lesson');
    localStorage.removeItem('tsehay_user_purchased_courses');
    sessionStorage.removeItem('tsehay_pending_course_action');
    sessionStorage.removeItem('tsehay_pending_action');

    if (previousUid) {
      localStorage.removeItem(`tsehay_user_courses_${previousUid}`);
      localStorage.removeItem(`tsehay_user_active_course_${previousUid}`);
    }
  } catch (e) {}
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAdmin: boolean;
  verifyAdminStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  authInitialized: false, 
  isAdmin: false,
  verifyAdminStatus: async () => false,
  logout: async () => {}
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
      const cachedUser = localStorage.getItem('tsehay_auth_user_cache');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (isEmailAdmin(parsed?.email)) return true;
        // Non-admin email is strictly NOT an admin
        return false;
      }
      // If no user is logged in, check session-scoped admin token
      if (sessionStorage.getItem('tsehay_admin_verified') === 'true' || sessionStorage.getItem('tsehay_admin_2fa_token')) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  const [loading, setLoading] = useState<boolean>(!cachedUserObj);
  const [authInitialized, setAuthInitialized] = useState<boolean>(!!cachedUserObj);

  const verifyAdminStatus = async (): Promise<boolean> => {
    const currentUser = auth.currentUser || user;
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        const isVerified = sessionStorage.getItem('tsehay_admin_verified') === 'true' || !!sessionStorage.getItem('tsehay_admin_2fa_token');
        setIsAdmin(isVerified);
        return isVerified;
      }
      setIsAdmin(false);
      return false;
    }

    // Direct email check
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

    setIsAdmin(false);
    return false;
  };

  const logout = async () => {
    try {
      clearUserSessionData(user?.uid);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tsehay_admin_verified');
        sessionStorage.removeItem('tsehay_admin_2fa_token');
        sessionStorage.removeItem('tc_admin_session');
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminEmail');
      }
      setIsAdmin(false);
      setUser(null);
      await signOut(auth);
    } catch (err) {
      console.warn("Logout error:", err);
    }
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

        // Safely ensure user profile doc exists without throwing
        try {
          setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || null,
            lastLogin: serverTimestamp()
          }, { merge: true }).catch(() => {});

          setDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', firebaseUser.uid, 'profile', 'info'), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || null,
            lastLogin: serverTimestamp()
          }, { merge: true }).catch(() => {});
        } catch (syncErr) {}

        // Determine Admin Role strictly
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
          } catch (err) {}
        }

        setIsAdmin(userIsAdmin);
        try {
          localStorage.setItem('tsehay_auth_is_admin', userIsAdmin ? 'true' : 'false');
        } catch (e) {}
      } else {
        // No user signed in
        const sessionAdmin = typeof window !== 'undefined' && (
          sessionStorage.getItem('tsehay_admin_verified') === 'true' ||
          !!sessionStorage.getItem('tsehay_admin_2fa_token')
        );
        setIsAdmin(sessionAdmin);
        try {
          localStorage.removeItem('tsehay_auth_user_cache');
          if (!sessionAdmin) {
            localStorage.removeItem('tsehay_auth_is_admin');
            localStorage.removeItem('adminAuth');
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
    <AuthContext.Provider value={{ user, loading, authInitialized, isAdmin, verifyAdminStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
