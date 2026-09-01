'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { captureReferralParam } from '@/lib/referralTrackingService';

export default function ReferralsClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref') || urlParams.get('referrer') || '';
        if (refCode) {
          captureReferralParam(refCode);
          router.replace(`/courses?ref=${encodeURIComponent(refCode)}&welcome=true`);
          return;
        }
      } catch (e) {}
    }
    router.replace('/courses?welcome=true');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#06090e] flex items-center justify-center text-white font-body">
      <div className="text-center p-6 max-w-sm rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="w-14 h-14 rounded-2xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 flex items-center justify-center text-2xl mx-auto mb-4 animate-bounce">
          <i className="fa-solid fa-gift"></i>
        </div>
        <h2 className="text-lg font-black font-heading text-white mb-1">Tsehay Campus Referral</h2>
        <p className="text-xs text-slate-300">ወደ ኮርሶች በማስተላለፍ ላይ...</p>
      </div>
    </div>
  );
}
