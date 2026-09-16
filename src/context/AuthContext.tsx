'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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
    localStorage.removeItem('tsehay_user_enrolled_courses');
    localStorage.removeItem('tsehay_user_role');
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    sessionStorage.removeItem('tsehay_pending_course_action');
    sessionStorage.removeItem('tsehay_pending_action');
    sessionStorage.removeItem('tsehay_admin_verified');
    sessionStorage.removeItem('tsehay_admin_2fa_token');
    sessionStorage.removeItem('tc_admin_session');
    sessionStorage.clear();

    if (previousUid) {
      localStorage.removeItem(`tsehay_user_courses_${previousUid}`);
      localStorage.removeItem(`tsehay_user_active_course_${previousUid}`);
    }
  } catch (e) {}
};

export interface User {
  uid: string;
  id: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phone?: string | null;
  user_metadata?: any;
  app_metadata?: any;
  getIdToken?: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult?: (forceRefresh?: boolean) => Promise<{ claims: Record<string, any> }>;
}

export function formatSupabaseUser(sbUser: any): User | null {
  if (!sbUser) return null;
  const uid = sbUser.id || sbUser.uid || '';
  const email = sbUser.email || '';
  const meta = sbUser.user_metadata || {};
  const displayName = meta.full_name || meta.name || meta.displayName || sbUser.displayName || email.split('@')[0] || 'ተማሪ';
  const photoURL = meta.avatar_url || meta.picture || meta.photoURL || sbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f9b03c&color=111827&bold=true`;

  return {
    uid,
    id: uid,
    email,
    displayName,
    photoURL,
    user_metadata: meta,
    app_metadata: sbUser.app_metadata || {},
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    },
    getIdTokenResult: async () => {
      const isAdmin = isEmailAdmin(email);
      return {
        claims: {
          admin: isAdmin,
          role: isAdmin ? 'admin' : 'student'
        }
      };
    }
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAdmin: boolean;
  verifyAdminStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
  loginWithGoogle?: () => Promise<any>;
  loginWithEmail?: (email: string, pass: string) => Promise<any>;
  signupWithEmail?: (email: string, pass: string, name?: string) => Promise<any>;
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
      return cachedUser ? formatSupabaseUser(JSON.parse(cachedUser)) : null;
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
        return false;
      }
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
    const currentUser = user;
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        const isVerified = sessionStorage.getItem('tsehay_admin_verified') === 'true' || !!sessionStorage.getItem('tsehay_admin_2fa_token');
        setIsAdmin(isVerified);
        return isVerified;
      }
      setIsAdmin(false);
      return false;
    }

    if (isEmailAdmin(currentUser.email)) {
      setIsAdmin(true);
      return true;
    }

    setIsAdmin(false);
    return false;
  };

  const logout = async () => {
    try {
      clearUserSessionData(user?.uid);
      setIsAdmin(false);
      setUser(null);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const formatted = formatSupabaseUser(session.user);
        setUser(formatted);
        const userIsAdmin = isEmailAdmin(formatted?.email);
        setIsAdmin(userIsAdmin);
        try {
          localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(formatted));
          localStorage.setItem('tsehay_auth_is_admin', userIsAdmin ? 'true' : 'false');
        } catch (e) {}
      } else {
        const sessionAdmin = typeof window !== 'undefined' && (
          sessionStorage.getItem('tsehay_admin_verified') === 'true' ||
          !!sessionStorage.getItem('tsehay_admin_2fa_token')
        );
        setIsAdmin(sessionAdmin);
      }
      setLoading(false);
      setAuthInitialized(true);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const formatted = formatSupabaseUser(session.user);
        setUser(formatted);
        const userIsAdmin = isEmailAdmin(formatted?.email);
        setIsAdmin(userIsAdmin);
        try {
          localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(formatted));
          localStorage.setItem('tsehay_auth_is_admin', userIsAdmin ? 'true' : 'false');
        } catch (e) {}
      } else {
        const sessionAdmin = typeof window !== 'undefined' && (
          sessionStorage.getItem('tsehay_admin_verified') === 'true' ||
          !!sessionStorage.getItem('tsehay_admin_2fa_token')
        );
        setUser(null);
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
        const formatted = formatSupabaseUser(e.detail);
        setUser(formatted);
        setLoading(false);
        setAuthInitialized(true);
      }
    };
    window.addEventListener('tsehay_auth_state_changed', handleAuthCustomEvent);

    return () => {
      subscription.unsubscribe();
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

