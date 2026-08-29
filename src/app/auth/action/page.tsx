'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';
  const apiKey = searchParams.get('apiKey') || '';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (mode === 'resetPassword' || oobCode) {
      router.replace(`/reset-password?code=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(email)}`);
    } else {
      router.replace('/');
    }
  }, [mode, oobCode, email, router]);

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-[#0c1017]/95 border border-white/10 text-center">
      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#f9b03c] mb-4"></i>
      <h2 className="text-lg font-black text-white font-heading mb-2">ማረጋገጫዎን እያዘጋጀን ነው...</h2>
      <p className="text-xs text-slate-400">እባክዎ ትንሽ ይጠብቁ።</p>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-center items-center px-4 py-16">
      <Suspense fallback={
        <div className="text-center text-slate-400">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#f9b03c] mb-2"></i>
          <p className="text-xs">በመጫን ላይ...</p>
        </div>
      }>
        <AuthActionHandler />
      </Suspense>
    </main>
  );
}
