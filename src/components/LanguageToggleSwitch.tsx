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
      aria-label="Language selector (AM / EN)"
      className={`relative inline-flex items-center p-1 rounded-full bg-[#080d1a]/95 border border-white/15 backdrop-blur-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_0_15px_rgba(249,176,60,0.12)] transition-all duration-300 notranslate ${className}`}
      translate="no"
    >
      {/* Sliding Active Indicator Pill */}
      <div
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#e09825] shadow-[0_0_16px_rgba(249,176,60,0.6)] transition-all duration-300 ease-out pointer-events-none ${
          isAmharic ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
        }`}
      />

      {/* Option: AM (አማርኛ) */}
      <button
        type="button"
        role="radio"
        aria-checked={isAmharic}
        onClick={() => setLanguage('am')}
        className={`relative z-10 flex items-center justify-center rounded-full font-mono font-black transition-colors duration-200 cursor-pointer select-none active:scale-95 ${
          compact ? 'w-8 sm:w-9 py-1 text-[11px] sm:text-xs' : 'w-10 sm:w-11 py-1.5 text-xs sm:text-sm'
        } ${
          isAmharic
            ? 'text-slate-950 font-black'
            : 'text-slate-400 hover:text-white'
        }`}
        title="አማርኛ (AM)"
      >
        <span className="tracking-wider">AM</span>
      </button>

      {/* Option: EN (English) */}
      <button
        type="button"
        role="radio"
        aria-checked={!isAmharic}
        onClick={() => setLanguage('en')}
        className={`relative z-10 flex items-center justify-center rounded-full font-mono font-black transition-colors duration-200 cursor-pointer select-none active:scale-95 ${
          compact ? 'w-8 sm:w-9 py-1 text-[11px] sm:text-xs' : 'w-10 sm:w-11 py-1.5 text-xs sm:text-sm'
        } ${
          !isAmharic
            ? 'text-slate-950 font-black'
            : 'text-slate-400 hover:text-white'
        }`}
        title="English (EN)"
      >
        <span className="tracking-wider">EN</span>
      </button>
    </div>
  );
}
