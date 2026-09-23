/**
 * Tsehay Campus - Direct Google OAuth Helper
 * Initiates Google OAuth directly through Tsehay Campus domain
 * to present "to continue to tsehaycampus.com" on Google's consent screen.
 */

export function initiateGoogleLogin(returnUrl?: string): void {
  if (typeof window === 'undefined') return;

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

  const destination = `/api/auth/google?returnUrl=${encodeURIComponent(targetReturnUrl)}`;
  window.location.href = destination;
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
