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
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold ${className}`}>
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
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black shadow-[0_0_15px_rgba(249,176,60,0.15)] font-mono ${className}`}>
        <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
        <span className="tracking-wider">
          {formatNum(info.days)}ቀ : {formatNum(info.hours)}ሰ : {formatNum(info.minutes)}ደ : <span className="text-white animate-pulse">{formatNum(info.seconds)}ሰከንድ</span>
        </span>
      </div>
    );
  }

  // Hero / Detail Page Display
  if (variant === 'hero') {
    return (
      <div className={`w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-black/80 via-[#0a0e17]/90 to-amber-950/20 border border-amber-500/30 shadow-[0_0_35px_rgba(249,176,60,0.12)] backdrop-blur-xl ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-heading tracking-wide">
              የቀጥታ ሰዓት ቆጣሪ (Live Countdown)
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            ዝግጅቱ እስኪጀመር ድረስ
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center font-mono">
          {/* Days */}
          <div className="relative group rounded-2xl p-2.5 sm:p-3 bg-black/70 border border-white/10 shadow-inner flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {formatNum(info.days)}
            </span>
            <span className="text-[10px] sm:text-xs font-sans font-bold text-slate-400 uppercase mt-0.5">
              ቀናት (Days)
            </span>
          </div>

          {/* Hours */}
          <div className="relative group rounded-2xl p-2.5 sm:p-3 bg-black/70 border border-white/10 shadow-inner flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-4xl font-black text-[#f9b03c] tracking-tight drop-shadow-[0_2px_10px_rgba(249,176,60,0.3)]">
              {formatNum(info.hours)}
            </span>
            <span className="text-[10px] sm:text-xs font-sans font-bold text-slate-400 uppercase mt-0.5">
              ሰዓት (Hours)
            </span>
          </div>

          {/* Minutes */}
          <div className="relative group rounded-2xl p-2.5 sm:p-3 bg-black/70 border border-white/10 shadow-inner flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
              {formatNum(info.minutes)}
            </span>
            <span className="text-[10px] sm:text-xs font-sans font-bold text-slate-400 uppercase mt-0.5">
              ደቂቃ (Mins)
            </span>
          </div>

          {/* Seconds - Pulsing */}
          <div className="relative group rounded-2xl p-2.5 sm:p-3 bg-amber-500/15 border-2 border-amber-400/60 shadow-[0_0_20px_rgba(249,176,60,0.3)] flex flex-col items-center justify-center animate-pulse">
            <span className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_15px_rgba(249,176,60,0.6)]">
              {formatNum(info.seconds)}
            </span>
            <span className="text-[10px] sm:text-xs font-sans font-black text-amber-300 uppercase mt-0.5">
              ሰከንድ (Secs)
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Card Variant (Default) - Fits perfectly inside Event Cards
  return (
    <div className={`w-full bg-[#060a12]/95 border border-amber-500/30 rounded-2xl p-2.5 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.6)] ${className}`}>
      <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
        <span className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>የቀረው ጊዜ (Live Countdown)፦</span>
        </span>
        <span className="text-[9px] text-amber-400/80 font-mono font-bold tracking-wider">LIVE</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
        {/* Days */}
        <div className="bg-black/70 border border-white/10 rounded-xl py-1 px-1 shadow-inner">
          <div className="text-base sm:text-lg font-black text-white">{formatNum(info.days)}</div>
          <div className="text-[9px] text-slate-400 font-sans font-bold">ቀን</div>
        </div>

        {/* Hours */}
        <div className="bg-black/70 border border-white/10 rounded-xl py-1 px-1 shadow-inner">
          <div className="text-base sm:text-lg font-black text-[#f9b03c]">{formatNum(info.hours)}</div>
          <div className="text-[9px] text-slate-400 font-sans font-bold">ሰዓት</div>
        </div>

        {/* Minutes */}
        <div className="bg-black/70 border border-white/10 rounded-xl py-1 px-1 shadow-inner">
          <div className="text-base sm:text-lg font-black text-white">{formatNum(info.minutes)}</div>
          <div className="text-[9px] text-slate-400 font-sans font-bold">ደቂቃ</div>
        </div>

        {/* Seconds */}
        <div className="bg-amber-500/15 border border-amber-400/50 rounded-xl py-1 px-1 shadow-[0_0_12px_rgba(249,176,60,0.25)]">
          <div className="text-base sm:text-lg font-black text-amber-300 animate-pulse">{formatNum(info.seconds)}</div>
          <div className="text-[9px] text-amber-300 font-sans font-black">ሰከንድ</div>
        </div>
      </div>
    </div>
  );
}
