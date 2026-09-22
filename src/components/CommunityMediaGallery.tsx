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
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>('masonry');

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

            {/* Foreground Photo (Respects true aspect ratio with object-contain/cover without distortion) */}
            <img
              src={parseImageUrl(item.url)}
              alt={item.title || "Tsehay Campus Community"}
              className={`relative z-10 max-h-[600px] w-auto max-w-full ${item.fit === 'contain' ? 'object-contain p-2 sm:p-4' : 'object-contain sm:object-cover sm:w-full sm:h-full'} rounded-2xl transition-transform duration-700 ease-out group-hover:scale-[1.01] drop-shadow-2xl`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/about_video_cover.jpg';
              }}
            />

            {/* Overlay Badges & Title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-6 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex items-center gap-2 text-white font-bold text-xs bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 shadow-lg">
                <i className="fa-solid fa-expand text-[#f9b03c]"></i>
                <span>{item.title || "በትልቁ ይመልከቱ (Full View)"}</span>
              </div>
              <span className="text-xs font-bold text-[#f9b03c] tracking-wider uppercase bg-black/50 backdrop-blur-xs px-3 py-1 rounded-lg border border-[#f9b03c]/30">
                Tsehay Campus
              </span>
            </div>
          </div>
        )}

        {/* Lightbox Component */}
        {renderLightbox()}
      </div>
    );
  }

  // =========================================================================
  // CASE 2+: MULTIPLE ITEMS -> UNIFIED RESPONSIVE MASONRY / GRID LAYOUT
  // Renders ALL uploaded photos & videos without any limit or truncation
  // =========================================================================
  const getContainerMaxWidth = () => {
    if (validItems.length === 2) return 'max-w-5xl';
    if (validItems.length === 3) return 'max-w-6xl';
    return 'max-w-7xl';
  };

  const getGridColumnsClass = () => {
    if (validItems.length === 2) return 'grid-cols-1 sm:grid-cols-2 gap-6';
    if (validItems.length === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6';
  };

  const getMasonryColumnsClass = () => {
    if (validItems.length === 2) return 'columns-1 sm:columns-2 gap-6';
    if (validItems.length === 3) return 'columns-1 sm:columns-2 lg:columns-3 gap-5';
    return 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5';
  };

  return (
    <div className={`${getContainerMaxWidth()} mx-auto w-full ${className} space-y-5`}>
      {/* Dynamic Header & View Mode Switcher */}
      <div className="flex items-center justify-between pb-1 px-1">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
          <i className="fa-solid fa-images text-[#f9b03c]" />
          <span>
            {validItems.length} በስልጠና ላይ ያሉ ተማሪዎች ፎቶዎች / ሚዲያዎች (Community Media)
          </span>
        </div>
        {validItems.length >= 2 && (
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('masonry')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'masonry'
                  ? 'bg-[#f9b03c] text-slate-950 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="ተለዋዋጭ አቀማመጥ (Masonry View)"
            >
              <i className="fa-solid fa-table-cells-large" />
              <span className="hidden sm:inline">ተለዋዋጭ (Masonry)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#f9b03c] text-slate-950 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="ወጥ ግሪድ (Grid View)"
            >
              <i className="fa-solid fa-grip" />
              <span className="hidden sm:inline">ወጥ ግሪድ (Grid)</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Full Array of Items */}
      {viewMode === 'masonry' ? (
        /* True Masonry: Portrait, square, and landscape photos flow naturally without cropping */
        <div className={`${getMasonryColumnsClass()} [column-fill:_balance]`}>
          {validItems.map((item, idx) => (
            <div key={item.id || idx} className="break-inside-avoid mb-5">
              {renderMediaCard(item, idx, "h-auto max-h-[580px]")}
            </div>
          ))}
        </div>
      ) : (
        /* Uniform Responsive Grid: All photos aligned */
        <div className={`grid ${getGridColumnsClass()}`}>
          {validItems.map((item, idx) => {
            const isFeatured = validItems.length >= 5 && idx === 0;
            return (
              <div
                key={item.id || idx}
                className={`${isFeatured ? 'sm:col-span-2' : ''} w-full`}
              >
                {renderMediaCard(item, idx, isFeatured ? "h-[340px] sm:h-[420px]" : "h-[280px] sm:h-[340px]")}
              </div>
            );
          })}
        </div>
      )}

      {renderLightbox()}
    </div>
  );

  // =========================================================================
  // HELPER: RENDER INDIVIDUAL MEDIA CARD
  // =========================================================================
  function renderMediaCard(item: CommunityMediaItem, idx: number, aspectClass: string) {
    const isVid = isMediaVideo(item.url);
    const parsedImg = parseImageUrl(item.url);
    const isContain = item.fit === 'contain';

    return (
      <div
        onClick={() => setActiveLightboxIndex(idx)}
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        className={`group relative w-full ${aspectClass} rounded-2xl overflow-hidden cursor-pointer shadow-xl hover:shadow-[0_15px_40px_rgba(249,176,60,0.25)] hover:border-[#f9b03c]/60 transition-all duration-500 transform hover:-translate-y-1 flex items-center justify-center bg-neutral-950`}
        title={item.title || (isVid ? "ቪዲዮውን ለማየት ይጫኑ (Click to Play)" : "በትልቁ ለማየት ይጫኑ (Click to View)")}
      >
        {/* Ambient Blurred Background (Matches photo colors & fills any ratio seamlessly) */}
        <img
          src={parsedImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />

        {/* Foreground Media Image (Respects true aspect ratio, never distorted or stretched) */}
        <img
          src={parsedImg}
          alt={item.title || `Community Media ${idx + 1}`}
          className={`relative z-10 w-full ${aspectClass.includes('h-auto') ? 'h-auto max-h-[560px]' : 'h-full'} ${isContain ? 'object-contain p-2' : 'object-cover'} transition-transform duration-700 ease-out group-hover:scale-105`}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/assets/about_video_cover.jpg';
          }}
        />

        {/* Dark Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none transition-opacity duration-300" />

        {/* Video Overlay Play Icon */}
        {isVid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-3 rounded-full bg-[#f9b03c]/30 blur-md group-hover:bg-[#f9b03c]/50 transition duration-300 animate-pulse" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fa-solid fa-play text-lg sm:text-xl ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 shadow-md">
            {isVid ? (
              <>
                <i className="fa-solid fa-video text-[#f9b03c]" />
                <span>ቪዲዮ (Video)</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-camera text-[#3268ba]" />
                <span>ምስል (Photo)</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            {isContain && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-[#f9b03c] bg-black/60 backdrop-blur-xs border border-[#f9b03c]/30">
                ሙሉ
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-white/60 bg-black/40 backdrop-blur-xs">
              #{idx + 1}
            </span>
          </div>
        </div>

        {/* Bottom Title & Action Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          <div className="max-w-[80%]">
            {item.title ? (
              <p className="text-white text-xs sm:text-sm font-bold tracking-tight truncate drop-shadow-md">
                {item.title}
              </p>
            ) : (
              <p className="text-white/80 text-xs font-medium tracking-tight">
                Tsehay Campus • ማህበረሰብ
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[#f9b03c] flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
            <i className={`fa-solid ${isVid ? 'fa-play' : 'fa-expand'}`} />
          </div>
        </div>
      </div>
    );
  }

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
