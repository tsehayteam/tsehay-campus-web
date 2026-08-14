'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: false, isAdmin: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedUser = localStorage.getItem('tsehay_auth_user_cache');
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('tsehay_auth_is_admin') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem('tsehay_auth_user_cache');
  });

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

        try {
          const userDoc = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', firebaseUser.uid, 'profile', 'info'));
          const adminStatus = userDoc.exists() && userDoc.data().isAdmin === true;
          setIsAdmin(adminStatus);
          localStorage.setItem('tsehay_auth_is_admin', adminStatus ? 'true' : 'false');
        } catch (err) {
          console.warn("Error fetching admin status:", err);
        }
      } else {
        setIsAdmin(false);
        try {
          localStorage.removeItem('tsehay_auth_user_cache');
          localStorage.removeItem('tsehay_auth_is_admin');
        } catch (e) {}
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading, isAdmin }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
