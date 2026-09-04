'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthResetHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code') || searchParams.get('oobCode') || '';
  const email = searchParams.get('email') || '';

  useEffect(() => {
    router.replace(`/reset-password?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`);
  }, [code, email, router]);

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-[#0c1017]/95 border border-white/10 text-center">
      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#f9b03c] mb-4"></i>
      <p className="text-xs text-slate-400">ወደ የይለፍ ቃል መቀየሪያ ገጽ በማስተላለፍ ላይ...</p>
    </div>
  );
}

export default function AuthResetPage() {
  return (
    <main className="min-h-screen bg-[#030509] text-white flex flex-col justify-center items-center px-4 py-16">
      <Suspense fallback={null}>
        <AuthResetHandler />
      </Suspense>
    </main>
  );
}
