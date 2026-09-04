'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const email = searchParams.get('email') || '';

  const [status, setStatus] = useState<'processing' | 'verified' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!oobCode) {
      router.replace('/');
      return;
    }

    // 1. Password Reset Action -> Redirect to Dedicated Password Reset Page
    if (mode === 'resetPassword' || mode === 'reset' || (!mode && oobCode)) {
      router.replace(`/reset-password?code=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(email)}&mode=resetPassword`);
      return;
    }

    // 2. Email Verification Action -> Verify inline using Supabase verifyOtp
    if (mode === 'verifyEmail' || mode === 'verify') {
      supabase.auth.verifyOtp({ token_hash: oobCode, type: 'email' })
        .then(async ({ error }) => {
          if (error) {
            console.warn('Supabase email verification error:', error);
            setStatus('error');
            setErrorMessage('የማረጋገጫ ሊንኩ ልክ ያልሆነ ነው ወይም ጊዜው አልፎበታል። እባክዎ በድጋሚ ይሞክሩ።');
            return;
          }
          setStatus('verified');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2200);
        })
        .catch((err: any) => {
          console.error('Email verification error:', err);
          setStatus('error');
          setErrorMessage('ኢሜሉን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
        });
      return;
    }

    // Default fallback redirect
    router.replace(`/reset-password?code=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(email)}`);
  }, [mode, oobCode, email, router]);

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-[#0c1017]/95 border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(249,176,60,0.15)] text-center relative backdrop-blur-2xl">
      <Link href="/" className="inline-block mb-4 hover:scale-105 transition-transform">
        <img src="/tc-logo.jpg" alt="Tsehay Campus" className="w-16 h-16 rounded-2xl mx-auto border-2 border-[#f9b03c] shadow-lg object-cover" />
      </Link>

      {status === 'processing' && (
        <div className="py-6 space-y-4 animate-in fade-in duration-200">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#f9b03c]"></i>
          <h2 className="text-xl font-black text-white font-heading">
            ማረጋገጫዎን እያዘጋጀን ነው...
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            እባክዎ ጥቂት ሰከንዶችን ይጠብቁ፤ በቀጥታ ወደ ገጽዎ እየተላለፉ ነው።
          </p>
        </div>
      )}

      {status === 'verified' && (
        <div className="py-6 space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl border border-emerald-500/40 animate-bounce">
            <i className="fa-solid fa-check"></i>
          </div>
          <h2 className="text-xl font-black text-white font-heading">
            🎉 ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            ወደ ፀሐይ ካምፓስ መማሪያ ክፍልዎ በቀጥታ እየተላለፉ ነው...
          </p>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-4">
            <div className="bg-emerald-500 h-full animate-pulse w-full"></div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="py-6 space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-3xl border border-red-500/40">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-xl font-black text-white font-heading">
            ማረጋገጥ አልተቻለም
          </h2>
          <p className="text-xs sm:text-sm text-red-300">
            {errorMessage || 'የተፈጠረ ችግር አለ፤ እባክዎ በድጋሚ ይሞክሩ።'}
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-3 rounded-xl bg-[#f9b03c] text-black font-black text-xs hover:bg-amber-400 transition"
            >
              ወደ ዋናው ገጽ ተመለስ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-center items-center px-4 py-16">
      <Suspense fallback={
        <div className="text-center text-slate-400">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#f9b03c] mb-2"></i>
          <p className="text-xs font-bold">በመጫን ላይ...</p>
        </div>
      }>
        <AuthActionHandler />
      </Suspense>
    </main>
  );
}
