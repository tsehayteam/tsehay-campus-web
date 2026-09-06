'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface LanguageToggleSwitchProps {
  compact?: boolean;
  className?: string;
}

export default function LanguageToggleSwitch({ compact = false, className = '' }: LanguageToggleSwitchProps) {
  const { lang, setLanguage } = useLanguage();
  const isAmharic = lang === 'am';

  return (
    <div
      role="radiogroup"
      aria-label="Language selector"
      className={`relative inline-flex items-center p-1 rounded-full bg-[#080d1a]/95 border border-white/15 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_0_15px_rgba(249,176,60,0.1)] transition-all duration-300 notranslate ${className}`}
      translate="no"
    >
      {/* Sliding Active Indicator Pill */}
      <div
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#e09825] shadow-[0_0_18px_rgba(249,176,60,0.55)] transition-all duration-300 ease-out pointer-events-none ${
          isAmharic ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
        }`}
      />

      {/* Option: አማርኛ */}
      <button
        type="button"
        role="radio"
        aria-checked={isAmharic}
        onClick={() => setLanguage('am')}
        className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full font-black transition-colors duration-200 cursor-pointer select-none ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          isAmharic
            ? 'text-slate-950 font-black'
            : 'text-slate-300 hover:text-white'
        }`}
        title="ወደ አማርኛ ቀይር (Switch to Amharic)"
      >
        <span className="text-xs">🇪🇹</span>
        <span className="tracking-wide">አማርኛ</span>
      </button>

      {/* Option: English */}
      <button
        type="button"
        role="radio"
        aria-checked={!isAmharic}
        onClick={() => setLanguage('en')}
        className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full font-black transition-colors duration-200 cursor-pointer select-none ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          !isAmharic
            ? 'text-slate-950 font-black'
            : 'text-slate-300 hover:text-white'
        }`}
        title="Switch to English"
      >
        <span className="text-xs">🇬🇧</span>
        <span className="tracking-wide">English</span>
      </button>
    </div>
  );
}
