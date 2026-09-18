'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect directly to dashboard
  useEffect(() => {
    if (user) {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.replace(returnUrl);
    }
  }, [user, router, searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('እባክዎ የ Gmail አድራሻዎን ያስገቡ።');
      return;
    }
    if (!password) {
      setError('እባክዎ የይለፍ ቃልዎን ያስገቡ።');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr) {
        // Fallback: Check sync-login API
        const syncRes = await fetch('/api/auth/sync-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const syncData = await syncRes.json().catch(() => ({}));
        if (!syncData?.success) {
          throw new Error('ያስገቡት የኢሜይል ወይም የይለፍ ቃል ልክ አይደለም። እባክዎ እንደገና ይሞክሩ።');
        }
      }

      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.replace(returnUrl);
    } catch (err: any) {
      setError(err?.message || 'የመግቢያ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tsehay_auth_return_url', returnUrl);
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
        document.documentElement.classList.remove('tsehay-loading');
      }

      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (oAuthErr) throw oAuthErr;
    } catch (err: any) {
      setError(err?.message || 'በ Google መግባት አልተቻለም።');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 py-16 relative overflow-hidden bg-[#03060d]">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#f9b03c]/15 via-[#3268ba]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 rounded-3xl bg-[#090d16]/95 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="group mb-4">
            <div className="w-16 h-16 rounded-2xl p-[2px] bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_30px_rgba(249,176,60,0.35)] group-hover:scale-105 transition-transform">
              <Image
                src="/tc-logo.jpg"
                alt="Tsehay Campus Logo"
                width={64}
                height={64}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          </Link>

          <h1 className="text-2xl font-black font-heading tracking-tight text-white">
            ይግቡ <span className="text-[#f9b03c]">(Sign In)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            የፀሐይ ካምፓስ መለያዎን በመጠቀም ትምህርትዎን ይቀጥሉ
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-start gap-2.5">
            <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#f9b03c]/50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>በ Google በቀጥታ ይግቡ</span>
        </button>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-white/10" />
          <span className="absolute px-3 bg-[#090d16] text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            ወይም በኢሜይል
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              የ Gmail አድራሻ
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-[#f9b03c] text-white text-xs sm:text-sm placeholder-slate-500 outline-none transition-all"
              />
              <i className="fa-solid fa-envelope absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                የይለፍ ቃል
              </label>
              <Link
                href="/reset-password"
                className="text-[11px] font-bold text-[#f9b03c] hover:underline"
              >
                የይለፍ ቃል ረሱ?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-[#f9b03c] text-white text-xs sm:text-sm placeholder-slate-500 outline-none transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                title={showPassword ? 'ደብቅ' : 'አሳይ'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-[0_10px_25px_rgba(249,176,60,0.35)] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" />
                <span>በመግባት ላይ...</span>
              </>
            ) : (
              <>
                <span>ግባ (Sign In)</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          አዲስ ተጠቃሚ ነዎት?{' '}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-auth-modal', {
                  detail: { isSignupMode: true, isSignUp: true },
                }));
              }
            }}
            className="font-bold text-[#f9b03c] hover:underline cursor-pointer"
          >
            አሁኑኑ ይመዝገቡ (Sign Up)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#03060d] flex items-center justify-center text-white">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#f9b03c]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
