'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface RequireAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  courseImage?: string;
  isFree?: boolean;
  onContinueAuth: (isSignup: boolean) => void;
}

export default function RequireAuthModal({
  isOpen,
  onClose,
  courseTitle,
  courseImage,
  isFree = false,
  onContinueAuth
}: RequireAuthModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop with cinematic blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-[#0c1017]/95 border border-amber-400/30 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(249,176,60,0.2)] backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-400/20 dark:bg-[#f9b03c]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
          title="ዝጋ (Close)"
        >
          <i className="fa-solid fa-xmark text-base"></i>
        </button>

        {/* Icon & Title Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_30px_rgba(249,176,60,0.5)] transform -rotate-3 hover:rotate-0 transition-transform">
              <i className={isFree ? "fa-solid fa-gift" : "fa-solid fa-graduation-cap"}></i>
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1017] flex items-center justify-center text-[10px] text-white">
              <i className="fa-solid fa-lock"></i>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 dark:bg-amber-400/15 border border-amber-400/30 text-amber-800 dark:text-[#f9b03c] text-xs font-black mb-2.5">
            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
            <span>{isFree ? "የነፃ ኮርስ ምዝገባ" : "የኮርስ ግዢ ምዝገባ"}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            ለመቀጠል እባክዎ አስቀድመው ይመዝገቡ
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-sm leading-relaxed">
            {courseTitle ? (
              <>
                <span className="font-bold text-amber-700 dark:text-[#f9b03c]">"{courseTitle}"</span> የተሰኘውን ኮርስ ለመጀመር፣ እድገትዎን ለመከታተል እና ሰርተፍኬት ለማግኘት አባል መሆን ያስፈልግዎታል!
              </>
            ) : (
              "ኮርሱን ለመጀመር፣ የትምህርት እድገትዎን ለመከታተል እና በስምዎ ህጋዊ ሰርተፍኬት ለመውሰድ እባክዎ መጀመሪያ ይመዝገቡ ወይም ይግቡ።"
            )}
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-6 space-y-2.5">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-check text-[10px]"></i>
            </div>
            <span>ፈጣን ምዝገባ — በ 10 ሰከንዶች ውስጥ ይጀምሩ</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-[#f9b03c] flex items-center justify-center shrink-0">
              <i className="fa-solid fa-certificate text-[10px]"></i>
            </div>
            <span>ህጋዊ እና በዓለም አቀፍ ደረጃ የተረጋገጠ ሰርተፍኬት</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold">
            <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-infinity text-[10px]"></i>
            </div>
            <span>ያለ ምንም ገደብ የህይወት ዘመን ክፍት መዳረሻ (Lifetime Access)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onContinueAuth(true)}
            className="w-full btn-buy-now-vibe py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 group font-black shadow-lg"
          >
            <span>እሺ፣ አሁኑኑ ይመዝገቡ (Create Account)</span>
            <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
          </button>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => onContinueAuth(false)}
              className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-all border border-gray-200 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <i className="fa-solid fa-arrow-right-to-bracket text-xs text-amber-500"></i>
              <span>አካውንት አለኝ? ይግቡ (Log In)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 sm:py-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-semibold transition cursor-pointer"
            >
              ይቅር (Cancel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
