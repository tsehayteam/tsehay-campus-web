'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = '32429014343-0h5tgvp49kk2hclrmqrf0j0jc3plkh0s.apps.googleusercontent.com';

interface GoogleAuthButtonProps {
  isSignup?: boolean;
  onSuccess?: () => void;
  onError?: (err: string) => void;
  className?: string;
}

// Generate cryptographically secure nonce for Google & Supabase
async function generateNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  try {
    const rawNonce = crypto.randomUUID();
    const encoder = new TextEncoder();
    const data = encoder.encode(rawNonce);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedNonce = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { rawNonce, hashedNonce };
  } catch (e) {
    // Fallback if crypto.subtle is restricted
    const rawNonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    return { rawNonce, hashedNonce: rawNonce };
  }
}

export default function GoogleAuthButton({
  isSignup = false,
  onSuccess,
  onError,
  className = '',
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentNonceRef = useRef<string>('');

  // Fallback handler: Standard OAuth Redirect
  const handleFallbackOAuth = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('tsehay_preloader_shown', 'true');
          sessionStorage.setItem('tsehay_preloader_seen', 'true');
          document.documentElement.classList.remove('tsehay-loading');

          const currentOrigin = window.location.pathname + window.location.search + window.location.hash;
          if (currentOrigin && !currentOrigin.startsWith('/auth')) {
            sessionStorage.setItem('tsehay_auth_return_url', currentOrigin);
          }
        } catch (e) {}
      }

      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (oAuthErr) throw oAuthErr;
    } catch (err: any) {
      console.error('Google Auth Fallback Error:', err);
      setIsLoading(false);
      onError?.(err?.message || 'በ Google መግባት አልተቻለም።');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initGsi = async () => {
      if (typeof window === 'undefined') return;

      const { rawNonce, hashedNonce } = await generateNonce();
      currentNonceRef.current = rawNonce;

      const setupGoogle = () => {
        if (!window.google?.accounts?.id || !containerRef.current) return;

        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            nonce: hashedNonce,
            auto_select: false,
            cancel_on_tap_outside: true,
            callback: async (response: any) => {
              if (!response?.credential) return;
              setIsLoading(true);

              try {
                if (typeof window !== 'undefined') {
                  try {
                    sessionStorage.setItem('tsehay_preloader_shown', 'true');
                    sessionStorage.setItem('tsehay_preloader_seen', 'true');
                    document.documentElement.classList.remove('tsehay-loading');

                    const currentOrigin = window.location.pathname + window.location.search + window.location.hash;
                    if (currentOrigin && !currentOrigin.startsWith('/auth')) {
                      sessionStorage.setItem('tsehay_auth_return_url', currentOrigin);
                    }
                  } catch (e) {}
                }

                // Verify credential directly with Supabase via ID token
                const { data, error } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential,
                  nonce: currentNonceRef.current,
                });

                if (error) throw error;

                if (onSuccess) {
                  onSuccess();
                } else {
                  window.location.replace('/auth/callback');
                }
              } catch (err: any) {
                console.error('Google ID Token Sign-In Error:', err);
                setIsLoading(false);
                onError?.(err?.message || 'በ Google መግባት አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
              }
            },
          });

          // Render official Google Sign In button directly inside container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
            const width = Math.min(380, Math.max(260, containerRef.current.parentElement?.clientWidth || 320));
            window.google.accounts.id.renderButton(containerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: isSignup ? 'signup_with' : 'signin_with',
              shape: 'pill',
              width: width,
              logo_alignment: 'left',
            });
            setIsGsiLoaded(true);
          }

          // Optional One-Tap prompt
          try {
            window.google.accounts.id.prompt((notification: any) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // One tap was skipped or closed, normal button is available
              }
            });
          } catch (e) {}
        } catch (initErr) {
          console.warn('Google GSI initialization warning:', initErr);
        }
      };

      // Check if script is already present
      if (window.google?.accounts?.id) {
        setupGoogle();
      } else {
        const existingScript = document.getElementById('google-gsi-client');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'google-gsi-client';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) setupGoogle();
          };
          document.head.appendChild(script);
        } else {
          existingScript.addEventListener('load', () => {
            if (isMounted) setupGoogle();
          });
        }
      }
    };

    initGsi();

    return () => {
      isMounted = false;
    };
  }, [isSignup, onSuccess, onError]);

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {/* Official Native Google Button Container (Direct to tsehaycampus.com) */}
      <div 
        ref={containerRef} 
        className={`w-full flex justify-center min-h-[44px] transition-opacity ${isGsiLoaded ? 'opacity-100' : 'hidden'}`}
      />

      {/* Fallback Custom Button (Displayed while GSI is loading or if script is blocked) */}
      {!isGsiLoaded && (
        <button
          type="button"
          onClick={handleFallbackOAuth}
          disabled={isLoading}
          className="w-full bg-white dark:bg-[#0d1222] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition shadow-sm flex items-center justify-center gap-3 group cursor-pointer hover:border-primary/50 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin text-primary"></i>
              <span>እባክዎ ይጠብቁ...</span>
            </>
          ) : (
            <>
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5 group-hover:scale-110 transition-transform"
              />
              <span>{isSignup ? 'በ Google (Gmail) በፍጥነት ይመዝገቡ' : 'በ Google (Gmail) ይግቡ'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
