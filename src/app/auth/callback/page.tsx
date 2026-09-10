'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatSupabaseUser, User } from '@/context/AuthContext';
import { getStoredReferrerUid, clearStoredReferrerUid } from '@/lib/referralTrackingService';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'checking' | 'onboarding' | 'redirecting' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Onboarding form state for new users
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('Google');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // 1. Immediately eliminate preloader gatekeeper and unlock DOM
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('tsehay-loading');
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
      } catch (e) {}
    }
  }, []);

  // Post-Auth Direct Routing (Checks pending action or goes to dashboard)
  const navigatePostAuth = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('tsehay-loading');
    }
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
      } catch (e) {}
    }

    try {
      const pendingRaw = sessionStorage.getItem('tsehay_pending_course_action') ||
                         sessionStorage.getItem('tsehay_pending_action');

      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        sessionStorage.removeItem('tsehay_pending_course_action');
        sessionStorage.removeItem('tsehay_pending_action');

        if (pending.type === 'enroll_free') {
          const cId = pending.courseId || pending.course?.id || 'digital_marketing_free';
          window.location.replace(`/dashboard?view=classroom&courseId=${encodeURIComponent(cId)}&lesson=0`);
          return;
        }
        if (pending.type === 'buy' || pending.type === 'buy_course') {
          const cId = pending.courseId || pending.course?.id;
          if (cId) {
            window.location.replace(`/courses/${encodeURIComponent(cId)}?checkout=true`);
            return;
          }
        }
      }
    } catch (e) {}

    window.location.replace('/dashboard');
  };

  // 2. Resolve authentication session & evaluate profile completion
  useEffect(() => {
    let isMounted = true;

    const resolveSession = async () => {
      try {
        // A. Check for OAuth error in URL parameters
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const oAuthError = searchParams?.get('error') || urlParams?.get('error');
        const oAuthErrorDesc = searchParams?.get('error_description') || urlParams?.get('error_description');

        if (oAuthError) {
          if (isMounted) {
            setStatus('error');
            setErrorMessage(oAuthErrorDesc || 'የGoogle መግቢያ ተሰርዟል ወይም አልተሳካም። እባክዎ በድጋሚ ይሞክሩ።');
          }
          return;
        }

        // B. Handle Supabase PKCE code exchange if ?code= is in the URL
        const code = searchParams?.get('code') || urlParams?.get('code');
        let userSession: any = null;

        if (code) {
          try {
            const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!exchangeErr && exchangeData?.session?.user) {
              userSession = exchangeData.session.user;
            }
          } catch (codeErr) {
            console.warn("PKCE code exchange error:", codeErr);
          }
        }

        // C. If session not obtained via PKCE exchange, try getSession()
        if (!userSession) {
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;
          userSession = session?.user;
        }

        // D. Fallback: Wait briefly (max 2.5s) for onAuthStateChange
        if (!userSession) {
          let resolved = false;

          const timeout = setTimeout(() => {
            if (isMounted && !resolved && status === 'checking') {
              // Final check in local storage before giving up
              try {
                const cached = localStorage.getItem('tsehay_auth_user_cache');
                if (cached) {
                  const parsed = JSON.parse(cached);
                  if (parsed?.uid || parsed?.id) {
                    resolved = true;
                    evaluateProfile(parsed);
                    return;
                  }
                }
              } catch (e) {}

              setStatus('error');
              setErrorMessage('የGoogle ማረጋገጫ ክፍለ ጊዜ ማግኘት አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
            }
          }, 2500);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (newSession?.user && isMounted && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              subscription.unsubscribe();
              await evaluateProfile(newSession.user);
            }
          });

          return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
          };
        }

        await evaluateProfile(userSession);
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err?.message || 'የመግቢያ ሂደቱን ማጠናቀቅ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
        }
      }
    };

    const evaluateProfile = async (rawUser: any) => {
      const formatted = formatSupabaseUser(rawUser);
      if (!formatted) {
        setStatus('error');
        setErrorMessage('የተጠቃሚ መረጃ ማግኘት አልተቻለም።');
        return;
      }

      setCurrentUser(formatted);

      // Pre-cache authenticated user immediately so dashboard is ready instantly
      try {
        localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(formatted));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: formatted }));
      window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: formatted }));

      // =========================================================================
      // 🌟 COMPREHENSIVE REGISTRATION STATUS CHECK
      // "automaticly yilef alredy yetemezegebe temari kehone kaltemezegebe detect argo endetelemedew yiketil"
      // =========================================================================
      try {
        // Step 1: Query server API check-registration with 3-second timeout protection
        const checkPromise = fetch('/api/auth/check-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: formatted.uid,
            email: formatted.email
          })
        }).then(res => res.json()).catch(() => null);

        // Client query fallback in parallel
        const clientProfilePromise = (async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .or(`id.eq.${formatted.uid},email.ilike.${formatted.email || ''}`)
              .limit(1);
            return data && data.length > 0 ? data[0] : null;
          } catch (e) {
            return null;
          }
        })();

        const [serverCheck, clientProfile] = await Promise.all([
          checkPromise,
          clientProfilePromise
        ]);

        const isRegisteredServer = Boolean(serverCheck?.isRegistered);
        const resolvedProfile = serverCheck?.profile || clientProfile;

        // Case A: Student is ALREADY REGISTERED -> AUTOMATIC PASS (Zero Delay)
        if (isRegisteredServer || resolvedProfile) {
          const finalUser: User = {
            ...formatted,
            displayName: resolvedProfile?.name || resolvedProfile?.full_name || resolvedProfile?.displayName || formatted.displayName,
            photoURL: resolvedProfile?.photoURL || resolvedProfile?.avatar_url || formatted.photoURL,
          };

          try {
            localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(finalUser));
          } catch (e) {}

          window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: finalUser }));
          window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: finalUser }));

          setStatus('redirecting');
          navigatePostAuth();
          return;
        }

        // Case B: Brand New Student -> Detect & Continue to Onboarding Form
        const suggestedName = formatted.displayName || '';
        setFullName(suggestedName);
        setPhone('');
        setCity('');
        setStatus('onboarding');

      } catch (evalErr) {
        console.warn("Notice evaluating profile:", evalErr);
        // Fallback: If evaluation encountered unexpected error, check if user already has course caches
        try {
          const hasCachedCourses = localStorage.getItem(`tsehay_user_courses_${formatted.uid}`);
          if (hasCachedCourses) {
            setStatus('redirecting');
            navigatePostAuth();
            return;
          }
        } catch (e) {}

        // Otherwise show onboarding form
        setFullName(formatted.displayName || '');
        setStatus('onboarding');
      }
    };

    resolveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Submit Mandatory Profile Onboarding for NEW students
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanCity = city.trim();

    if (!cleanName) {
      setOnboardingError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      setOnboardingError('እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ቢያንስ 7 አሃዞች)።');
      return;
    }
    if (!cleanCity) {
      setOnboardingError('እባክዎ የሚኖሩበትን ከተማ ወይም ሀገር ያስገቡ።');
      return;
    }
    if (!agreedToTerms) {
      setOnboardingError('እባክዎ የአጠቃቀም ህግ እና የግላዊነት ፖሊሲ መስማማትዎን ያረጋግጡ።');
      return;
    }

    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      const storedReferrerUid = getStoredReferrerUid();

      const profilePayload = {
        id: currentUser.uid,
        full_name: cleanName,
        display_name: cleanName,
        email: currentUser.email || null,
        phone: cleanPhone,
        city: cleanCity,
        source: source || 'Google',
        avatar_url: currentUser.photoURL || null,
        referred_by: storedReferrerUid || null,
        updated_at: new Date().toISOString()
      };

      // 1. Save to Supabase profiles table
      await supabase.from('profiles').upsert(profilePayload);

      // 2. Also record in users table for sync
      try {
        await supabase.from('users').upsert({
          id: currentUser.uid,
          name: cleanName,
          email: currentUser.email,
          phone: cleanPhone,
          city: cleanCity,
          source: source || 'Google',
          photoURL: currentUser.photoURL || null,
          role: 'student',
          updated_at: new Date().toISOString()
        });
      } catch (uErr) {}

      // 3. Referral tracking
      if (storedReferrerUid && storedReferrerUid !== currentUser.uid) {
        fetch('/api/referrals/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newUserUid: currentUser.uid,
            newUserName: cleanName,
            newUserEmail: currentUser.email,
            referrerUid: storedReferrerUid
          })
        }).catch(() => {});
        clearStoredReferrerUid();
      }

      // Update cached user
      const updatedUser: User = {
        ...currentUser,
        displayName: cleanName,
      };
      try {
        localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(updatedUser));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: updatedUser }));
      window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: updatedUser }));

      setStatus('redirecting');
      setTimeout(() => {
        navigatePostAuth();
      }, 300);
    } catch (err: any) {
      console.error("Onboarding submission error:", err);
      setOnboardingError('መረጃዎን ማስቀመጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl bg-[#0c1017]/95 border border-amber-400/30 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(249,176,60,0.2)] text-center relative backdrop-blur-2xl">
      
      {/* Top Brand Logo */}
      <Link href="/" className="inline-block mb-4 hover:scale-105 transition-transform">
        <img src="/tc-logo.jpg" alt="Tsehay Campus" className="w-16 h-16 rounded-2xl mx-auto border-2 border-[#f9b03c] shadow-lg object-cover" />
      </Link>

      {/* ========================================================= */}
      {/* 1. CHECKING / LOADING STATE (Instant Zero-Lag Spinner)     */}
      {/* ========================================================= */}
      {status === 'checking' && (
        <div className="py-8 space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 border-4 border-[#f9b03c]/20 border-t-[#f9b03c] rounded-full animate-spin mx-auto"></div>
          <h2 className="text-xl font-black text-white font-heading">
            ማረጋገጫዎን እያዘጋጀን ነው...
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            የGoogle አካውንትዎን በማገናኘት ላይ ነን፤ እባክዎ ጥቂት ሰከንዶችን ይጠብቁ።
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUCCESS / REDIRECTING STATE                             */}
      {/* ========================================================= */}
      {status === 'redirecting' && (
        <div className="py-8 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl border border-emerald-500/40 animate-bounce">
            <i className="fa-solid fa-check"></i>
          </div>
          <h2 className="text-xl font-black text-white font-heading">
            በተሳካ ሁኔታ ገብተዋል!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            ወደ ፀሐይ ካምፓስ መማሪያ ክፍልዎ በማስተላለፍ ላይ ነን...
          </p>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-4">
            <div className="bg-[#f9b03c] h-full animate-pulse w-full"></div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MANDATORY PROFILE ONBOARDING FOR NEW USERS              */}
      {/* ========================================================= */}
      {status === 'onboarding' && (
        <div className="text-left space-y-4 animate-in fade-in duration-300">
          <div className="text-center space-y-1 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-black">
              <i className="fa-solid fa-user-plus text-[11px]"></i>
              <span>አዲስ ተማሪ ምዝገባ</span>
            </div>
            <h2 className="text-xl font-black text-white font-heading">
              ምዝገባዎን ያጠናቅቁ
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              በ Google በተሳካ ሁኔታ ተገናኝተዋል! የመማሪያ ክፍልዎን ለማዘጋጀት የቀሩትን መረጃዎች ያሟሉ።
            </p>
          </div>

          {onboardingError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-400 shrink-0"></i>
              <span>{onboardingError}</span>
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ሙሉ ስም (Full Name) <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ለምሳሌ፡ ኢዮብ ሳህሌ (Eyoub Sahle)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ስልክ ቁጥር (Phone Number) <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="0911223344 ወይም +251911223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                ለሰርተፍኬት አሰጣጥ እና ለቀጥታ ትምህርት ማሳወቂያዎች ያስፈልጋል
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  የሚኖሩበት ከተማ (City) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ አዲስ አበባ / Dubai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ስለ እኛ ከየት ሰሙ?
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f1d] border border-white/15 focus:border-[#f9b03c] text-white text-xs sm:text-sm outline-none transition"
                >
                  <option value="Google">Google ፍለጋ</option>
                  <option value="Telegram">ቴሌግራም (Telegram)</option>
                  <option value="TikTok">ቲክቶክ (TikTok)</option>
                  <option value="YouTube">ዩቲዩብ (YouTube)</option>
                  <option value="Friend">ከጓደኛ / በሰው ጥቆማ</option>
                  <option value="Other">ሌላ</option>
                </select>
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-[#f9b03c] cursor-pointer mt-0.5 shrink-0"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  በፀሐይ ካምፓስ <Link href="/about#terms" target="_blank" className="text-[#f9b03c] underline hover:text-amber-300">የአጠቃቀም ህግጋት</Link> እና <Link href="/about#privacy" target="_blank" className="text-[#f9b03c] underline hover:text-amber-300">የግላዊነት ፖሊሲ</Link> ተስማምቻለሁ።
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(249,176,60,0.4)] active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>በማስቀመጥ ላይ...</span>
                  </>
                ) : (
                  <>
                    <span>አጠናቅቅና ወደ ክፍል ግባ (Complete & Continue)</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. ERROR STATE                                            */}
      {/* ========================================================= */}
      {status === 'error' && (
        <div className="py-6 space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-3xl border border-red-500/40">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-xl font-black text-white font-heading">
            መግባት አልተቻለም
          </h2>
          <p className="text-xs sm:text-sm text-red-300">
            {errorMessage || 'የተፈጠረ ችግር አለ፤ እባክዎ በድጋሚ ይሞክሩ።'}
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[#f9b03c] text-black font-black text-xs hover:bg-amber-400 transition text-center shadow-lg cursor-pointer"
            >
              ወደ ዋናው ገጽ ተመለስ (Back to Home)
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-center items-center px-4 py-16">
      <Suspense fallback={
        <div className="text-center text-slate-400">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#f9b03c] mb-2"></i>
          <p className="text-xs font-bold">በመጫን ላይ...</p>
        </div>
      }>
        <AuthCallbackHandler />
      </Suspense>
    </main>
  );
}
