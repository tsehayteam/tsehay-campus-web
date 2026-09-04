'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { gsap } from 'gsap';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
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
  const [studentCount, setStudentCount] = useState(530);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoSrc);
  const [customThumbnail, setCustomThumbnail] = useState<string>(() => {
    if (initialThumbnail && initialThumbnail.trim()) return initialThumbnail.trim();
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tsehay_landing_video_thumb') || '';
      } catch (e) {}
    }
    return '';
  });
  const isInteractingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Sync prop changes from SSR into active state
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

  // 🌟 Dynamic Landing Video Fetch from Firestore / Site Settings with graceful fallback
  useEffect(() => {
    let isCancelled = false;

    // 1. Check local cache first for zero latency
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_landing_video_cache');
        if (cached && cached.trim()) {
          setActiveVideoUrl(cached.trim());
        }
        const cachedThumb = localStorage.getItem('tsehay_landing_video_thumb');
        if (cachedThumb && cachedThumb.trim()) {
          setCustomThumbnail(cachedThumb.trim());
        }
      } catch (e) {}
    }

    // 2. Fetch from /api/admin/site-settings API
    const fetchLandingVideo = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s fail-safe timeout

        let fetchedUrl = '';
        let fetchedThumb = '';

        try {
          const res = await fetch('/api/admin/site-settings?settingKey=landing_video', {
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
            const res2 = await fetch('/api/admin/save-landing-video', { cache: 'no-store' });
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
          try {
            localStorage.setItem('tsehay_landing_video_cache', fetchedUrl.trim());
          } catch (e) {}
        }
        if (fetchedThumb && typeof fetchedThumb === 'string' && fetchedThumb.trim() && !isCancelled) {
          setCustomThumbnail(fetchedThumb.trim());
          try {
            localStorage.setItem('tsehay_landing_video_thumb', fetchedThumb.trim());
          } catch (e) {}
        }
      } catch (err) {
        // Fallback gracefully to default video
      }
    };

    fetchLandingVideo();

    // 3. Real-time Firestore Listeners across all valid namespaces
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
          try {
            localStorage.setItem('tsehay_landing_video_cache', url.trim());
          } catch (e) {}
        }
        if (thumb && typeof thumb === 'string' && thumb.trim() && !isCancelled) {
          setCustomThumbnail(thumb.trim());
          try {
            localStorage.setItem('tsehay_landing_video_thumb', thumb.trim());
          } catch (e) {}
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

    return () => {
      isCancelled = true;
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
      if (unsub4) unsub4();
      if (bc) bc.close();
      window.removeEventListener('tsehay_landing_video_updated', handleCustomLandingUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
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

  // Parse current active video for thumbnail & modal playback
  const parsedVideo = parseVideoEmbedUrl(activeVideoUrl || DEFAULT_LANDING_VIDEO, false);

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
        className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] transition-transform duration-300 ease-out cursor-pointer shadow-[0_30px_100px_rgba(0,0,0,0.9)]"
        onClick={() => setIsModalOpen(true)}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(0deg) rotateY(0deg)',
        }}
      >
        {/* Layer 1: Frame Glass Housing with Cyber Neon Bezel */}
        <div 
          className="relative w-full h-[240px] sm:h-[380px] md:h-[480px] lg:h-[540px] rounded-[1.8rem] sm:rounded-[2.4rem] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/20 dark:border-[#f9b03c]/45 overflow-hidden bg-black group"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Static High-Definition Poster Image (No autoplay on load) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
            <img 
              src={displayThumbnail} 
              alt="Tsehay Campus Hero Preview" 
              className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
              onError={(e) => { e.currentTarget.src = '/assets/hero-bg-new.jpg'; }}
            />
            {/* Cinematic subtle dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40 group-hover:via-black/20 transition-all duration-500 pointer-events-none" />
          </div>

          {/* Dynamic 3D Specular Light Glare (Direct Ref) */}
          <div 
            ref={glareRef}
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-30 group-hover:opacity-60 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle 380px at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(249,176,60,0.2) 50%, transparent 80%)',
            }}
          />

          {/* Golden Yellow Play Button (Subtle initially, smoothly fades in & pulses on hover) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative flex items-center justify-center opacity-40 sm:opacity-50 scale-95 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 ease-out">
              {/* Pulsing Ripple Rings on Hover */}
              <span className="absolute -inset-4 rounded-full bg-[#f9b03c]/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-500 pointer-events-none" />
              <span className="absolute -inset-2 rounded-full bg-[#f9b03c]/50 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div 
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-[0_0_40px_rgba(249,176,60,0.8),0_10px_30px_rgba(0,0,0,0.8)] border-2 border-white/80 group-hover:shadow-[0_0_55px_rgba(249,176,60,1)] transition-all duration-500 cursor-pointer"
                title="የመግቢያ ቪዲዮውን ይመልከቱ (Watch Intro Video)"
              >
                <i className="fa-solid fa-play ml-1 text-slate-950 group-hover:scale-110 transition-transform duration-300"></i>
              </div>
            </div>
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
