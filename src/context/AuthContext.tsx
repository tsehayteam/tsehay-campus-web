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
    sessionStorage.removeItem('tsehay_pending_course_action');
    sessionStorage.removeItem('tsehay_pending_action');

    if (previousUid) {
      localStorage.removeItem(`tsehay_user_courses_${previousUid}`);
      localStorage.removeItem(`tsehay_user_active_course_${previousUid}`);
    }
  } catch (e) {}
};

export interface AppUser {
  uid: string;
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  phone?: string | null;
  user_metadata?: any;
  getIdTokenResult: () => Promise<{ claims: { admin?: boolean; role?: string } }>;
  getIdToken: () => Promise<string>;
  [key: string]: any;
}

interface AuthContextType {
  user: AppUser | null;
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

function formatSupabaseUser(sbUser: any): AppUser | null {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  const displayName = meta.full_name || meta.name || meta.displayName || sbUser.email?.split('@')[0] || 'ተጠቃሚ';
  const photoURL = meta.avatar_url || meta.picture || meta.photoURL || null;

  return {
    uid: sbUser.id,
    id: sbUser.id,
    email: sbUser.email || '',
    displayName,
    photoURL,
    phone: sbUser.phone || meta.phone || null,
    user_metadata: meta,
    getIdTokenResult: async () => {
      const isAdm = isEmailAdmin(sbUser.email) || meta.is_admin === true || meta.role === 'admin';
      return { claims: { admin: isAdm, role: isAdm ? 'admin' : 'student' } };
    },
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || '';
    }
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [cachedUserObj] = useState<AppUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedUser = localStorage.getItem('tsehay_auth_user_cache');
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState<AppUser | null>(cachedUserObj);

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

    // Direct email check
    if (isEmailAdmin(currentUser.email)) {
      setIsAdmin(true);
      return true;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', currentUser.uid)
        .maybeSingle();

      if (profile && (profile.is_admin === true || profile.role === 'admin')) {
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
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  useEffect(() => {
    // 1. Check initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const appUser = formatSupabaseUser(session.user);
        setUser(appUser);
        if (appUser) {
          try {
            localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(appUser));
          } catch (e) {}
          const userIsAdmin = isEmailAdmin(appUser.email);
          setIsAdmin(userIsAdmin);
        }
      } else if (!cachedUserObj) {
        setUser(null);
      }
      setLoading(false);
      setAuthInitialized(true);
    }).catch(() => {
      setLoading(false);
      setAuthInitialized(true);
    });

    // 2. Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const appUser = formatSupabaseUser(session.user);
        setUser(appUser);

        if (appUser) {
          try {
            localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(appUser));
          } catch (e) {}

          const userIsAdmin = isEmailAdmin(appUser.email);
          setIsAdmin(userIsAdmin);
          try {
            localStorage.setItem('tsehay_auth_is_admin', userIsAdmin ? 'true' : 'false');
          } catch (e) {}

          // Ensure profile row in Supabase profiles table
          try {
            await supabase.from('profiles').upsert({
              id: appUser.uid,
              email: appUser.email,
              full_name: appUser.displayName,
              phone: appUser.phone || null,
              avatar_url: appUser.photoURL || null,
              is_admin: userIsAdmin,
              role: userIsAdmin ? 'admin' : 'student',
              updated_at: new Date().toISOString()
            });
          } catch (profileErr) {}
        }
      } else {
        const sessionAdmin = typeof window !== 'undefined' && (
          sessionStorage.getItem('tsehay_admin_verified') === 'true' ||
          !!sessionStorage.getItem('tsehay_admin_2fa_token')
        );
        setIsAdmin(sessionAdmin);
        setUser(null);
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
