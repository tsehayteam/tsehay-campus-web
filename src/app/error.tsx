'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
        <i className="fa-solid fa-graduation-cap"></i>
      </div>
      <h2 className="text-2xl sm:text-3xl font-black mb-3">ገጹን መጫን አልተቻለም (Unable to Load Page)</h2>
      <p className="text-gray-400 max-w-md mb-8">እባክዎ እንደገና ይሞክሩ ወይም ወደ መነሻ ገጽ ይመለሱ።</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button 
          onClick={() => reset()}
          className="px-6 py-3 rounded-2xl border border-white/20 text-white font-bold hover:bg-white/10 transition cursor-pointer"
        >
          እንደገና ይሞክሩ (Retry)
        </button>
        <Link href="/" className="btn-buy-now-vibe px-8 py-3.5 rounded-2xl font-black text-sm">
          ወደ መነሻ ገጽ ይመለሱ
        </Link>
      </div>
    </div>
  );
}
