'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Copy, Check, Sparkles, ArrowRight, X } from 'lucide-react';

export default function PromoBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const promoCode = 'SHEIN15';

  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check dismissal state from sessionStorage after mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem('tsehay_promo_shein15_dismissed') === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {}
  }, []);

  // Determine if banner should show on current page
  const isTargetPage = Boolean(
    pathname === '/' ||
    pathname === '' ||
    pathname?.startsWith('/courses') ||
    pathname?.startsWith('/classroom') ||
    pathname?.startsWith('/dashboard')
  );

  const isExcludedPage = Boolean(
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/maintenance')
  );

  const shouldShow = !isDismissed && isTargetPage && !isExcludedPage;

  // Manage body/html class for navbar positioning coordination
  useEffect(() => {
    if (shouldShow) {
      document.documentElement.classList.add('has-promo-banner');
      const handleScroll = () => {
        if (window.scrollY > 55) {
          document.documentElement.classList.add('scrolled-past-banner');
        } else {
          document.documentElement.classList.remove('scrolled-past-banner');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      return () => {
        document.documentElement.classList.remove('has-promo-banner');
        document.documentElement.classList.remove('scrolled-past-banner');
        window.removeEventListener('scroll', handleScroll);
      };
    } else {
      document.documentElement.classList.remove('has-promo-banner');
      document.documentElement.classList.remove('scrolled-past-banner');
    }
  }, [shouldShow]);

  const handleCopy = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(promoCode);
      localStorage.setItem('tsehay_applied_referral_code', promoCode);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [promoCode]);

  const handleApplyPromo = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('tsehay_applied_referral_code', promoCode);
    } catch (err) {}

    // If already on Shein course page, trigger checkout modal directly
    if (pathname?.includes('shein')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-payment-modal'));
      }
      return;
    }

    router.push('/courses/shein-importing?promo=SHEIN15&buy=1');
  }, [pathname, promoCode, router]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem('tsehay_promo_shein15_dismissed', 'true');
    } catch (err) {}
    document.documentElement.classList.remove('has-promo-banner');
    document.documentElement.classList.remove('scrolled-past-banner');
  }, []);

  if (!shouldShow) return null;

  return (
    <aside 
      aria-label="New Year Shein Course Promotional Offer"
      className="relative z-40 w-full bg-gradient-to-r from-[#060911] via-[#111c30] to-[#060911] border-b border-[#f9b03c]/35 text-white shadow-[0_4px_25px_rgba(249,176,60,0.12)] transition-all duration-300"
    >
      {/* Top subtle golden shimmer border */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#f9b03c]/60 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4 text-xs sm:text-sm">
        
        {/* Banner Text with Animated Sparkle & Floating Motion */}
        <div className="flex items-center gap-2 text-center md:text-left min-w-0 font-primary">
          <span className="shrink-0 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/20 border border-[#f9b03c]/50 text-base select-none shadow-[0_0_12px_rgba(249,176,60,0.35)] animate-[flowerFloatAndGlow_3s_ease-in-out_infinite]">
            🌼
          </span>
          <div className="leading-snug animate-[bannerSubtleFloat_3.5s_ease-in-out_infinite]">
            <span className="text-gray-100">
              <strong className="bg-gradient-to-r from-[#f9b03c] via-amber-200 to-[#f9b03c] bg-clip-text text-transparent font-black tracking-wide drop-shadow-sm">
                እንኳን ለአዲሱ ዓመት አደረሳችሁ!
              </strong>{' '}
              ለSHEIN Importing Business ኮርስ <strong className="text-emerald-400 font-extrabold drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">15% ቅናሽ</strong> ለማግኘት ፕሮሞ ኮድ ይጠቀሙ{' '}
              <span className="inline-block text-[11px] sm:text-xs text-amber-200 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 ml-0.5 animate-pulse shadow-sm">
                (ለ10 ተማሪዎች ብቻ!)
              </span>
            </span>
          </div>
        </div>

        {/* Actions Group: Interactive Pill + CTA Button + Dismiss */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap justify-center">
          
          {/* Interactive Code Pill with Radiant Golden Glow & 1-Click Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className={`group relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl border text-xs font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer select-none active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.4)]'
                : 'bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border-[#f9b03c]/60 text-white animate-[goldPillGlowPulse_2.5s_ease-in-out_infinite]'
            }`}
            title="ኮዱን ኮፒ ለማድረግ ይጫኑ"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f9b03c] shrink-0 animate-bounce hidden sm:inline-block" />
            <span className="text-[#f9b03c] font-black tracking-wider drop-shadow-[0_0_8px_rgba(249,176,60,0.6)]">{promoCode}</span>
            <span className="w-px h-3.5 bg-white/20" />
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white/70 group-hover:text-white shrink-0 transition-colors" />
            )}
            <span className={`text-[11px] font-bold transition-colors ${copied ? 'text-emerald-300' : 'text-white/90'}`}>
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>

          {/* CTA Button leading to checkout */}
          <a
            href="/courses/shein-importing?promo=SHEIN15&buy=1"
            onClick={handleApplyPromo}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(249,176,60,0.3)] hover:shadow-[0_0_20px_rgba(249,176,60,0.5)] cursor-pointer select-none active:scale-95 whitespace-nowrap"
          >
            <span>ቅናሹን ተጠቀም</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </a>

          {/* Close / Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="ባነሩን ዝጋ"
            className="p-1 sm:p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
            title="ዝጋ (Dismiss)"
          >
            <X className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>
    </aside>
  );
}
