'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { gsap } from 'gsap';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { supabase } from '@/lib/supabase/client';
import CinematicVideoModal from '@/components/CinematicVideoModal';

interface Hero3DPopoutStageProps {
  videoSrc?: string;
  initialThumbnail?: string;
}

const DEFAULT_LANDING_VIDEO = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

export default function Hero3DPopoutStage({
  videoSrc = DEFAULT_LANDING_VIDEO,
  initialThumbnail = '',
}: Hero3DPopoutStageProps) {
  const { t } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [studentCount, setStudentCount] = useState(530);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoSrc || DEFAULT_LANDING_VIDEO);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [customThumbnail, setCustomThumbnail] = useState<string>(initialThumbnail || '');

  const isInteractingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Sync prop changes from SSR into active state (Latest Video always takes priority)
  useEffect(() => {
    if (videoSrc && videoSrc.trim()) {
      setActiveVideoUrl(videoSrc.trim());
    }
  }, [videoSrc]);

  useEffect(() => {
    if (initialThumbnail && initialThumbnail.trim()) {
      setCustomThumbnail(initialThumbnail.trim());
    }
  }, [initialThumbnail]);

  // 🌟 Dynamic Landing Video Fetch from Firestore / Site Settings (Always Latest Video)
  useEffect(() => {
    let isCancelled = false;

    // Fetch from site-settings API with cache-busting
    const fetchLandingVideo = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        let fetchedUrl = '';
        let fetchedThumb = '';

        try {
          const res = await fetch(`/api/site-settings?settingKey=landing_video&_t=${Date.now()}`, {
            signal: controller.signal,
            cache: 'no-store'
          });
          if (res.ok) {
            const json = await res.json();
            fetchedUrl = json?.data?.url || json?.data?.videoUrl || json?.data?.youtubeUrl || '';
            fetchedThumb = json?.data?.landingVideoThumbnail || json?.thumbnail || json?.data?.thumbnail || json?.data?.thumbnailUrl || json?.data?.thumbUrl || json?.data?.poster || '';
          }
        } catch (e) {}

        if (!fetchedUrl) {
          try {
            const res2 = await fetch(`/api/admin/save-landing-video?_t=${Date.now()}`, { cache: 'no-store' });
            if (res2.ok) {
              const json2 = await res2.json();
              fetchedUrl = json2?.videoUrl || json2?.url || '';
              fetchedThumb = json2?.landingVideoThumbnail || json2?.thumbnail || json2?.data?.landingVideoThumbnail || json2?.data?.thumbnail || json2?.data?.thumbnailUrl || json2?.data?.poster || '';
            }
          } catch (e) {}
        }

        clearTimeout(timeoutId);

        if (fetchedUrl && typeof fetchedUrl === 'string' && fetchedUrl.trim() && !isCancelled) {
          setActiveVideoUrl(fetchedUrl.trim());
        }
        if (fetchedThumb && typeof fetchedThumb === 'string' && fetchedThumb.trim() && !isCancelled) {
          setCustomThumbnail(fetchedThumb.trim());
        }
      } catch (err) {
        // Keep activeVideoUrl as initialized from SSR
      }
    };

    fetchLandingVideo();

    // 3. Supabase Realtime WebSocket subscription on site_settings (landing_video)
    let sbChannel: any = null;
    try {
      sbChannel = supabase
        .channel('realtime_landing_video_popout')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'site_settings' },
          (payload: any) => {
            if (payload?.new && payload.new.key === 'landing_video' && !isCancelled) {
              const d = payload.new.data;
              const url = d?.url || d?.videoUrl || d?.youtubeUrl;
              const thumb = d?.landingVideoThumbnail || d?.thumbnail || d?.thumbnailUrl || d?.poster;
              if (url && typeof url === 'string' && url.trim()) {
                setActiveVideoUrl(url.trim());
              }
              if (thumb && typeof thumb === 'string' && thumb.trim()) {
                setCustomThumbnail(thumb.trim());
              }
            }
          }
        )
        .subscribe();
    } catch (e) {}

    // 4. Real-time Firestore Listeners across all valid namespaces
    let unsub1: any = null;
    let unsub2: any = null;
    let unsub3: any = null;
    let unsub4: any = null;

    const handleDocUpdate = (snap: any) => {
      if (snap.exists()) {
        const d = snap.data();
        const url = d?.url || d?.videoUrl || d?.youtubeUrl;
        const thumb = d?.landingVideoThumbnail || d?.thumbnail || d?.thumbnailUrl || d?.thumbUrl || d?.poster;
        if (url && typeof url === 'string' && url.trim() && !isCancelled) {
          setActiveVideoUrl(url.trim());
        }
        if (thumb && typeof thumb === 'string' && thumb.trim() && !isCancelled) {
          setCustomThumbnail(thumb.trim());
        }
      }
    };

    try {
      unsub1 = onSnapshot(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'landing_video'), handleDocUpdate, () => {});
      unsub2 = onSnapshot(doc(db, 'site_settings', 'landing_video'), handleDocUpdate, () => {});
      unsub3 = onSnapshot(doc(db, 'settings', 'landing_video'), handleDocUpdate, () => {});
      unsub4 = onSnapshot(doc(db, 'settings', 'landingVideo'), handleDocUpdate, () => {});
    } catch (e) {}

    // 4. Cross-tab Broadcast Channel & Custom Event Listeners
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tsehay_landing_video_channel');
        bc.onmessage = (event) => {
          if (event.data?.videoUrl) {
            setActiveVideoUrl(event.data.videoUrl);
            if (event.data.thumbnail) setCustomThumbnail(event.data.thumbnail);
          }
        };
      }
    } catch (e) {}

    const handleCustomLandingUpdate = (e: any) => {
      if (e.detail?.videoUrl) {
        setActiveVideoUrl(e.detail.videoUrl);
      }
      if (e.detail?.thumbnail) {
        setCustomThumbnail(e.detail.thumbnail);
      }
    };
    window.addEventListener('tsehay_landing_video_updated', handleCustomLandingUpdate);

    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === 'tsehay_landing_video_cache') {
        const val = localStorage.getItem('tsehay_landing_video_cache');
        if (val) setActiveVideoUrl(val);
      }
      if (!e.key || e.key === 'tsehay_landing_video_thumb') {
        const thumb = localStorage.getItem('tsehay_landing_video_thumb');
        if (thumb) setCustomThumbnail(thumb);
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLandingVideo();
      }
    };
    window.addEventListener('focus', fetchLandingVideo);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isCancelled = true;
      supabase.removeChannel(sbChannel);
      if (bc) bc.close();
      window.removeEventListener('tsehay_landing_video_updated', handleCustomLandingUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('focus', fetchLandingVideo);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // 🎬 Cinematic GSAP entrance on load: Scale 0.9 -> 1 with cubic-bezier
  useEffect(() => {
    if (stageRef.current) {
      gsap.fromTo(
        stageRef.current,
        { scale: 0.9, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.15 }
      );
    }
  }, []);

  // Parse current active video for thumbnail & playback
  const parsedVideo = parseVideoEmbedUrl(activeVideoUrl || DEFAULT_LANDING_VIDEO, false);

  // Generate YouTube Autoplay Embed URL with loop and mute enabled for browser compliance
  const ytAutoplaySrc = parsedVideo.youtubeId
    ? `https://www.youtube-nocookie.com/embed/${parsedVideo.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${parsedVideo.youtubeId}&controls=0&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3`
    : '';

  // Minimalist Play/Pause Toggle Handler (Works with YouTube postMessage and HTML5 video)
  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isPlaying) {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      } else if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } else if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Subtle Audio (Mute / Unmute) Toggle Handler
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMuted) {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [90] }), '*');
      } else if (videoRef.current) {
        videoRef.current.muted = false;
      }
      setIsMuted(false);
    } else {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: '' }), '*');
      } else if (videoRef.current) {
        videoRef.current.muted = true;
      }
      setIsMuted(true);
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  // Live student counter pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setStudentCount(prev => (prev >= 560 ? 530 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    isInteractingRef.current = true;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotX = ((y - cy) / cy) * -9.5;
    const rotY = ((x - cx) / cx) * 11.5;
    const gX = (x / rect.width) * 100;
    const gY = (y / rect.height) * 100;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (stageRef.current) {
        stageRef.current.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(circle 380px at ${gX.toFixed(1)}% ${gY.toFixed(1)}%, rgba(255,255,255,0.7) 0%, rgba(249,176,60,0.2) 50%, transparent 80%)`;
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    isInteractingRef.current = false;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (stageRef.current) {
      stageRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
  }, []);

  // Thumbnail resolver for non-direct video embeds
  const resolvedCustomThumb = customThumbnail && customThumbnail.trim() ? parseImageUrl(customThumbnail.trim()) : '';
  const displayThumbnail = 
    resolvedCustomThumb ||
    parsedVideo.thumbnailUrl || (
      parsedVideo.youtubeId 
        ? `https://img.youtube.com/vi/${parsedVideo.youtubeId}/maxresdefault.jpg`
        : '/assets/hero-bg-new.jpg'
    );

  return (
    <div 
      className="w-full max-w-5xl lg:max-w-6xl relative select-none py-4 sm:py-6"
      style={{ perspective: '1400px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 🌟 3D Holographic Backdrop Aura */}
      <div 
        className="absolute -inset-6 sm:-inset-10 rounded-[3rem] opacity-70 pointer-events-none transition-transform duration-500 ease-out"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(249,176,60,0.25) 0%, rgba(50,104,186,0.28) 45%, transparent 75%)',
          filter: 'blur(45px)',
          transform: 'translate3d(0, 0, -40px)',
        }}
      />

      {/* 🚀 Main 3D Anamorphic Tilt Rig */}
      <div
        ref={stageRef}
        className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] transition-transform duration-300 ease-out shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(0deg) rotateY(0deg)',
        }}
      >
        {/* Layer 1: Frame Glass Housing with Cyber Neon Bezel & Auto-playing Video */}
        <div 
          className="relative w-full h-[240px] sm:h-[380px] md:h-[480px] lg:h-[540px] rounded-[1.8rem] sm:rounded-[2.4rem] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/20 dark:border-[#f9b03c]/45 overflow-hidden bg-black group select-none cursor-pointer"
          style={{ transform: 'translateZ(0px)' }}
          onClick={togglePlayPause}
        >
          {/* Autoplaying Video: YouTube iframe or Direct HTML5 Video */}
          {parsedVideo.isYouTube && parsedVideo.youtubeId ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
              <iframe
                ref={iframeRef}
                src={ytAutoplaySrc}
                title="Tsehay Campus Hero Video"
                className="w-[125%] h-[125%] -mt-[6%] -ml-[12.5%] object-cover pointer-events-none border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                onLoad={() => setIsVideoReady(true)}
              />
            </div>
          ) : parsedVideo.isDirectVideo || parsedVideo.type === 'video' ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={activeVideoUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                className="w-full h-full object-cover"
                onCanPlay={() => setIsVideoReady(true)}
              />
            </div>
          ) : (
            /* High-Definition Poster Image Fallback */
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
              <img 
                src={displayThumbnail} 
                alt="Tsehay Campus Hero Preview" 
                className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => { e.currentTarget.src = '/assets/hero-bg-new.jpg'; }}
              />
            </div>
          )}

          {/* Cinematic subtle dark gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 pointer-events-none z-10" />

          {/* Dynamic 3D Specular Light Glare (Direct Ref) */}
          <div 
            ref={glareRef}
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-20 group-hover:opacity-40 transition-opacity duration-500 z-10"
            style={{
              background: 'radial-gradient(circle 380px at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(249,176,60,0.2) 50%, transparent 80%)',
            }}
          />

          {/* Paused State Subtle Central Indicator */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all duration-300 animate-in fade-in"
              onClick={togglePlayPause}
            >
              <div className="flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-black/80 border border-[#f9b03c]/50 shadow-[0_0_35px_rgba(249,176,60,0.35)] backdrop-blur-md">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-xl shadow-lg">
                  <i className="fa-solid fa-play ml-0.5"></i>
                </div>
                <span className="text-xs font-bold text-[#f9b03c] tracking-wide font-heading">ቪዲዮው ቆሟል • ለማጫወት ይጫኑ</span>
              </div>
            </div>
          )}

          {/* 🎛️ Minimalist Subtle Video Controls Bar (Bottom-Right, non-distracting) */}
          <div 
            className="absolute bottom-3.5 sm:bottom-5 right-3.5 sm:right-6 z-25 flex items-center gap-2 pointer-events-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle Minimalist Pause / Play Button */}
            <button
              type="button"
              onClick={togglePlayPause}
              className="group/btn relative px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-black/65 hover:bg-black/90 backdrop-blur-xl border border-white/20 hover:border-[#f9b03c] text-white hover:text-[#f9b03c] transition-all duration-300 flex items-center gap-2 text-xs font-bold shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer active:scale-95"
              title={isPlaying ? "ቪዲዮውን አቁም (Pause Video)" : "ቪዲዮውን አስጀምር (Play Video)"}
            >
              <i className={`fa-solid ${isPlaying ? 'fa-pause text-amber-300' : 'fa-play text-[#f9b03c]'} text-xs transition-transform group-hover/btn:scale-110`}></i>
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-tight text-white/90 group-hover/btn:text-white">
                {isPlaying ? 'አቁም' : 'አጫውት'}
              </span>
            </button>

            {/* Subtle Audio Toggle (Mute / Unmute) */}
            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/65 hover:bg-black/90 backdrop-blur-xl border border-white/20 hover:border-[#3268ba] text-white hover:text-cyan-300 transition-all duration-300 flex items-center justify-center text-xs shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer active:scale-95"
              title={isMuted ? "ድምጽ ክፈት (Unmute Sound)" : "ድምጽ አጥፋ (Mute Sound)"}
            >
              <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-slate-300' : 'fa-volume-high text-emerald-400'}`}></i>
            </button>

            {/* Subtle Fullscreen / Expand Button */}
            <button
              type="button"
              onClick={handleOpenModal}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/65 hover:bg-black/90 backdrop-blur-xl border border-white/20 hover:border-white/50 text-white hover:text-[#f9b03c] transition-all duration-300 flex items-center justify-center text-xs shadow-[0_4px_20px_rgba(0,0,0,0.6)] cursor-pointer active:scale-95"
              title="ቪዲዮውን በሙሉ ስክሪን ይመልከቱ (Expand Video)"
            >
              <i className="fa-solid fa-expand"></i>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 🎆 ANAMORPHIC DEPTH BADGES (Floating smoothly outside the frame)   */}
        {/* ------------------------------------------------------------------ */}

        {/* 1. BOTTOM-LEFT POP-OUT: ACCREDITED CERTIFICATE BADGE */}
        <div 
          className="flex absolute -bottom-5 sm:-bottom-7 -left-3 sm:-left-6 lg:-left-8 z-30 p-3 sm:p-4 rounded-2xl items-center gap-3 sm:gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-black/95 border-2 border-[#f9b03c]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.35)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto scale-90 sm:scale-100 origin-bottom-left"
          style={{
            transform: 'translate3d(0, 0, 75px)',
          }}
        >
          {/* Holographic Glowing Seal */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-lg sm:text-xl font-black shadow-[0_0_20px_rgba(249,176,60,0.6)] shrink-0 animate-pulse">
            <i className="fa-solid fa-award"></i>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-left pr-1 sm:pr-2">
            <p className="text-[9px] sm:text-[10px] text-amber-300/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              {t('practical_learning_badge') || '🎓 ከተግባራዊ ትምህርት ጋር'}
            </p>
            <p className="text-white font-black text-xs sm:text-sm tracking-tight drop-shadow-md">
              {t('recognized_cert') || 'እውቅና ያለው ሰርተፍኬት'}
            </p>
          </div>
        </div>

        {/* 2. TOP-RIGHT POP-OUT: ACTIVE STUDENTS COUNTER WITH RADAR WAVES */}
        <div 
          className="flex absolute -top-5 sm:-top-7 -right-3 sm:-right-6 lg:-right-8 z-30 p-3 sm:p-4 rounded-2xl items-center gap-3 sm:gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-[#071328]/95 border-2 border-[#3268ba]/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(50,104,186,0.45)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto scale-90 sm:scale-100 origin-top-right"
          style={{
            transform: 'translate3d(0, 0, 80px)',
          }}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#1e4585] via-[#3268ba] to-[#3a75d2] text-white flex items-center justify-center text-lg sm:text-xl font-black shadow-[0_0_20px_rgba(50,104,186,0.6)] shrink-0">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div className="text-left pr-1 sm:pr-2">
            <p className="text-[9px] sm:text-[10px] text-blue-200/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {t('students') || 'ተማሪዎች'}
            </p>
            <p className="text-white font-black text-xs sm:text-sm tracking-tight font-mono drop-shadow-md flex items-center gap-1.5">
              <span>{studentCount}+ ሰልጣኞች</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            </p>
          </div>
        </div>
      </div>

      {/* 🌟 FULL-SCREEN CINEMATIC VIDEO LIGHTBOX (100% Full-Screen Deep Void Black) */}
      <CinematicVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={activeVideoUrl}
        poster={displayThumbnail}
        title="የፀሐይ ካምፓስ መግቢያ ቪዲዮ (Tsehay Campus Introduction)"
      />
    </div>
  );
}
