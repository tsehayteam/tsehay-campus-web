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
    <html lang="am" className="dark">
      <body className="bg-[#030509] text-white min-h-screen flex flex-col items-center justify-center py-24 px-4 text-center font-sans antialiased">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-3 text-white">
            ገጹን መጫን አልተቻለም
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mb-8">
            የሲስተም ስህተት አጋጥሟል። እባክዎ እንደገና ይሞክሩ ወይም ወደ መነሻ ገጽ ይመለሱ።
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => reset()}
              className="px-6 py-3 rounded-2xl border border-white/20 text-white font-bold hover:bg-white/10 transition cursor-pointer"
            >
              እንደገና ይሞክሩ (Retry)
            </button>
            <a
              href="/"
              className="px-8 py-3.5 rounded-2xl bg-[#f9b03c] text-black font-black text-sm hover:brightness-110 transition shadow-[0_0_20px_rgba(249,176,60,0.4)]"
            >
              ወደ መነሻ ገጽ ይመለሱ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
