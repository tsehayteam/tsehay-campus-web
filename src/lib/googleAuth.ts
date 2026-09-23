import { supabase } from '@/lib/supabase/client';

/**
 * Tsehay Campus - Google OAuth Helper
 * Supports both:
 * 1. Supabase-managed Google OAuth (Default, credentials managed in Supabase dashboard)
 * 2. Custom direct domain OAuth (/api/auth/google) when explicitly enabled via NEXT_PUBLIC_USE_CUSTOM_GOOGLE_AUTH
 */
export async function initiateGoogleLogin(returnUrl?: string): Promise<{ success: boolean; error?: any }> {
  if (typeof window === 'undefined') return { success: false };

  const targetReturnUrl = returnUrl || 
    sessionStorage.getItem('tsehay_auth_return_url') || 
    (window.location.pathname + window.location.search) || 
    '/dashboard';

  try {
    sessionStorage.setItem('tsehay_auth_return_url', targetReturnUrl);
    sessionStorage.setItem('tsehay_preloader_shown', 'true');
    sessionStorage.setItem('tsehay_preloader_seen', 'true');
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('tsehay-loading');
    }
  } catch (e) {
    console.warn('Session storage write warning in initiateGoogleLogin:', e);
  }

  // Check if custom direct domain Google OAuth flow is explicitly enabled
  const customClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const useCustomOAuth = Boolean(customClientId && process.env.NEXT_PUBLIC_USE_CUSTOM_GOOGLE_AUTH === 'true');

  if (useCustomOAuth) {
    const destination = `/api/auth/google?returnUrl=${encodeURIComponent(targetReturnUrl)}`;
    window.location.href = destination;
    return { success: true };
  }

  // Primary & standard flow: Delegate directly to Supabase Auth
  // Supabase manages the Google Client ID & Secret securely in the Supabase Dashboard.
  try {
    const appOrigin = window.location.origin;
    const redirectTo = `${appOrigin}/auth/callback?returnUrl=${encodeURIComponent(targetReturnUrl)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('[Google OAuth] Supabase signInWithOAuth returned error:', error);
      // Fallback: If customClientId is available, attempt the server endpoint
      if (customClientId) {
        const destination = `/api/auth/google?returnUrl=${encodeURIComponent(targetReturnUrl)}`;
        window.location.href = destination;
        return { success: true };
      }
      throw error;
    }

    // In case automatic browser redirection did not trigger (or skipBrowserRedirect is enabled)
    if (data?.url) {
      window.location.href = data.url;
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Google OAuth] Failed to initiate Google OAuth via Supabase:', err);
    throw err;
  }
}

/**
 * Extracts OAuth tokens from URL hash (e.g. #access_token=...&refresh_token=...)
 */
export function parseHashTokens(hash: string): {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  error?: string;
  errorDescription?: string;
} {
  if (!hash) return {};
  const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
  const params = new URLSearchParams(cleanHash);

  return {
    accessToken: params.get('access_token') || undefined,
    refreshToken: params.get('refresh_token') || undefined,
    tokenType: params.get('token_type') || undefined,
    error: params.get('error') || undefined,
    errorDescription: params.get('error_description') || undefined,
  };
}
