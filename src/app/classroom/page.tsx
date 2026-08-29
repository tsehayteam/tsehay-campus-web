'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassroomRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#030509] flex items-center justify-center text-white">
      <div className="text-center">
        <i className="fa-solid fa-graduation-cap text-3xl text-[#f9b03c] mb-3 animate-pulse"></i>
        <p className="text-xs text-slate-400">ወደ መማሪያ ክፍል በማስተላለፍ ላይ...</p>
      </div>
    </div>
  );
}
