'use client';

import React, { useEffect } from 'react';
import { Lock, X, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  lesson?: any;
  onEnroll: () => void;
}

export default function PaywallModal({
  isOpen,
  onClose,
  course,
  lesson,
  onEnroll,
}: PaywallModalProps) {
  // Prevent body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const priceNum = Number(course.price || 0);
  const oldPriceNum = Number(course.oldPrice || course.old_price || 0);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark Ambient Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg bg-[#0b1329] border border-amber-400/30 rounded-3xl sm:rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(249,176,60,0.25)] z-10 animate-in zoom-in-95 duration-300 overflow-hidden text-white p-6 sm:p-8"
        style={{
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        }}
      >
        {/* Subtle Golden Ambient Orb */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-br from-[#f9b03c]/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer z-20"
          title="ዝጋ (Close)"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="relative text-center mb-5">
          <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-400/20 rounded-2xl blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
            ይህ ትምህርት ተቆልፏል
          </h3>
          <p className="text-[11px] uppercase tracking-wider text-amber-400/90 font-mono font-bold mt-1">
            Locked Lesson • Completed Payment Required
          </p>

          {lesson?.title && (
            <div className="mt-3 inline-block max-w-full">
              <span className="text-xs sm:text-sm font-bold text-gray-200 bg-white/[0.05] border border-white/10 px-3.5 py-1.5 rounded-full inline-block truncate max-w-full">
                {lesson.title}
              </span>
            </div>
          )}
        </div>

        {/* Explanation Message */}
        <p className="text-xs sm:text-sm text-gray-300 text-center leading-relaxed mb-5">
          ይህንን ትምህርት እና ሙሉውን የኮርስ ይዘት፣ የተግባር ፋይሎችና የቪአይፒ ማህበረሰብ መዳረሻ ለማግኘት እባክዎ መጀመሪያ ተመዝግበው ክፍያ ይፈጽሙ።
        </p>

        {/* Pricing Box */}
        <div className="mb-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] text-gray-400 uppercase font-mono font-bold block">
              የኮርሱ ክፍያ (Tuition Fee)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white font-heading">
                {priceNum.toLocaleString()} ETB
              </span>
              {oldPriceNum > priceNum && (
                <span className="text-xs text-gray-500 line-through font-bold">
                  {oldPriceNum.toLocaleString()} ETB
                </span>
              )}
            </div>
          </div>
          <span className="text-xs bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 font-black px-3 py-1 rounded-full shadow-sm">
            ሙሉ መዳረሻ
          </span>
        </div>

        {/* Key Inclusions */}
        <div className="space-y-2 mb-6 text-xs text-gray-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>የሁሉንም ክፍሎች የተሟላ የቪዲዮ ትምህርት መዳረሻ (HD Video)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>የቴሌግራም ቪአይፒ (VIP) የአጋርነት ማህበረሰብ መዳረሻ</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>የኮርስ ማጠናቀቂያ ህጋዊ ሰርተፊኬት (Verified Certificate)</span>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEnroll();
            }}
            className="w-full terafab-btn-primary py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(249,176,60,0.4)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <span>አሁኑኑ ይመዝገቡ እና ይክፈሉ (Enroll & Pay Now)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-gray-400 hover:text-white transition cursor-pointer"
          >
            ተመለስ (Close)
          </button>
        </div>

        {/* Free Preview Tip if available */}
        <p className="text-[11px] text-gray-400 text-center mt-4">
          💡 <span className="font-bold text-amber-300">ምክር፡</span> በኮርሱ ይዘት ውስጥ{' '}
          <span className="text-[#f9b03c] font-black underline">«ነፃ ቅምሻ»</span> የተባሉትን ክፍሎች ያለ ክፍያ መመልከት ይችላሉ።
        </p>
      </div>
    </div>
  );
}
