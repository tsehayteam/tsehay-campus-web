'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'tsehay_top_announcement_dismissed';

export default function TopAnnouncementBar() {
  const [isDismissed, setIsDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        setIsDismissed(true);
        document.documentElement.style.setProperty('--top-announcement-height', '0px');
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isDismissed) {
      document.documentElement.style.setProperty('--top-announcement-height', '0px');
      return;
    }

    const updateHeight = () => {
      if (barRef.current) {
        const height = barRef.current.offsetHeight;
        document.documentElement.style.setProperty('--top-announcement-height', `${height}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [isDismissed, mounted]);

  const handleDismiss = () => {
    setIsDismissed(true);
    document.documentElement.style.setProperty('--top-announcement-height', '0px');
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Could not save announcement dismissal state:', e);
    }
  };

  const handleCtaClick = () => {
    if (typeof window !== 'undefined') {
      const defaultCourse = {
        id: 'shein-import-business',
        slug: 'shein-import-business',
        title: 'የሼን ኢምፖርት ቢዝነስ ስልጠና (Shein Import Business Course)',
        price: 4500,
        oldPrice: 6000,
        isFree: false
      };
      window.dispatchEvent(
        new CustomEvent('open-payment-modal', { detail: { course: defaultCourse } })
      );
    }
  };

  if (!mounted || isDismissed) {
    return null;
  }

  return (
    <aside
      ref={barRef}
      id="tsehay-top-announcement-bar"
      role="banner"
      aria-label="Announcement"
      className="sticky top-0 left-0 right-0 z-[9998] w-full bg-[#000000] border-b border-white/10 text-white shadow-md transition-all duration-300"
    >
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 text-xs sm:text-[13px]">
        {/* Left spacing placeholder to ensure center alignment on wide screens */}
        <div className="hidden lg:block w-7 shrink-0" aria-hidden="true" />

        {/* Center: Live Notification & Amharic Copy */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 sm:gap-3 flex-1 text-center font-normal leading-snug">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#f9b03c] shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f9b03c]" />
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#f9b03c]" />
          </span>

          <span className="text-gray-200">
            የቀጣዩ ዙር የተግባር ስልጠና ምዝገባ ሊጠናቀቅ <strong className="text-[#f9b03c] font-black">3 ቀናት ቀርተዋል</strong>{' '}
            <span className="text-neutral-500 mx-1 hidden sm:inline">|</span>{' '}
            <span className="text-neutral-300">
              ለቀደሙ 15 ተማሪዎች የ1-ለ-1 ፕሮጀክት ግምገማ ጉርሻ ተካቷል
            </span>
          </span>

          {/* CTA Button */}
          <Link
            href="/courses/shein-import-business?checkout=1"
            onClick={handleCtaClick}
            className="inline-flex items-center justify-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#f9b03c] hover:bg-[#ffb947] text-neutral-950 font-black text-[11px] sm:text-xs tracking-wide shrink-0 shadow-[0_2px_12px_rgba(249,176,60,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            አሁኑኑ ይመዝገቡ
          </Link>
        </div>

        {/* Right: Small, discreet close icon */}
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="ማስታወቂያውን ዝጋ (Dismiss announcement)"
          title="ዝጋ (Dismiss)"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>
    </aside>
  );
}
