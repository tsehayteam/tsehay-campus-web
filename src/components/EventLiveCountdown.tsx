'use client';

import React, { useState, useEffect } from 'react';
import { TsehayEvent, getEventCountdown, EventCountdownInfo } from '@/lib/eventCache';

interface EventLiveCountdownProps {
  event: TsehayEvent;
  variant?: 'card' | 'hero' | 'compact';
  externalNow?: Date;
  onExpire?: () => void;
  className?: string;
}

export default function EventLiveCountdown({
  event,
  variant = 'card',
  externalNow,
  onExpire,
  className = ''
}: EventLiveCountdownProps) {
  const [internalNow, setInternalNow] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Automatic 1-second live ticker
    const timer = setInterval(() => {
      setInternalNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const now = externalNow || internalNow;
  const info: EventCountdownInfo = getEventCountdown(event, now);

  useEffect(() => {
    if (info.isPassed && onExpire) {
      onExpire();
    }
  }, [info.isPassed, onExpire]);

  if (info.isPassed) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold ${className}`}>
        <i className="fa-solid fa-clock-rotate-left text-[11px]" />
        <span>ክስተቱ አልፏል (Event Passed)</span>
      </div>
    );
  }

  // Format numbers to always be 2 digits
  const formatNum = (n: number) => String(Math.max(0, n)).padStart(2, '0');

  // Compact Pill Display
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-[#f9b03c] text-xs font-bold font-mono backdrop-blur-sm ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-pulse" />
        <span className="tracking-wider">
          {formatNum(info.days)}ቀ : {formatNum(info.hours)}ሰ : {formatNum(info.minutes)}ደ : {formatNum(info.seconds)}ሰ
        </span>
      </div>
    );
  }

  // Hero / Detail Page Display
  if (variant === 'hero') {
    return (
      <div className={`w-full py-1.5 ${className}`}>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center font-mono">
          {/* Days */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white/[0.04] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center transition-colors hover:border-[#f9b03c]/40">
            <span className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none font-mono">
              {formatNum(info.days)}
            </span>
            <span className="text-[11px] sm:text-xs font-sans text-neutral-400 font-medium tracking-wider mt-1.5">
              ቀናት
            </span>
          </div>

          {/* Hours */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white/[0.04] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center transition-colors hover:border-[#f9b03c]/40">
            <span className="text-2xl sm:text-4xl font-black text-[#f9b03c] tracking-tight leading-none font-mono">
              {formatNum(info.hours)}
            </span>
            <span className="text-[11px] sm:text-xs font-sans text-neutral-400 font-medium tracking-wider mt-1.5">
              ሰዓታት
            </span>
          </div>

          {/* Minutes */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white/[0.04] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center transition-colors hover:border-[#f9b03c]/40">
            <span className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none font-mono">
              {formatNum(info.minutes)}
            </span>
            <span className="text-[11px] sm:text-xs font-sans text-neutral-400 font-medium tracking-wider mt-1.5">
              ደቂቃዎች
            </span>
          </div>

          {/* Seconds */}
          <div className="rounded-2xl p-3 sm:p-4 bg-white/[0.04] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center transition-colors hover:border-[#f9b03c]/40">
            <span className="text-2xl sm:text-4xl font-black text-[#f9b03c] tracking-tight leading-none font-mono">
              {formatNum(info.seconds)}
            </span>
            <span className="text-[11px] sm:text-xs font-sans text-neutral-400 font-medium tracking-wider mt-1.5">
              ሰከንዶች
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Card Variant (Default) - Clean, Minimalist, Sleek Grid without redundant labels
  return (
    <div className={`w-full py-0.5 ${className}`}>
      <div className="grid grid-cols-4 gap-2 text-center font-mono">
        {/* Days */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]">
          <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight leading-none">
            {formatNum(info.days)}
          </span>
          <span className="text-[10px] sm:text-xs text-neutral-400 font-sans font-medium tracking-wide mt-1">
            ቀን
          </span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]">
          <span className="text-lg sm:text-xl font-black font-mono text-[#f9b03c] tracking-tight leading-none">
            {formatNum(info.hours)}
          </span>
          <span className="text-[10px] sm:text-xs text-neutral-400 font-sans font-medium tracking-wide mt-1">
            ሰዓት
          </span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]">
          <span className="text-lg sm:text-xl font-black font-mono text-white tracking-tight leading-none">
            {formatNum(info.minutes)}
          </span>
          <span className="text-[10px] sm:text-xs text-neutral-400 font-sans font-medium tracking-wide mt-1">
            ደቂቃ
          </span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]">
          <span className="text-lg sm:text-xl font-black font-mono text-[#f9b03c] tracking-tight leading-none">
            {formatNum(info.seconds)}
          </span>
          <span className="text-[10px] sm:text-xs text-neutral-400 font-sans font-medium tracking-wide mt-1">
            ሰከንድ
          </span>
        </div>
      </div>
    </div>
  );
}
