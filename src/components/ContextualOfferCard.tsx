'use client';

import React from 'react';
import { Gift, FileText, Send, Layout, ArrowRight } from 'lucide-react';

interface ContextualOfferCardProps {
  onRegister?: () => void;
  checkoutElementId?: string;
  course?: any;
}

export default function ContextualOfferCard({
  onRegister,
  checkoutElementId = 'course-checkout-card',
  course
}: ContextualOfferCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    // 1. Smooth scroll to the checkout section if it exists on page
    if (typeof document !== 'undefined' && checkoutElementId) {
      const el = document.getElementById(checkoutElementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // 2. Trigger register/checkout handler or open LakiPay payment modal
    if (onRegister) {
      onRegister();
    } else if (typeof window !== 'undefined') {
      const courseToUse = course || {
        id: 'shein-import-business',
        slug: 'shein-import-business',
        title: 'የሼን ኢምፖርት ቢዝነስ ስልጠና (Shein Import Business Course)',
        price: 4500,
        oldPrice: 6000,
        isFree: false
      };
      window.dispatchEvent(
        new CustomEvent('open-payment-modal', { detail: { course: courseToUse } })
      );
    }
  };

  return (
    <div
      role="region"
      aria-label="የTsehay Ecosystem ጥቅል ጉርሻ"
      style={{ padding: '16px' }}
      className="my-6 rounded-2xl border border-[#262626] bg-[#0d0d0d] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(249,176,60,0.08)] relative overflow-hidden transition-all duration-300 hover:border-amber-500/40"
    >
      {/* Ambient background flairs */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[#f9b03c]/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#3268ba]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Column: Headline, Body & Bonus Inclusions */}
        <div className="space-y-2.5 flex-1">
          {/* Bonus Pill Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#262626] bg-amber-500/10 px-3 py-0.5 text-[11px] font-black text-[#f9b03c] tracking-wide">
            <Gift className="w-3.5 h-3.5 stroke-[2.2] text-[#f9b03c]" />
            <span>ልዩ ስጦታ • INCLUDED FREE BONUS</span>
          </div>

          {/* Headline */}
          <h4 className="text-base sm:text-lg md:text-xl font-black text-white font-heading tracking-tight">
            የTsehay Ecosystem ጥቅል ጉርሻ
          </h4>

          {/* Body */}
          <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed max-w-2xl font-body">
            ይህንን ስልጠና ሲወስዱ ለስራ የሚያስፈልጉ የቴምፕሌቶች ስብስብ (Agency Contracts, Client Outreach Scripts እና Portfolio Templates) በነፃ ያገኛሉ።
          </p>

          {/* Inclusions Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
              <FileText className="w-3 h-3 text-[#f9b03c]" />
              <span>Agency Contracts</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
              <Send className="w-3 h-3 text-[#f9b03c]" />
              <span>Outreach Scripts</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300">
              <Layout className="w-3 h-3 text-[#f9b03c]" />
              <span>Portfolio Templates</span>
            </span>
          </div>
        </div>

        {/* Right Column: CTA Button */}
        <div className="shrink-0 flex items-center pt-2 md:pt-0">
          <button
            type="button"
            onClick={handleClick}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#f9b03c] hover:bg-[#ffb947] text-neutral-950 font-black text-xs sm:text-sm tracking-wide shadow-[0_4px_20px_rgba(249,176,60,0.35)] hover:shadow-[0_6px_25px_rgba(249,176,60,0.55)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <span>ይህንን ጥቅል ጨምሮ ይመዝገቡ</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
