"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  CommunityMediaItem, 
  normalizeCommunityMediaItems, 
  isMediaVideo, 
  parseImageUrl, 
  parseVideoEmbedUrl 
} from "@/lib/videoParser";
import { supabase } from "@/lib/supabase/client";

interface CommunityMediaGalleryProps {
  initialCommunityMedia?: CommunityMediaItem[];
  initialCommunityMediaUrl?: string;
  className?: string;
}

export default function CommunityMediaGallery({
  initialCommunityMedia,
  initialCommunityMediaUrl,
  className = ""
}: CommunityMediaGalleryProps) {
  // 1. Media List State with Multi-tier synchronization
  const [items, setItems] = useState<CommunityMediaItem[]>(() => {
    if (initialCommunityMedia && Array.isArray(initialCommunityMedia) && initialCommunityMedia.length > 0) {
      return initialCommunityMedia;
    }
    if (initialCommunityMediaUrl && typeof initialCommunityMediaUrl === 'string' && initialCommunityMediaUrl.trim()) {
      return normalizeCommunityMediaItems(initialCommunityMediaUrl);
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_about_community_media_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          const normalized = normalizeCommunityMediaItems(parsed);
          if (normalized.length > 0) return normalized;
        }
      } catch (e) {}
    }
    return [];
  });

  // Lightbox Modal State
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Sync prop changes from SSR
  useEffect(() => {
    if (initialCommunityMedia && Array.isArray(initialCommunityMedia) && initialCommunityMedia.length > 0) {
      setItems(initialCommunityMedia);
    } else if (initialCommunityMediaUrl && typeof initialCommunityMediaUrl === 'string' && initialCommunityMediaUrl.trim()) {
      setItems(normalizeCommunityMediaItems(initialCommunityMediaUrl));
    }
  }, [initialCommunityMedia, initialCommunityMediaUrl]);

  // Live Sync Listeners (BroadcastChannel, CustomEvent, Supabase Realtime, Storage, Fail-Safe API)
  useEffect(() => {
    let isCancelled = false;

    const handleUpdate = (data: any) => {
      if (!data || isCancelled) return;
      const normalized = normalizeCommunityMediaItems(data);
      if (normalized.length > 0) {
        setItems(normalized);
      }
    };

    // 1. Custom Event from Admin save
    const handleCustom = (e: any) => handleUpdate(e.detail);
    window.addEventListener('tsehay_about_community_media_updated', handleCustom);

    // 2. BroadcastChannel for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tsehay_about_community_media_channel');
        bc.onmessage = (ev) => handleUpdate(ev.data);
      } catch (e) {}
    }

    // 3. Storage Event Listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tsehay_about_community_media_cache' && e.newValue && !isCancelled) {
        try {
          const parsed = JSON.parse(e.newValue);
          const normalized = normalizeCommunityMediaItems(parsed);
          if (normalized.length > 0) setItems(normalized);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Initial Multi-Tier Fresh Fetch (Direct Supabase + API Fail-Safe)
    const fetchFresh = async () => {
      try {
        // Direct Supabase fetch for zero API gateway latency
        try {
          const { data: sbData } = await supabase
            .from('site_settings')
            .select('data')
            .eq('key', 'about_community_media')
            .maybeSingle();

          if (sbData?.data && !isCancelled) {
            const normalized = normalizeCommunityMediaItems(sbData.data);
            if (normalized.length > 0) {
              setItems(normalized);
              try {
                localStorage.setItem('tsehay_about_community_media_cache', JSON.stringify(sbData.data));
              } catch (e) {}
            }
          }
        } catch (sbErr) {}

        let res = await fetch(`/api/admin/site-settings?settingKey=about_community_media&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!res.ok) {
          res = await fetch(`/api/site-settings?settingKey=about_community_media&t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
        }
        if (res.ok) {
          const json = await res.json();
          const data = json?.data || json;
          const normalized = normalizeCommunityMediaItems(data);
          if (!isCancelled && normalized.length > 0) {
            setItems(normalized);
            try {
              localStorage.setItem('tsehay_about_community_media_cache', JSON.stringify(data));
            } catch (e) {}
          }
        }
      } catch (e) {}
    };
    fetchFresh();

    // 5. Supabase Realtime WebSocket subscription
    let sbChannel: any = null;
    try {
      sbChannel = supabase
        .channel('realtime_about_community_media_gallery')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_settings' },
          (payload: any) => {
            if (payload?.new && (payload.new.key === 'about_community_media' || payload.new.setting_key === 'about_community_media') && !isCancelled) {
              const normalized = normalizeCommunityMediaItems(payload.new.data);
              if (normalized.length > 0) {
                setItems(normalized);
                try {
                  localStorage.setItem('tsehay_about_community_media_cache', JSON.stringify(payload.new.data));
                } catch (e) {}
              }
            }
          }
        )
        .subscribe();
    } catch (e) {}

    return () => {
      isCancelled = true;
      window.removeEventListener('tsehay_about_community_media_updated', handleCustom);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
      if (sbChannel) {
        try { supabase.removeChannel(sbChannel); } catch (e) {}
      }
    };
  }, []);

  // Filter out any empty items
  const validItems = useMemo(() => {
    return items.filter(item => item && item.url && item.url.trim());
  }, [items]);

  // Lightbox Navigation Handlers
  const handlePrev = useCallback(() => {
    if (activeLightboxIndex === null || validItems.length === 0) return;
    setActiveLightboxIndex((activeLightboxIndex - 1 + validItems.length) % validItems.length);
  }, [activeLightboxIndex, validItems.length]);

  const handleNext = useCallback(() => {
    if (activeLightboxIndex === null || validItems.length === 0) return;
    setActiveLightboxIndex((activeLightboxIndex + 1) % validItems.length);
  }, [activeLightboxIndex, validItems.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (activeLightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveLightboxIndex(null);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, handlePrev, handleNext]);

  // =========================================================================
  // CASE 0: NO MEDIA SET -> LUXURY BRAND FALLBACK CARD
  // =========================================================================
  if (validItems.length === 0) {
    return (
      <div className={`max-w-4xl mx-auto w-full flex justify-center ${className}`}>
        <div
          style={{
            borderRadius: '24px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'linear-gradient(135deg, rgba(12, 17, 29, 0.95) 0%, rgba(5, 7, 13, 0.98) 100%)',
            border: '1px solid rgba(249, 176, 60, 0.3)',
          }}
          className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[24px] overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center p-6 sm:p-10 text-center transition-all duration-500 hover:border-[#f9b03c]/60 hover:shadow-[0_20px_55px_rgba(249,176,60,0.25)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(249,176,60,0.15)_0%,transparent_65%)] pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#3268ba]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#f9b03c]/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 mb-4 sm:mb-5">
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-2 rounded-2xl bg-[#f9b03c]/20 blur-md pointer-events-none"></span>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#111625] via-slate-900 to-black border-2 border-[#f9b03c]/50 flex items-center justify-center text-[#f9b03c] text-2xl sm:text-3xl shadow-[0_0_30px_rgba(249,176,60,0.35)]">
                <i className="fa-solid fa-camera-retro"></i>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold shadow-[0_0_15px_rgba(249,176,60,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping" />
              <span>Tsehay Campus Community</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight">
              የስልጠና ማህበረሰብ እና የተማሪዎች ትስስር
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed">
              በፀሐይ ካምፓስ የተማሪዎች ማህበረሰብ የሚዘጋጁ ዝግጅቶች፣ የልምድ ልውውጦች እና የስልጠና እንቅስቃሴዎች።
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 1: EXACTLY 1 ITEM -> FULL SPOTLIGHT DISPLAY (PORTRAIT / SQUARE / LANDSCAPE)
  // =========================================================================
  if (validItems.length === 1) {
    const item = validItems[0];
    const isVid = isMediaVideo(item.url);

    return (
      <div className={`max-w-4xl mx-auto w-full ${className}`}>
        {isVid ? (
          <div className="relative w-full aspect-video sm:aspect-[21/9] rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-2 border-[#f9b03c]/35 bg-black">
            {(() => {
              const parsed = parseVideoEmbedUrl(item.url, false);
              return parsed.type === 'video' ? (
                <video
                  controls
                  playsInline
                  src={parsed.src}
                  className="w-full h-full object-cover rounded-[22px]"
                />
              ) : (
                <iframe
                  src={parsed.src}
                  title={item.title || "Tsehay Campus Community Video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-[22px]"
                />
              );
            })()}
          </div>
        ) : (
          <div
            onClick={() => setActiveLightboxIndex(0)}
            className="group relative w-full min-h-[360px] sm:min-h-[460px] max-h-[640px] rounded-[24px] overflow-hidden cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.7)] border-2 border-[#f9b03c]/30 hover:border-[#f9b03c]/70 bg-neutral-950 transition-all duration-500 hover:scale-[1.008] flex items-center justify-center"
            title="በትልቁ ለማየት ይጫኑ (Click to view full image)"
          >
            {/* Ambient Blurred Backdrop (Ensures zero dead space for portrait, square, or wide photos) */}
            <img
              src={parseImageUrl(item.url)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-none" />

            {/* Foreground Photo (Full uncropped image display with object-contain) */}
            <img
              src={parseImageUrl(item.url)}
              alt={item.title || "Tsehay Campus Community"}
              className="relative z-10 max-h-[560px] w-auto max-w-full object-contain p-2 sm:p-4 rounded-2xl transition-transform duration-700 ease-out group-hover:scale-[1.01] drop-shadow-2xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/about_video_cover.jpg';
              }}
            />

            {/* Optional Caption on Hover */}
            {item.title && (
              <div className="absolute inset-x-0 bottom-0 z-20 p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <p className="text-white text-sm sm:text-base font-bold tracking-tight truncate drop-shadow-md">
                  {item.title}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lightbox Component */}
        {renderLightbox()}
      </div>
    );
  }

  // Active Slide State for 3D Coverflow Slider
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const handlePrevSlide = useCallback(() => {
    if (validItems.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);

  const handleNextSlide = useCallback(() => {
    if (validItems.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % validItems.length);
  }, [validItems.length]);

  // Smooth Autoplay with pause on hover & touch interaction
  useEffect(() => {
    if (isPaused || validItems.length <= 1) return;
    const timer = setInterval(() => {
      handleNextSlide();
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused, validItems.length, handleNextSlide]);

  // Circular distance helper for infinite carousel math
  const getSlideDiff = useCallback((index: number, active: number, total: number) => {
    if (total <= 1) return 0;
    let diff = (index - active) % total;
    while (diff < -total / 2) diff += total;
    while (diff > total / 2) diff -= total;
    return diff;
  }, []);

  // Touch & Swipe Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setTouchStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    setDragOffset(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null) {
      if (dragOffset < -40) {
        handleNextSlide();
      } else if (dragOffset > 40) {
        handlePrevSlide();
      }
    }
    setTouchStartX(null);
    setDragOffset(0);
    setTimeout(() => setIsPaused(false), 2500);
  };

  // Desktop Mouse Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPaused(true);
    setTouchStartX(e.clientX);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || touchStartX === null) return;
    setDragOffset(e.clientX - touchStartX);
  };

  const handleMouseUp = () => {
    if (isDragging && touchStartX !== null) {
      if (dragOffset < -50) {
        handleNextSlide();
      } else if (dragOffset > 50) {
        handlePrevSlide();
      }
    }
    setIsDragging(false);
    setTouchStartX(null);
    setDragOffset(0);
    setIsPaused(false);
  };

  // Card click handler: center card opens lightbox, side cards rotate slider
  const handleCardClick = (idx: number) => {
    if (Math.abs(dragOffset) > 15) return;
    const diff = getSlideDiff(idx, activeIndex, validItems.length);
    if (diff === 0) {
      setActiveLightboxIndex(idx);
    } else {
      setActiveIndex(idx);
    }
  };

  // Compute 3D Coverflow transform, depth, perspective, and lighting for each slide
  const getSlideStyle = (idx: number): React.CSSProperties => {
    const diff = getSlideDiff(idx, activeIndex, validItems.length);
    const isCenter = diff === 0;
    const isAdjacent = Math.abs(diff) === 1;
    const isOuter = Math.abs(diff) === 2;

    let xOffsetPercent = 0;
    let xOffsetPx = 0;
    let rotateY = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 10;
    let brightness = 1;

    if (isCenter) {
      xOffsetPx = isDragging || touchStartX !== null ? dragOffset * 0.45 : 0;
      scale = 1.05;
      rotateY = isDragging || touchStartX !== null ? dragOffset * -0.04 : 0;
      opacity = 1;
      zIndex = 30;
      brightness = 1;
    } else if (isAdjacent) {
      const dir = diff > 0 ? 1 : -1;
      xOffsetPercent = dir * 64;
      scale = 0.88;
      rotateY = dir * -16;
      opacity = 0.72;
      zIndex = 20;
      brightness = 0.85;
    } else if (isOuter) {
      const dir = diff > 0 ? 1 : -1;
      xOffsetPercent = dir * 115;
      scale = 0.72;
      rotateY = dir * -24;
      opacity = 0.32;
      zIndex = 10;
      brightness = 0.55;
    } else {
      const dir = diff > 0 ? 1 : -1;
      xOffsetPercent = dir * 160;
      scale = 0.5;
      rotateY = dir * -30;
      opacity = 0;
      zIndex = 1;
    }

    return {
      transform: `translate(-50%, -50%) translateX(${xOffsetPercent}%) translateX(${xOffsetPx}px) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      filter: `brightness(${brightness})`,
      pointerEvents: (isCenter || isAdjacent) ? 'auto' : 'none',
      transition: isDragging || touchStartX !== null ? 'none' : 'all 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
      cursor: 'pointer'
    };
  };

  return (
    <div 
      className={`relative max-w-6xl mx-auto w-full select-none ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { setIsPaused(false); setIsDragging(false); }}
    >
      {/* 3D Stage Container (Optimized height for zero top dead space) */}
      <div 
        className="relative w-full h-[320px] sm:h-[390px] md:h-[450px] lg:h-[490px] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Ambient Stage Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-[radial-gradient(circle_at_50%_50%,rgba(249,176,60,0.12)_0%,transparent_70%)] pointer-events-none blur-3xl" />

        {/* 3D Coverflow Slides */}
        {validItems.map((item, idx) => {
          const style = getSlideStyle(idx);
          const isCenter = getSlideDiff(idx, activeIndex, validItems.length) === 0;
          const isVid = isMediaVideo(item.url);
          const parsedImg = parseImageUrl(item.url);

          return (
            <div
              key={item.id || idx}
              style={style}
              onClick={() => handleCardClick(idx)}
              className={`absolute top-1/2 left-1/2 w-[270px] sm:w-[370px] md:w-[460px] lg:w-[520px] h-[300px] sm:h-[370px] md:h-[430px] lg:h-[470px] rounded-[24px] sm:rounded-[28px] overflow-hidden transition-all flex items-center justify-center bg-slate-950/95 ${
                isCenter 
                  ? 'border-2 border-[#f9b03c]/90 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(249,176,60,0.35)]' 
                  : 'border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.7)]'
              }`}
              title={isCenter ? "በትልቁ ለማየት ይጫኑ (Click to View Fullscreen)" : "ይህንን ለማየት ይጫኑ (Click to Select)"}
            >
              {/* Ambient Blurred Background (fills any shape/orientation seamlessly) */}
              <img
                src={parsedImg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none"
              />
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />

              {/* Foreground Photo (Full uncropped image display with object-contain on all devices) */}
              <img
                src={parsedImg}
                alt={item.title || `Community Photo ${idx + 1}`}
                className="relative z-10 w-full h-full object-contain p-2 sm:p-3 rounded-[22px] sm:rounded-[26px] select-none pointer-events-none drop-shadow-md"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/about_video_cover.jpg';
                }}
              />

              {/* Video Play Indicator */}
              {isVid && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute -inset-3 rounded-full bg-[#f9b03c]/30 blur-md animate-pulse" />
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                      <i className="fa-solid fa-play text-lg sm:text-xl ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Active Center Subtle Title Pill */}
              {isCenter && item.title && (
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                  <p className="text-white text-xs sm:text-sm font-bold tracking-tight truncate drop-shadow-md text-center">
                    {item.title}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Navigation Arrow Left */}
        {validItems.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
            className="absolute left-2 sm:left-6 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-300 cursor-pointer backdrop-blur-md group"
            title="የቀደመው (Previous)"
            aria-label="Previous Slide"
          >
            <i className="fa-solid fa-chevron-left text-sm sm:text-base group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Navigation Arrow Right */}
        {validItems.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
            className="absolute right-2 sm:right-6 z-40 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-950/80 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-300 cursor-pointer backdrop-blur-md group"
            title="ቀጣይ (Next)"
            aria-label="Next Slide"
          >
            <i className="fa-solid fa-chevron-right text-sm sm:text-base group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Pagination Dots */}
      {validItems.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {validItems.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`transition-all duration-300 cursor-pointer ${
                i === activeIndex
                  ? 'w-8 sm:w-10 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_12px_rgba(249,176,60,0.6)]'
                  : 'w-2.5 h-2.5 rounded-full bg-white/25 hover:bg-white/50'
              }`}
              title={`ወደ ፎቶ ${i + 1} ሂድ`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Fullview Lightbox Modal */}
      {renderLightbox()}
    </div>
  );

  // =========================================================================
  // HELPER: RENDER LIGHTBOX MODAL
  // =========================================================================
  function renderLightbox() {
    if (activeLightboxIndex === null || !validItems[activeLightboxIndex]) return null;

    const currentItem = validItems[activeLightboxIndex];
    const isVid = isMediaVideo(currentItem.url);

    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        onClick={() => setActiveLightboxIndex(null)}
      >
        <div
          className="relative max-w-5xl w-full bg-slate-900/90 rounded-2xl overflow-hidden border border-[#f9b03c]/40 shadow-[0_0_60px_rgba(249,176,60,0.25)] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 bg-slate-950/80">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-[#f9b03c] flex items-center gap-2">
                <i className={`fa-solid ${isVid ? 'fa-video' : 'fa-camera-retro'}`} />
                <span>{currentItem.title || "የስልጠና ማህበረሰብ • Campus Community"}</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded">
                {activeLightboxIndex + 1} / {validItems.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveLightboxIndex(null)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close"
              title="ዝጋ (Close)"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>

          {/* Body Stage */}
          <div className="relative flex items-center justify-center bg-black min-h-[50vh] max-h-[78vh] overflow-hidden p-2 sm:p-4">
            {isVid ? (
              <div className="relative w-full aspect-video max-h-[75vh]">
                {(() => {
                  const parsed = parseVideoEmbedUrl(currentItem.url, true);
                  return parsed.type === 'video' ? (
                    <video
                      controls
                      autoPlay
                      playsInline
                      src={parsed.src}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <iframe
                      src={parsed.src}
                      title={currentItem.title || "Community Video"}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-xl"
                    />
                  );
                })()}
              </div>
            ) : (
              <img
                src={parseImageUrl(currentItem.url)}
                alt={currentItem.title || "Community Photo High-Res"}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl select-none"
              />
            )}

            {/* Navigation Arrows (if > 1 item) */}
            {validItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/20 hover:border-[#f9b03c] flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer"
                  title="የቀደመው (Previous)"
                >
                  <i className="fa-solid fa-chevron-left text-sm" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/20 hover:border-[#f9b03c] flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer"
                  title="ቀጣይ (Next)"
                >
                  <i className="fa-solid fa-chevron-right text-sm" />
                </button>
              </>
            )}
          </div>

          {/* Footer Bar */}
          {currentItem.title && (
            <div className="px-5 py-2.5 bg-slate-950/90 border-t border-white/10 text-center">
              <p className="text-xs sm:text-sm text-neutral-300 font-medium">
                {currentItem.title}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
}
