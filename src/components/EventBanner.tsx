'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TsehayEvent, formatEventBannerUrl, DEFAULT_EVENT_BANNER } from '@/lib/eventCache';
import { supabase } from '@/lib/supabase/client';
import { Calendar, Clock, MapPin, Globe, Sparkles, X, Ticket, ArrowRight } from 'lucide-react';

interface EventBannerProps {
  className?: string;
  onBookClick?: (event: TsehayEvent) => void;
}

export default function EventBanner({ className = '', onBookClick }: EventBannerProps) {
  const [banner, setBanner] = useState<TsehayEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('tsehay_event_banner_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.status !== 'inactive') {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  });

  const [isActive, setIsActive] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Live Fetch & DB Sync Pipeline with Cache-Busting
  const fetchLiveBanner = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/events/banner?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.active && data.banner) {
          const b = data.banner;
          // Check if user previously dismissed THIS specific event in current session
          const dismissedInSession = sessionStorage.getItem(`tsehay_banner_dismissed_${b.id}`) === 'true';
          if (!dismissedInSession) {
            setIsDismissed(false);
          }
          setBanner(b);
          setIsActive(true);
          try {
            localStorage.setItem('tsehay_event_banner_cache', JSON.stringify(b));
          } catch (_) {}
        } else {
          // If inactive or null
          setIsActive(false);
          setBanner(null);
          try {
            localStorage.removeItem('tsehay_event_banner_cache');
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Live event banner sync skipped:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveBanner();

    // 1. Supabase Realtime WebSocket synchronization
    const bannerChannel = supabase
      .channel('realtime_public_event_banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          if (payload?.new && (payload.new.key === 'event_banner' || payload.new.key === 'events')) {
            fetchLiveBanner();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchLiveBanner();
        }
      )
      .subscribe();

    // 2. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tsehay_events_sync');
        bc.onmessage = () => {
          fetchLiveBanner();
        };
      }
    } catch (_) {}

    // 3. Window Custom Event Listeners
    const handleEventsUpdated = () => fetchLiveBanner();
    window.addEventListener('tsehay_events_updated', handleEventsUpdated);
    window.addEventListener('tsehay_banner_updated', handleEventsUpdated);

    // 4. Focus & Visibility Sync
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveBanner();
      }
    };
    window.addEventListener('focus', fetchLiveBanner);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(bannerChannel);
      if (bc) bc.close();
      window.removeEventListener('tsehay_events_updated', handleEventsUpdated);
      window.removeEventListener('tsehay_banner_updated', handleEventsUpdated);
      window.removeEventListener('focus', fetchLiveBanner);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLiveBanner]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (banner?.id) {
      try {
        sessionStorage.setItem(`tsehay_banner_dismissed_${banner.id}`, 'true');
      } catch (_) {}
    }
  };

  // If not active, no banner data, or dismissed by user for this session, render nothing
  if (!isActive || !banner || isDismissed || banner.status === 'inactive') {
    return null;
  }

  const posterImage = formatEventBannerUrl(banner.image) || banner.image || DEFAULT_EVENT_BANNER;
  const isFree = banner.isFree || banner.price === 0;
  const eventLink = `/events/${banner.slug || banner.id}`;

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 relative z-30 my-6 sm:my-8 transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${className}`}>
      {/* Outer Frosted Glass Card Container */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950/95 via-[#081326]/95 to-slate-950/95 border-2 border-[#f9b03c]/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(249,176,60,0.25)] backdrop-blur-2xl p-4 sm:p-5 md:p-6 overflow-hidden group">
        
        {/* Ambient Radial Aura Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#f9b03c]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#3268ba]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-90"
          title="ባነሩን ዝጋ (Dismiss)"
          aria-label="ባነሩን ዝጋ"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Layout Grid */}
        <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6 relative z-10">
          
          {/* Left: Event Thumbnail / Poster Image with Live Ribbon */}
          <Link
            href={eventLink}
            className="relative w-full md:w-64 lg:w-72 aspect-[16/10] sm:aspect-video md:aspect-[16/11] rounded-2xl overflow-hidden border border-white/15 shrink-0 bg-slate-900 group/img shadow-xl block cursor-pointer"
          >
            <img
              src={posterImage}
              alt={banner.title}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
              loading="eager"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_EVENT_BANNER;
              }}
            />
            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            {/* Top Live / Format Badge */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-black text-white shadow">
              {banner.isOnline ? (
                <>
                  <Globe className="w-3 h-3 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-blue-300">Virtual Stream</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3 text-[#f9b03c]" />
                  <span className="text-[#f9b03c]">In-Person</span>
                </>
              )}
            </div>

            {/* Price Tag In Ribbon */}
            <div className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 rounded-lg bg-[#f9b03c] text-slate-950 text-[11px] font-black shadow-md">
              {isFree ? 'ነፃ (FREE)' : `${banner.price.toLocaleString()} ብር`}
            </div>
          </Link>

          {/* Middle & Right: Event Information & Action Buttons */}
          <div className="flex-1 w-full text-left">
            
            {/* Top Eyebrow Tag */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-[#f9b03c]/25 border border-[#f9b03c]/50 text-[#f9b03c] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(249,176,60,0.3)]">
                <Sparkles className="w-3 h-3 text-[#f9b03c] animate-pulse" />
                <span>ልዩ የቀጥታ ክስተት (Featured Event)</span>
              </span>
              {banner.speaker && (
                <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                  <span>ከ</span>
                  <span className="text-white font-bold">{banner.speaker}</span>
                  <span>ጋር</span>
                </span>
              )}
            </div>

            {/* Main Event Title */}
            <Link href={eventLink} className="block group/title">
              <h3 className="font-heading font-black text-lg sm:text-xl md:text-2xl text-white tracking-tight leading-snug line-clamp-2 group-hover/title:text-[#f9b03c] transition-colors mb-2">
                {banner.title}
              </h3>
            </Link>

            {/* Date, Time & Location Capsules */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-300 mb-3.5">
              {banner.date && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-[#f9b03c]" />
                  <span>{banner.date}</span>
                </div>
              )}
              {banner.time && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#f9b03c]" />
                  <span>{banner.time}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-medium truncate max-w-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{banner.location || (banner.isOnline ? 'Google Meet Online' : 'Addis Ababa')}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={eventLink}
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#ffe082] shadow-[0_0_25px_rgba(249,176,60,0.5)] hover:shadow-[0_0_35px_rgba(249,176,60,0.75)] hover:brightness-105 active:scale-95 transition-all cursor-pointer select-none"
              >
                <Ticket className="w-4 h-4 text-slate-950" />
                <span>{isFree ? 'በነፃ ይመዝገቡ (Register Free)' : 'ቲኬት ይቁረጡ (Register Now)'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </Link>

              <Link
                href={eventLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#f9b03c]/50 transition cursor-pointer"
              >
                <span>ሙሉ መረጃ ይመልከቱ</span>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
