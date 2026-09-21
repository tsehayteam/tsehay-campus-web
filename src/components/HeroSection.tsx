"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { parseVideoUrl, extractYouTubeId, parseDropboxUrl, parseImageUrl } from "@/lib/videoParser";
import { supabase } from "@/lib/supabase/client";

interface HeroSectionProps {
  videoSrc?: string;
  videoThumbnail?: string;
}

export default function HeroSection({
  videoSrc,
  videoThumbnail
}: HeroSectionProps = {}) {
  // 1. የ Typing Animation ሎጂክ ለ STAND APART
  const fullText = "STAND APART";
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      setDisplayText((prev) =>
        isDeleting
          ? fullText.substring(0, prev.length - 1)
          : fullText.substring(0, prev.length + 1)
      );

      // የመጻፊያና የመሰረዣ ፍጥነት ማስተካከያ
      if (!isDeleting && displayText === fullText) {
        timer = setTimeout(() => setIsDeleting(true), 2500); // ቃሉ ሞልቶ ሲያበቃ ለ 2.5 ሰከንድ ቆም ይላል
        setTypingSpeed(100);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum((prev) => prev + 1);
        setTypingSpeed(150);
      } else {
        setTypingSpeed(isDeleting ? 60 : 140);
      }
    };

    timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum, typingSpeed]);

  // Video State with multi-channel live sync & cache fallback
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(() => {
    if (videoSrc && typeof videoSrc === 'string' && videoSrc.trim()) {
      return videoSrc.trim();
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_landing_video_cache');
        if (cached && typeof cached === 'string' && cached.trim()) {
          return cached.trim();
        }
      } catch (e) {}
    }
    return "https://www.youtube.com/watch?v=mgdOMtW6J8k";
  });

  const [activeThumbnail, setActiveThumbnail] = useState<string>(() => {
    if (videoThumbnail && typeof videoThumbnail === 'string' && videoThumbnail.trim()) {
      return videoThumbnail.trim();
    }
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_landing_video_thumb');
        if (cached && typeof cached === 'string' && cached.trim()) {
          return cached.trim();
        }
      } catch (e) {}
    }
    return "";
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync prop changes into state
  useEffect(() => {
    if (videoSrc && typeof videoSrc === 'string' && videoSrc.trim()) {
      setActiveVideoUrl(videoSrc.trim());
    }
  }, [videoSrc]);

  useEffect(() => {
    if (videoThumbnail && typeof videoThumbnail === 'string' && videoThumbnail.trim()) {
      setActiveThumbnail(videoThumbnail.trim());
    }
  }, [videoThumbnail]);

  // Live Admin Sync (Supabase Realtime, BroadcastChannel, CustomEvent, Storage & fail-safe API fetch)
  useEffect(() => {
    let isCancelled = false;

    // 1. Initial fail-safe API check with cache: no-store
    const fetchLandingVideo = async () => {
      try {
        let res = await fetch(`/api/admin/save-landing-video?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!res.ok) {
          res = await fetch(`/api/admin/site-settings?settingKey=landing_video&t=${Date.now()}`, { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          });
        }
        if (res.ok) {
          const json = await res.json();
          const d = json?.data || json;
          const url = d?.url || d?.videoUrl || d?.youtubeUrl;
          const thumb = d?.heroThumbnailUrl || d?.posterUrl || d?.landingVideoThumbnail || d?.thumbnail || d?.thumbnailUrl || d?.thumbUrl || d?.poster || '';
          if (!isCancelled && url && typeof url === 'string' && url.trim()) {
            setActiveVideoUrl(url.trim());
          }
          if (!isCancelled && typeof thumb === 'string') {
            setActiveThumbnail(thumb.trim());
            try {
              localStorage.setItem('tsehay_landing_video_thumb', thumb.trim());
            } catch (e) {}
          }
        }
      } catch (e) {}
    };

    fetchLandingVideo();

    // 2. Custom Event from Admin save
    const handleUpdate = (e: any) => {
      if (isCancelled) return;
      if (e.detail?.videoUrl) {
        setActiveVideoUrl(e.detail.videoUrl.trim());
      }
      const thumb = e.detail?.heroThumbnailUrl || e.detail?.posterUrl || e.detail?.thumbnail || e.detail?.landingVideoThumbnail || '';
      if (typeof thumb === 'string') {
        setActiveThumbnail(thumb.trim());
        setIsPlaying(false);
      }
    };
    window.addEventListener('tsehay_landing_video_updated', handleUpdate);

    // 3. Broadcast Channel for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tsehay_landing_video_channel');
        bc.onmessage = (ev) => {
          if (isCancelled) return;
          if (ev.data?.videoUrl) {
            setActiveVideoUrl(ev.data.videoUrl.trim());
          }
          const thumb = ev.data?.heroThumbnailUrl || ev.data?.posterUrl || ev.data?.thumbnail || ev.data?.landingVideoThumbnail || '';
          if (typeof thumb === 'string') {
            setActiveThumbnail(thumb.trim());
            setIsPlaying(false);
          }
        };
      } catch (e) {}
    }

    // 4. Supabase Realtime WebSocket subscription on site_settings
    let sbChannel: any = null;
    try {
      sbChannel = supabase
        .channel('public_site_settings_hero_landing_video')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_settings' },
          (payload: any) => {
            if (payload?.new && (payload.new.key === 'landing_video' || payload.new.setting_key === 'landing_video') && !isCancelled) {
              const d = payload.new.data;
              const url = d?.url || d?.videoUrl || d?.youtubeUrl;
              const thumb = d?.heroThumbnailUrl || d?.posterUrl || d?.landingVideoThumbnail || d?.thumbnail || d?.thumbnailUrl || d?.poster || '';
              if (url && typeof url === 'string' && url.trim()) {
                setActiveVideoUrl(url.trim());
              }
              if (typeof thumb === 'string') {
                setActiveThumbnail(thumb.trim());
                setIsPlaying(false);
              }
            }
          }
        )
        .subscribe();
    } catch (e) {}

    // 5. Storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tsehay_landing_video_cache' && e.newValue && !isCancelled) {
        setActiveVideoUrl(e.newValue.trim());
      }
      if (e.key === 'tsehay_landing_video_thumb' && !isCancelled) {
        setActiveThumbnail(e.newValue ? e.newValue.trim() : '');
        setIsPlaying(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isCancelled = true;
      window.removeEventListener('tsehay_landing_video_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
      if (sbChannel) {
        try { supabase.removeChannel(sbChannel); } catch (e) {}
      }
    };
  }, []);

  // Resolve thumbnail without any hardcoded fallback
  const resolvedThumbnailUrl = useMemo(() => {
    const raw = (activeThumbnail || '').trim();
    if (!raw) return '';
    return parseImageUrl(raw) || raw;
  }, [activeThumbnail]);

  const effectivePoster = useMemo(() => {
    if (resolvedThumbnailUrl) return resolvedThumbnailUrl;
    // Derive from YouTube if applicable
    const ytId = extractYouTubeId(activeVideoUrl);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    }
    return '';
  }, [resolvedThumbnailUrl, activeVideoUrl]);

  // 2. Dynamic Video Player Resolution (YouTube, Direct Video HTML5, or 3rd-Party Embed)
  const videoConfig = useMemo(() => {
    const raw = (activeVideoUrl || '').trim();
    if (!raw) {
      return {
        type: 'youtube' as const,
        src: `https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1${isPlaying ? '&autoplay=1' : ''}`,
        raw
      };
    }

    // A. YouTube Check (Only true YouTube URLs or pure 11-char IDs)
    const ytId = extractYouTubeId(raw);
    if (ytId) {
      return {
        type: 'youtube' as const,
        src: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1${isPlaying ? '&autoplay=1' : ''}`,
        raw
      };
    }

    // B. Direct Video File (.mp4, .webm, .mov, .ogg, .m4v, .m3u8, Supabase storage, blob:, /assets/videos/)
    const lower = raw.toLowerCase();
    const isDirect = 
      lower.endsWith('.mp4') || 
      lower.endsWith('.webm') || 
      lower.endsWith('.mov') || 
      lower.endsWith('.ogg') ||
      lower.endsWith('.m4v') ||
      lower.endsWith('.m3u8') ||
      lower.includes('.mp4?') ||
      lower.includes('.mp4#') ||
      lower.includes('.mov?') ||
      lower.includes('.webm?') ||
      lower.includes('.m3u8?') ||
      lower.includes('.m3u8#') ||
      lower.includes('/storage/v1/object/public/videos') ||
      lower.includes('/storage/v1/object/public/video') ||
      lower.includes('/assets/videos/') ||
      lower.startsWith('blob:');

    if (isDirect) {
      return {
        type: 'direct_video' as const,
        src: raw,
        raw
      };
    }

    // C. Dropbox streaming link
    if (raw.includes('dropbox.com') || raw.includes('dropboxusercontent.com')) {
      const { streamUrl } = parseDropboxUrl(raw);
      return {
        type: 'direct_video' as const,
        src: streamUrl || raw,
        raw
      };
    }

    // D. Third-Party Player Embed (Vimeo, BunnyCDN, Cloudflare Stream, Google Drive, or Custom Player iframe)
    const parsed = parseVideoUrl(raw, isPlaying);
    if (parsed.isDirectVideo) {
      return {
        type: 'direct_video' as const,
        src: parsed.src || raw,
        raw
      };
    }

    let embedSrc = parsed.src || raw;
    // For Bunny Stream or custom iframe, pass poster as query param if available
    if (effectivePoster && (embedSrc.includes('mediadelivery.net') || embedSrc.includes('bunnycdn'))) {
      if (!embedSrc.includes('poster=')) {
        embedSrc += (embedSrc.includes('?') ? '&' : '?') + `poster=${encodeURIComponent(effectivePoster)}`;
      }
    }
    if (isPlaying && !embedSrc.includes('autoplay=')) {
      embedSrc += (embedSrc.includes('?') ? '&' : '?') + 'autoplay=1';
    }

    return {
      type: 'embed' as const,
      src: embedSrc,
      raw
    };
  }, [activeVideoUrl, isPlaying, effectivePoster]);

  const handleStartPlay = () => {
    setIsPlaying(true);
    if (videoConfig.type === 'direct_video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <section className="relative overflow-hidden bg-neutral-950 pt-10 sm:pt-14 pb-14 sm:pb-20" id="home">
      {/* የጀርባ ለስላሳ ድምቀት */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80">
        <div
          className="aspect-[1155/678] w-[68rem] bg-gradient-to-tr from-[#3268ba]/20 via-[#f9b03c]/15 to-transparent opacity-40"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* ዋናው Typing Animation ስሎጋን (ያለ ምንም ሰረዝ/Cursor) */}
          <div className="min-h-[3.5rem] sm:min-h-[5rem] lg:min-h-[6rem] flex items-center justify-center">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl uppercase font-heading">
              {displayText.startsWith("STAND") ? (
                <>
                  STAND{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] to-amber-300">
                    {displayText.replace("STAND", "").trimStart()}
                  </span>
                </>
              ) : (
                displayText
              )}
            </h1>
          </div>

          {/* ንዑስ መግለጫ (ትክክለኛ ንዑስ ርዕስ መጠን ያለው) */}
          <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-xs sm:text-sm md:text-base font-normal tracking-wide text-neutral-400">
            The right skills. The right guidance. A career that sets you apart.
          </p>
        </div>

        {/* 2. የቀደመው የቪዲዮ አኒሜሽን (Restored Smooth Float/Pulse Animation) */}
        <div className="relative mx-auto mt-6 sm:mt-8 max-w-4xl lg:max-w-5xl transition-all duration-700 hover:scale-[1.01]">
          {/* የተንሳፋፊ ብርሃን አኒሜሽን (Ambient Animated Halo) */}
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#f9b03c]/20 via-[#3268ba]/20 to-[#f9b03c]/20 opacity-70 blur-xl animate-pulse" />

          {/* የቪዲዮ ፍሬም */}
          <div className="relative rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-2 shadow-2xl backdrop-blur-xl sm:p-4 transition-transform duration-500 ease-out hover:-translate-y-1">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
              {/* 1. Underlying Video Player */}
              {videoConfig.type === 'direct_video' ? (
                <video
                  ref={videoRef}
                  key={videoConfig.src}
                  className="h-full w-full object-cover"
                  src={videoConfig.src}
                  poster={effectivePoster || undefined}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <iframe
                  key={`${videoConfig.src}-${isPlaying}`}
                  className="h-full w-full object-cover"
                  src={videoConfig.src}
                  title="Tsehay Campus Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              )}

              {/* 2. Interactive Overlay Cover Image (Active until user clicks Play) */}
              {effectivePoster && !isPlaying && (
                <div
                  onClick={handleStartPlay}
                  className="absolute inset-0 z-20 w-full h-full cursor-pointer overflow-hidden bg-black flex items-center justify-center transition-all duration-500 select-none group/cover"
                  title="ቪዲዮውን ለማጫወት ይጫኑ (Click to Play Video)"
                >
                  <img
                    src={effectivePoster}
                    alt="Hero Video Thumbnail"
                    className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30 pointer-events-none" />

                  {/* Glowing Animated Play Button */}
                  <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute -inset-4 rounded-full bg-[#f9b03c]/35 blur-xl group-hover/cover:bg-[#f9b03c]/60 transition duration-500 animate-pulse" />
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 flex items-center justify-center shadow-[0_0_35px_rgba(249,176,60,0.7)] group-hover/cover:scale-110 transition-transform duration-300 border-2 border-white/50">
                        <i className="fa-solid fa-play text-xl sm:text-2xl ml-1 text-slate-950" />
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-play text-[#f9b03c]" />
                      <span>ቪዲዮውን ይመልከቱ (Watch Video)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
