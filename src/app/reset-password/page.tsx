'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import { 
  signInWithCustomToken, 
  signInWithEmailAndPassword,
  confirmPasswordReset,
  verifyPasswordResetCode 
} from 'firebase/auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlEmail = searchParams.get('email') || '';
  const urlCode = searchParams.get('code') || searchParams.get('oobCode') || '';
  const urlOobCode = searchParams.get('oobCode') || '';

  const [email, setEmail] = useState(urlEmail);
  const [code, setCode] = useState(urlCode);
  const [oobCode, setOobCode] = useState(urlOobCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlCode) setCode(urlCode);
    if (urlOobCode) setOobCode(urlOobCode);

    const checkCode = urlOobCode || (urlCode.length > 10 ? urlCode : '');
    if (checkCode) {
      verifyPasswordResetCode(auth, checkCode)
        .then((verifiedEmail) => {
          if (verifiedEmail) {
            setEmail(verifiedEmail);
          }
        })
        .catch((err) => {
          console.warn('Firebase action code verification notice:', err);
        });
    }
  }, [urlEmail, urlCode, urlOobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();
    const targetOobCode = oobCode || (cleanCode.length > 10 ? cleanCode : '');

    if (!cleanEmail) {
      setError('እባክዎ የ Gmail አድራሻዎን ያስገቡ።');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com')) {
      setError('ይቅርታ! የፀሐይ ካምፓስ የሚቀበለው ትክክለኛ የ Gmail (@gmail.com) አድራሻዎችን ብቻ ነው።');
      return;
    }

    if (!cleanCode && !targetOobCode) {
      setError('እባክዎ የማረጋገጫ ኮድ ወይም ሊንክ ያስገቡ።');
      return;
    }

    if (cleanPass.length < 6) {
      setError('አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError('የይለፍ ቃሎቹ አይመሳሰሉም። እባክዎ በትክክል ያረጋግጡ።');
      return;
    }

    setIsSubmitting(true);

    try {
      let resetSuccess = false;

      // 1. If an action code is available, attempt native client-side reset
      if (targetOobCode) {
        try {
          await confirmPasswordReset(auth, targetOobCode, cleanPass);
          resetSuccess = true;
          console.log('[reset-password] Native confirmPasswordReset succeeded');
        } catch (fbErr: any) {
          console.warn('[reset-password] Native confirmPasswordReset notice:', fbErr);
          const fbErrCode = fbErr?.code || '';
          if (fbErrCode === 'auth/expired-action-code') {
            // Action code expired; will proceed with API route fallback
          }
        }
      }

      // 2. Call API route (handles 6-digit OTP, Identity Toolkit REST, or Firebase Admin update/create)
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword: cleanPass,
          oobCode: targetOobCode || undefined,
          alreadyReset: resetSuccess
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!resetSuccess && (!res.ok || !data.success)) {
        throw new Error(data.error || 'የይለፍ ቃል መቀየር አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
      }

      // Auto sign in with customToken if provided
      if (data.customToken) {
        try {
          const cred = await signInWithCustomToken(auth, data.customToken);
          window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: cred.user }));
          window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: cred.user }));
        } catch (tokenErr) {}
      }

      setIsSuccess(true);

      // Attempt immediate password sign in if not already logged in
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        window.dispatchEvent(new CustomEvent('tsehay_auth_state_changed', { detail: cred.user }));
        window.dispatchEvent(new CustomEvent('tsehay_user_logged_in', { detail: cred.user }));
      } catch (passErr) {
        console.warn('Password login notice:', passErr);
      }

      // Check for pending actions in sessionStorage to return seamlessly
      setTimeout(() => {
        try {
          const pendingAction = sessionStorage.getItem('tsehay_pending_action') ||
                               sessionStorage.getItem('tsehay_pending_course_action') ||
                               sessionStorage.getItem('tsehay_pending_event_reg');
          
          if (pendingAction) {
            const parsed = JSON.parse(pendingAction);
            if (parsed.returnUrl) {
              router.push(parsed.returnUrl);
              return;
            }
            if (parsed.courseId) {
              router.push(`/courses/${parsed.courseId}`);
              return;
            }
            if (parsed.eventSlug) {
              router.push(`/events/${parsed.eventSlug}`);
              return;
            }
          }
        } catch (e) {}

        // Default redirect
        router.push('/dashboard');
      }, 1600);

    } catch (err: any) {
      setError(err?.message || 'ስህተት ተፈጥሯል፤ እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-[#0c1017]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(249,176,60,0.15)] relative">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4 hover:scale-105 transition-transform">
          <img src="/tc-logo.jpg" alt="Tsehay Campus" className="w-16 h-16 rounded-2xl mx-auto border-2 border-[#f9b03c] shadow-lg object-cover" />
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9b03c]/15 text-[#f9b03c] text-xs font-black uppercase tracking-widest border border-[#f9b03c]/30 mb-3">
          <i className="fa-solid fa-lock text-[10px]"></i>
          <span>Password Reset</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
          የይለፍ ቃልዎን <span className="text-[#f9b03c]">ይቀይሩ</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 font-body">
          አዲሱን የይለፍ ቃልዎን በማስገባት አካውንትዎን ደህንነቱ የተጠበቀ ያድርጉ።
        </p>
      </div>

      {/* Success State */}
      {isSuccess ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-in zoom-in-95 duration-300">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl mb-4 border border-emerald-500/40 animate-bounce">
            <i className="fa-solid fa-check"></i>
          </div>
          <h3 className="text-lg font-black text-white font-heading mb-2">
            የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!
          </h3>
          <p className="text-xs text-slate-300 mb-4 font-body">
            በአዲሱ የይለፍ ቃልዎ በቀጥታ ወደ አካውንትዎ ገብተዋል። ወደ መማሪያ ክፍልዎ እየተላለፉ ነው...
          </p>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full animate-pulse w-full"></div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <i className="fa-solid fa-triangle-exclamation text-red-400 mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              የ Gmail አድራሻ (Gmail Address)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none transition-colors"
              />
              <i className="fa-solid fa-envelope absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"></i>
            </div>
          </div>

          {/* OTP Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                ባለ 6-አሃዝ የማረጋገጫ ኮድ (Verification Code)
              </label>
              {(urlCode || urlOobCode) && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <i className="fa-solid fa-circle-check"></i> ከሊንኩ ተያይዟል
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-mono tracking-widest focus:outline-none transition-colors"
              />
              <i className="fa-solid fa-shield-halved absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"></i>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              አዲስ የይለፍ ቃል (New Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ቢያንስ 6 ፊደላት ወይም ቁጥሮች"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              የይለፍ ቃሉን ያረጋግጡ (Confirm New Password)
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="የይለፍ ቃሉን በድጋሚ ያስገቡ"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-[0_0_25px_rgba(249,176,60,0.35)] cursor-pointer flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                <span>በማረጋገጥ ላይ...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-key text-xs"></i>
                <span>የይለፍ ቃል ቀይር እና ግባ (Save & Login)</span>
              </>
            )}
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-3">
            <Link
              href="/"
              onClick={() => {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: false } }));
                }, 300);
              }}
              className="text-xs text-slate-400 hover:text-[#f9b03c] transition-colors inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-left text-[10px]"></i>
              <span>ወደ መግቢያ ገጽ ተመለስ (Back to Login)</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-center items-center px-4 py-16 relative overflow-hidden">
      {/* Background Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#3268ba]/15 via-[#f9b03c]/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      
      <div className="w-full relative z-10">
        <Suspense fallback={
          <div className="w-full max-w-md mx-auto p-12 text-center text-slate-400">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#f9b03c] mb-3"></i>
            <p className="text-xs">በመጫን ላይ...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
