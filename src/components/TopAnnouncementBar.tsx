'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Flame, Clock } from 'lucide-react';

const STORAGE_KEY = 'tsehay_top_announcement_dismissed';
const DEADLINE_STORAGE_KEY = 'tsehay_batch_target_deadline';

// Default cycle duration: 2 days, 18 hours, 45 minutes
const CYCLE_DURATION_MS = (2 * 24 * 60 * 60 + 18 * 60 * 60 + 45 * 60) * 1000;

export default function TopAnnouncementBar() {
  const [isDismissed, setIsDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  // Live Countdown State
  const [timeLeft, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    days: '02',
    hours: '14',
    minutes: '35',
    seconds: '12'
  });

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

  // Live Dynamic Countdown with Automatic Batch Renewal
  useEffect(() => {
    if (!mounted || isDismissed) return;

    const getOrInitDeadline = (): number => {
      try {
        const stored = localStorage.getItem(DEADLINE_STORAGE_KEY);
        if (stored) {
          const timestamp = parseInt(stored, 10);
          if (!isNaN(timestamp) && timestamp > Date.now()) {
            return timestamp;
          }
        }
      } catch (e) {}

      // If expired or not set, cycle to the next batch
      const newDeadline = Date.now() + CYCLE_DURATION_MS;
      try {
        localStorage.setItem(DEADLINE_STORAGE_KEY, newDeadline.toString());
      } catch (e) {}
      return newDeadline;
    };

    let targetDeadline = getOrInitDeadline();

    const updateTimer = () => {
      const now = Date.now();
      let diff = targetDeadline - now;

      // Reset / Cycle Logic: If timer reaches 0, seamlessly cycle to upcoming cohort
      if (diff <= 0) {
        targetDeadline = now + (3 * 24 * 60 * 60 + 12 * 60 * 60) * 1000;
        try {
          localStorage.setItem(DEADLINE_STORAGE_KEY, targetDeadline.toString());
        } catch (e) {}
        diff = targetDeadline - now;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0')
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [mounted, isDismissed]);

  // Keep navbar capsule offset in sync with announcement bar height
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
    <>
      <aside
        ref={barRef}
        id="tsehay-top-announcement-bar"
        role="banner"
        aria-label="Cohort Registration Announcement"
        className="sticky top-0 left-0 right-0 z-[9998] w-full bg-[#0a0a0a] border-b border-[#262626] text-white shadow-lg select-none transition-all duration-300"
      >
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 text-xs sm:text-[13px]">
          {/* Left spacing placeholder for centered visual alignment */}
          <div className="hidden xl:block w-7 shrink-0" aria-hidden="true" />

          {/* Center Content Row: Status Icon -> Shimmer Text -> Live Monospaced Countdown -> Solid CTA */}
          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 sm:gap-3.5 flex-1 text-center font-normal leading-snug">
            
            {/* Live Status Indicator: Radar Pulse dot + Crisp SVG Flame */}
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c] shadow-[0_0_8px_#f9b03c]" />
              </span>
              <Flame className="w-3.5 h-3.5 text-[#f9b03c] fill-[#f9b03c]/20 shrink-0" />
            </div>

            {/* Highlight Text with Animated Linear-Gradient Shimmer */}
            <span className="tsehay-shimmer-text font-bold text-xs sm:text-sm tracking-wide">
              የቀጣዩ ዙር የተግባር ስልጠና ምዝገባ ሊጠናቀቅ፦
            </span>

            {/* Live Monospaced Countdown Box */}
            <div 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 border border-[#262626] font-mono text-[11px] sm:text-xs font-bold text-[#f9b03c] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] tracking-wider shrink-0"
              title="የምዝገባ ማብቂያ ቀሪ ጊዜ"
              aria-live="polite"
            >
              <Clock className="w-3 h-3 text-[#f9b03c] mr-0.5" />
              <span>{timeLeft.days}d</span>
              <span className="text-neutral-500">:</span>
              <span>{timeLeft.hours}h</span>
              <span className="text-neutral-500">:</span>
              <span>{timeLeft.minutes}m</span>
              <span className="text-neutral-500">:</span>
              <span className="text-amber-200">{timeLeft.seconds}s</span>
            </div>

            {/* CTA Button: Solid #f9b03c, #000000 bold text */}
            <Link
              href="/courses/shein-import-business?checkout=1"
              onClick={handleCtaClick}
              className="inline-flex items-center justify-center px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#f9b03c] hover:bg-[#ffb947] text-[#000000] font-black text-[11px] sm:text-xs tracking-wide shrink-0 shadow-[0_2px_12px_rgba(249,176,60,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              አሁኑኑ ይመዝገቡ
            </Link>
          </div>

          {/* Far Right: Minimalist SVG X Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            aria-label="ማስታወቂያውን ዝጋ (Dismiss announcement)"
            title="ዝጋ (Dismiss)"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </aside>

      {/* Shimmer linear-gradient CSS animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes topBarShimmerSweep {
              0% {
                background-position: -200% center;
              }
              100% {
                background-position: 200% center;
              }
            }
            .tsehay-shimmer-text {
              background: linear-gradient(
                90deg,
                #ffffff 0%,
                #f9b03c 28%,
                #e5e5e5 50%,
                #f9b03c 72%,
                #ffffff 100%
              );
              background-size: 200% auto;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: topBarShimmerSweep 5s linear infinite;
            }
          `,
        }}
      />
    </>
  );
}
