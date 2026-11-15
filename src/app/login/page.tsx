'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useAuth, formatSupabaseUser } from '@/context/AuthContext';
import { initiateGoogleLogin } from '@/lib/googleAuth';
import { normalizeEthiopianMobileInput, isValidNineDigitEthPhone, formatPhoneForLakiPay } from '@/lib/phoneAuthHelper';

export function AuthPageContent({ defaultSignup = false }: { defaultSignup?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const resolveInitialMode = () => {
    if (defaultSignup || pathname?.startsWith('/register') || pathname?.startsWith('/signup')) {
      return true;
    }
    const mode = searchParams.get('mode')?.toLowerCase();
    if (mode === 'signup' || mode === 'register' || searchParams.get('register') === '1') {
      return true;
    }
    if (mode === 'login' || mode === 'signin') {
      return false;
    }
    // If redirected from a course/lesson/checkout wall with returnUrl or courseId, default to Sign-Up
    if (searchParams.get('returnUrl') || searchParams.get('courseId') || searchParams.get('course')) {
      return true;
    }
    return false;
  };

  const [isSignupMode, setIsSignupMode] = useState<boolean>(resolveInitialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('አዲስ አበባ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => searchParams.get('error') || null);

  const getTargetReturnUrl = (): string => {
    const paramReturn = searchParams.get('returnUrl') || searchParams.get('redirect') || searchParams.get('next');
    if (paramReturn && paramReturn.startsWith('/')) {
      return paramReturn;
    }
    const paramCourse = searchParams.get('courseId') || searchParams.get('course');
    if (paramCourse) {
      return `/courses/${encodeURIComponent(paramCourse)}?checkout=1`;
    }
    if (typeof window !== 'undefined') {
      try {
        const storedReturn = sessionStorage.getItem('tsehay_auth_return_url');
        if (storedReturn && storedReturn.startsWith('/') && !storedReturn.startsWith('/login') && !storedReturn.startsWith('/register')) {
          return storedReturn;
        }
        const pendingRaw = sessionStorage.getItem('tsehay_pending_course_action') || sessionStorage.getItem('tsehay_pending_action');
        if (pendingRaw) {
          const parsed = JSON.parse(pendingRaw);
          const cid = parsed?.course?.slug || parsed?.course?.id || parsed?.courseId;
          if (cid) {
            return `/courses/${encodeURIComponent(cid)}?checkout=1`;
          }
        }
      } catch (_) {}
    }
    return '/dashboard';
  };

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam);
    }
    const returnParam = searchParams.get('returnUrl') || searchParams.get('redirect');
    if (returnParam && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('tsehay_auth_return_url', returnParam);
      } catch (_) {}
    }
  }, [searchParams]);

  // If already logged in, redirect directly to returnUrl or dashboard
  useEffect(() => {
    if (user) {
      const dest = getTargetReturnUrl();
      router.replace(dest);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const dest = getTargetReturnUrl();
          router.replace(dest);
        }
      });
    }
  }, [user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (isSignupMode) {
      if (!name.trim()) {
        setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
        return;
      }
      const cleanPhone = normalizeEthiopianMobileInput(phone);
      if (!isValidNineDigitEthPhone(cleanPhone)) {
        setError('እባክዎ በ 9 የሚጀምር 9-አሃዝ የስልክ ቁጥር ያስገቡ (ለምሳሌ፡ 912 345 678)።');
        return;
      }
      if (password.length < 8) {
        setError('የይለፍ ቃል ቢያንስ 8 ፊደላትና ቁጥሮች መሆን አለበት (Min. 8 characters)።');
        return;
      }

      setLoading(true);
      try {
        const formattedPhone = formatPhoneForLakiPay(cleanPhone);
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
              phone: cleanPhone,
              phone_e164: `+${formattedPhone}`,
              city: city.trim() || 'አዲስ አበባ',
              source: 'Direct',
            },
          },
        });

        if (signUpErr) {
          const msg = signUpErr.message || '';
          if (msg.toLowerCase().includes('already registered')) {
            // Attempt direct sign-in if already registered
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (signInErr) {
              setIsSignupMode(false);
              throw new Error('ይህ ኢሜይል አስቀድሞ ተመዝግቧል! እባክዎ የይለፍ ቃልዎን አስገብተው ይግቡ።');
            }
          } else {
            throw signUpErr;
          }
        }

        // Persist user profile & phone for LakiPay
        try {
          localStorage.setItem('tsehay_user_phone', cleanPhone);
          localStorage.setItem('tsehay_user_registered', 'true');
          document.cookie = 'tc_session=1; path=/; SameSite=Lax; max-age=604800';
          if (signUpData?.user) {
            const formattedUser = formatSupabaseUser(signUpData.user);
            localStorage.setItem('tsehay_auth_user_cache', JSON.stringify({
              ...formattedUser,
              displayName: name.trim() || formattedUser.displayName,
              phone: cleanPhone,
            }));
            window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: formattedUser }));
          }
        } catch (_) {}

        // Ensure active session
        await supabase.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => {});

        const dest = getTargetReturnUrl();
        try {
          sessionStorage.removeItem('tsehay_auth_return_url');
        } catch (_) {}
        router.replace(dest);
        return;
      } catch (err: any) {
        setError(err?.message || 'ምዝገባውን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign In Flow
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr) {
        const syncRes = await fetch('/api/auth/sync-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const syncData = await syncRes.json().catch(() => ({}));
        if (!syncData?.success) {
          throw new Error('ያስገቡት የኢሜይል ወይም የይለፍ ቃል ልክ አይደለም። አዲስ ተማሪ ከሆኑ ከስር "አሁኑኑ ይመዝገቡ" የሚለውን ይጫኑ።');
        }
      }

      const dest = getTargetReturnUrl();
      try {
        sessionStorage.removeItem('tsehay_auth_return_url');
      } catch (_) {}
      router.replace(dest);
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
      const returnUrl = getTargetReturnUrl();
      await initiateGoogleLogin(returnUrl);
    } catch (err: any) {
      setError(err?.message || 'በ Google መግባት አልተቻለም።');
      setLoading(false);
    }
  };

  const cleanPhone = normalizeEthiopianMobileInput(phone);
  const isPhoneValid = isValidNineDigitEthPhone(cleanPhone);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 py-12 relative overflow-hidden bg-slate-50 dark:bg-[#03060d]">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#f9b03c]/15 via-[#3268ba]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10 rounded-3xl bg-white dark:bg-[#090d16]/95 border border-slate-200 dark:border-white/10 shadow-[0_25px_80px_rgba(15,23,42,0.12)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Link href="/" className="group mb-3">
            <div className="w-15 h-15 rounded-2xl p-[2px] bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_30px_rgba(249,176,60,0.35)] group-hover:scale-105 transition-transform">
              <Image
                src="/tc-logo.jpg"
                alt="Tsehay Campus Logo"
                width={60}
                height={60}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          </Link>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full mb-4">
            <button
              type="button"
              onClick={() => { setIsSignupMode(true); setError(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isSignupMode
                  ? 'bg-[#f9b03c] text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              አዲስ ምዝገባ (Sign Up)
            </button>
            <button
              type="button"
              onClick={() => { setIsSignupMode(false); setError(null); }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                !isSignupMode
                  ? 'bg-[#f9b03c] text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ይግቡ (Sign In)
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-slate-900 dark:text-white">
            {isSignupMode ? (
              <>በ45 ሰከንድ ይመዝገቡ <span className="text-[#f9b03c]">(Sign Up)</span></>
            ) : (
              <>ወደ ካምፓስ ይግቡ <span className="text-[#f9b03c]">(Sign In)</span></>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isSignupMode
              ? 'አካውንትዎን ከፍተው ወዲያውኑ ወደ መረጡት ኮርስ ይቀጥሉ'
              : 'የፀሐይ ካምፓስ መለያዎን በመጠቀም ትምህርትዎን ይቀጥሉ'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-bold flex items-start gap-2.5">
            <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-500 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/15 hover:border-[#f9b03c]/60 text-slate-900 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{isSignupMode ? 'በ Google (Gmail) በፍጥነት ይመዝገቡ' : 'በ Google በቀጥታ ይግቡ'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10" />
          <span className="absolute px-3 bg-white dark:bg-[#090d16] text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            {isSignupMode ? 'ወይም በኢሜይልና ስልክ ይመዝገቡ' : 'ወይም በኢሜይል ይግቡ'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignupMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ሙሉ ስም (Full Name) <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ"
                  required
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#f9b03c] text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ስልክ ቁጥር (LakiPay / Mobile) <span className="text-amber-500">*</span>
                  </label>
                  {cleanPhone.length > 0 && (
                    <span className={`text-[11px] font-mono font-bold ${isPhoneValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isPhoneValid ? '✓ 9 አሃዝ' : `${cleanPhone.length}/9 አሃዝ`}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none shrink-0 z-10">
                    <span className="px-2.5 py-1 rounded-lg bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-amber-600 dark:text-[#f9b03c] font-mono text-xs font-black tracking-tight">
                      +251
                    </span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={cleanPhone}
                    onChange={(e) => setPhone(normalizeEthiopianMobileInput(e.target.value))}
                    placeholder="912 345 678"
                    required
                    className="w-full pl-[4.5rem] pr-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#f9b03c] text-slate-900 dark:text-white font-mono font-bold tracking-wider text-xs sm:text-sm placeholder:font-mono placeholder:font-normal placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              የ Gmail አድራሻ <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#f9b03c] text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all pr-10"
              />
              <i className="fa-solid fa-envelope absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isSignupMode ? 'አዲስ የይለፍ ቃል (Password)' : 'የይለፍ ቃል'} <span className="text-amber-500">*</span>
              </label>
              {!isSignupMode && (
                <Link
                  href="/reset-password"
                  className="text-[11px] font-bold text-[#f9b03c] hover:underline"
                >
                  የይለፍ ቃል ረሱ?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignupMode ? 'ቢያንስ 8 ፊደላትና ቁጥሮች' : '••••••••'}
                minLength={isSignupMode ? 8 : undefined}
                required
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-[#f9b03c] text-slate-900 dark:text-white text-xs sm:text-sm placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
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
                <span>{isSignupMode ? 'ምዝገባዎን በማጠናቀቅ ላይ...' : 'በመግባት ላይ...'}</span>
              </>
            ) : (
              <>
                <span>{isSignupMode ? 'ምዝገባውን አጠናቅቅና ቀጥል (Complete Sign Up)' : 'ግባ (Sign In)'}</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
          {isSignupMode ? (
            <>
              አስቀድመው አካውንት አለዎት?{' '}
              <button
                type="button"
                onClick={() => { setIsSignupMode(false); setError(null); }}
                className="font-black text-[#f9b03c] hover:underline cursor-pointer"
              >
                ይግቡ (Sign In)
              </button>
            </>
          ) : (
            <>
              አዲስ ተማሪ ነዎት?{' '}
              <button
                type="button"
                onClick={() => { setIsSignupMode(true); setError(null); }}
                className="font-black text-[#f9b03c] hover:underline cursor-pointer"
              >
                አሁኑኑ ይመዝገቡ (Sign Up)
              </button>
            </>
          )}
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
      <AuthPageContent />
    </Suspense>
  );
}
