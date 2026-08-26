'use client';

import React, { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { formatDriveImageUrl } from '@/lib/courseCache';

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

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedThumb = formatDriveImageUrl(courseImage) || courseImage;

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop with cinematic blur */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Outer Glow Wrapper */}
      <div className="relative w-full max-w-sm sm:max-w-md my-auto z-10 animate-in zoom-in-95 duration-200">
        
        {/* Modal Dialog Card */}
        <div className="relative bg-[#0c1017] border border-amber-400/30 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.15)] text-white overflow-hidden">
          
          {/* Ambient Top Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#f9b03c]/20 rounded-full blur-2xl pointer-events-none" />
          
          {/* Top Golden Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-[#f9b03c] to-yellow-300" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10"
            title="ዝጋ (Close)"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>

          {/* Header Icon & Status Badge */}
          <div className="flex flex-col items-center text-center">
            
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-lg shadow-[0_0_20px_rgba(249,176,60,0.4)]">
                <i className={isFree ? "fa-solid fa-gift" : "fa-solid fa-graduation-cap"}></i>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[#f9b03c] text-[11px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping"></span>
                <span>{isFree ? "የነፃ ኮርስ ምዝገባ" : "የኮርስ ግዢ ምዝገባ"}</span>
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white font-heading tracking-tight">
              ለመቀጠል እባክዎ ይመዝገቡ
            </h3>

            {/* Compact Course Info Banner */}
            {courseTitle ? (
              <div className="w-full mt-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2.5 text-left">
                {formattedThumb ? (
                  <img 
                    src={formattedThumb} 
                    alt={courseTitle} 
                    className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-[#f9b03c] flex items-center justify-center shrink-0 text-sm">
                    <i className="fa-solid fa-play"></i>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{courseTitle}</p>
                  <p className="text-[11px] text-[#f9b03c] font-semibold">
                    {isFree ? "100% ነፃ መዳረሻ" : "የህይወት ዘመን ሙሉ መዳረሻ"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                የትምህርት እድገትዎን ለመከታተል እና ሰርተፍኬት ለመውሰድ እባክዎ መጀመሪያ ይመዝገቡ።
              </p>
            )}
          </div>

          {/* Value Propositions - Compact Inline Badges */}
          <div className="grid grid-cols-2 gap-2 my-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 text-[10px]">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <span className="text-[11px] font-semibold text-slate-200 truncate">ፈጣን ምዝገባ</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500/15 text-[#f9b03c] flex items-center justify-center shrink-0 text-[10px]">
                <i className="fa-solid fa-certificate"></i>
              </div>
              <span className="text-[11px] font-semibold text-slate-200 truncate">ህጋዊ ሰርተፍኬት</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onContinueAuth(true)}
              className="w-full btn-buy-now-vibe py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 group font-black shadow-lg"
            >
              <span>አሁኑኑ ይመዝገቡ (Create Account)</span>
              <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
            </button>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onContinueAuth(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <i className="fa-solid fa-arrow-right-to-bracket text-xs text-[#f9b03c]"></i>
                <span>አካውንት አለኝ? ይግቡ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2.5 text-xs text-gray-400 hover:text-white font-semibold transition cursor-pointer"
              >
                ይቅር
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
