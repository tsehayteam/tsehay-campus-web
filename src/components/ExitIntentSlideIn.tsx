'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, HelpCircle } from 'lucide-react';

const STORAGE_KEY = 'tsehay_exit_intent_dismissed';
const MIN_TIME_ON_PAGE_MS = 20000; // 20 seconds minimum

export default function ExitIntentSlideIn() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const mountTimeRef = useRef<number>(Date.now());
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    mountTimeRef.current = Date.now();

    try {
      const dismissedSession = sessionStorage.getItem(STORAGE_KEY);
      const dismissedLocal = localStorage.getItem(STORAGE_KEY);
      if (dismissedSession === 'true' || dismissedLocal === 'true') {
        setIsDismissed(true);
        return;
      }
      setIsDismissed(false);
    } catch {
      setIsDismissed(false);
    }

    const hasSpent20Seconds = () => {
      return Date.now() - mountTimeRef.current >= MIN_TIME_ON_PAGE_MS;
    };

    const triggerOpen = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      setIsOpen(true);
    };

    // 1. Desktop: mouse leaves viewport toward the top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 15 && hasSpent20Seconds()) {
        triggerOpen();
      }
    };

    // 2. Mobile: rapid scroll up near the top after spending 20s
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let lastScrollTime = Date.now();

    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const deltaY = lastScrollY - currentScrollY; // Positive when scrolling up
      const deltaTime = currentTime - lastScrollTime;

      // Check if user scrolls up rapidly near top (< 350px) after >= 20 seconds
      if (
        deltaY > 40 &&
        deltaTime < 200 &&
        currentScrollY < 350 &&
        hasSpent20Seconds()
      ) {
        triggerOpen();
      }

      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setIsDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Could not store exit intent dismissal:', e);
    }
  };

  if (isDismissed || !isOpen) {
    return null;
  }

  const telegramPreFilledUrl = `https://t.me/TsehayTeam?text=${encodeURIComponent(
    'ሰላም፣ የኦሬንቴሽን መረጃ ማግኘት እፈልጋለሁ'
  )}`;

  return (
    <aside
      role="complementary"
      aria-label="የኦሬንቴሽን መረጃ ማግኘት"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9950] max-w-sm w-[calc(100%-2rem)] rounded-3xl border border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(249,176,60,0.15)] animate-in fade-in slide-in-from-bottom-5 duration-300 transition-all select-none"
    >
      {/* Decorative ambient lighting flairs */}
      <div className="pointer-events-none absolute -top-14 -left-14 h-32 w-32 rounded-full bg-[#f9b03c]/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-14 h-32 w-32 rounded-full bg-[#24A1DE]/15 blur-2xl" />

      {/* Prominent Tap Target Close (X) Button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm"
        aria-label="ዝጋ (Dismiss)"
        title="ዝጋ (Dismiss)"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>

      {/* Title with subtle question icon */}
      <div className="flex items-center gap-2 pr-10 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/30 text-[#f9b03c] shrink-0">
          <HelpCircle className="w-4 h-4" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-white font-heading tracking-tight">
          እርግጠኛ አይደሉም?
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-[13.5px] text-neutral-300 font-normal leading-relaxed font-body pr-2">
        የመጀመሪያውን የኦሬንቴሽን ክፍለ-ጊዜ ይዘት እና ነፃ የስርዓተ-ትምህርት ማጠቃለያ በቴሌግራም እንላክልዎ።
      </p>

      {/* Action Button */}
      <div className="mt-4 pt-1 flex flex-col gap-2">
        <a
          href={telegramPreFilledUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            handleClose();
          }}
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-[#24A1DE] via-[#1f96d1] to-[#1a8bc4] hover:brightness-110 text-white font-black text-xs sm:text-sm tracking-wide shadow-[0_6px_20px_rgba(36,161,222,0.4)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <Send className="w-4 h-4 -rotate-12 fill-white stroke-[1.5]" />
          <span>በቴሌግራም ያግኙን</span>
        </a>

        {/* Secondary dismissal tap option */}
        <button
          type="button"
          onClick={handleClose}
          className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors py-1 cursor-pointer text-center"
        >
          አሁን አልፈልግም፤ ዝጋ
        </button>
      </div>
    </aside>
  );
}
