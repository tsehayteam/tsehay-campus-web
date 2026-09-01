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
}

const DEFAULT_LANDING_VIDEO = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

export default function Hero3DPopoutStage({
  videoSrc = DEFAULT_LANDING_VIDEO,
}: Hero3DPopoutStageProps) {
  const { t } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [studentCount, setStudentCount] = useState(530);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoSrc);
  const isInteractingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

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
      } catch (e) {}
    }

    // 2. Fetch from /api/admin/site-settings API
    const fetchLandingVideo = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s fail-safe timeout

        const res = await fetch('/api/admin/site-settings?settingKey=landing_video', {
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const fetchedUrl = json?.data?.url || json?.data?.videoUrl || json?.data?.youtubeUrl;
          if (fetchedUrl && typeof fetchedUrl === 'string' && fetchedUrl.trim() && !isCancelled) {
            setActiveVideoUrl(fetchedUrl.trim());
            try {
              localStorage.setItem('tsehay_landing_video_cache', fetchedUrl.trim());
            } catch (e) {}
          }
        }
      } catch (err) {
        // Fallback gracefully to default video
      }
    };

    fetchLandingVideo();

    // 3. Real-time Firestore Listeners
    let unsub1: any = null;
    let unsub2: any = null;
    let unsub3: any = null;
    try {
      unsub1 = onSnapshot(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'landing_video'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const url = d?.url || d?.videoUrl || d?.youtubeUrl;
          if (url && typeof url === 'string' && url.trim() && !isCancelled) {
            setActiveVideoUrl(url.trim());
            try {
              localStorage.setItem('tsehay_landing_video_cache', url.trim());
            } catch (e) {}
          }
        }
      }, () => {});

      unsub2 = onSnapshot(doc(db, 'settings', 'landing_video'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const url = d?.url || d?.videoUrl || d?.youtubeUrl;
          if (url && typeof url === 'string' && url.trim() && !isCancelled) {
            setActiveVideoUrl(url.trim());
            try {
              localStorage.setItem('tsehay_landing_video_cache', url.trim());
            } catch (e) {}
          }
        }
      }, () => {});

      unsub3 = onSnapshot(doc(db, 'settings', 'landingVideo'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const url = d?.url || d?.videoUrl || d?.youtubeUrl;
          if (url && typeof url === 'string' && url.trim() && !isCancelled) {
            setActiveVideoUrl(url.trim());
            try {
              localStorage.setItem('tsehay_landing_video_cache', url.trim());
            } catch (e) {}
          }
        }
      }, () => {});
    } catch (e) {}

    return () => {
      isCancelled = true;
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
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

  // Parse current active video
  const parsedVideo = parseVideoEmbedUrl(activeVideoUrl || DEFAULT_LANDING_VIDEO, false);
  const parsedModalVideo = parseVideoEmbedUrl(activeVideoUrl || DEFAULT_LANDING_VIDEO, true);
  const isDirectVideo = parsedVideo.type === 'video';

  // 🚀 Instant Video Kickstart for direct MP4 videos
  useEffect(() => {
    const video = videoRef.current;
    if (video && isDirectVideo) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      
      const attemptPlay = () => {
        const promise = video.play();
        if (promise !== undefined) {
          promise.catch(() => {
            const handleFirstTouch = () => {
              video.play().catch(() => {});
              window.removeEventListener('touchstart', handleFirstTouch);
              window.removeEventListener('scroll', handleFirstTouch);
            };
            window.addEventListener('touchstart', handleFirstTouch, { passive: true, once: true });
            window.addEventListener('scroll', handleFirstTouch, { passive: true, once: true });
          });
        }
      };

      if (video.readyState >= 2) {
        attemptPlay();
      } else {
        video.addEventListener('loadeddata', attemptPlay, { once: true });
        video.addEventListener('canplay', attemptPlay, { once: true });
      }
    }
  }, [activeVideoUrl, isDirectVideo]);

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
  const displayThumbnail = parsedVideo.thumbnailUrl || (
    parsedVideo.youtubeId 
      ? `https://img.youtube.com/vi/${parsedVideo.youtubeId}/maxresdefault.jpg`
      : '/assets/hero-bg-new.jpg'
  );

  return (
    <div 
      className="w-full max-w-4xl relative select-none py-6 sm:py-8"
      style={{ perspective: '1400px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 🌟 3D Holographic Backdrop Aura */}
      <div 
        className="absolute -inset-6 sm:-inset-10 rounded-[3rem] opacity-70 pointer-events-none transition-transform duration-500 ease-out"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(249,176,60,0.22) 0%, rgba(50,104,186,0.25) 45%, transparent 75%)',
          filter: 'blur(35px)',
          transform: 'translate3d(0, 0, -40px)',
        }}
      />

      {/* 🚀 Main 3D Anamorphic Tilt Rig */}
      <div
        ref={stageRef}
        className="relative w-full rounded-[2rem] sm:rounded-[2.4rem] transition-transform duration-300 ease-out cursor-pointer"
        onClick={() => setIsModalOpen(true)}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(0deg) rotateY(0deg)',
        }}
      >
        {/* Layer 1: Frame Glass Housing with Cyber Neon Bezel */}
        <div 
          className="relative w-full h-[220px] sm:h-[320px] md:h-[390px] lg:h-[430px] rounded-[1.8rem] sm:rounded-[2.2rem] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/20 dark:border-[#f9b03c]/40 overflow-hidden bg-black/90 group"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Main High-Definition Video or High-Res Thumbnail Feed */}
          {isDirectVideo ? (
            <video 
              ref={videoRef}
              id="hero-video" 
              autoPlay 
              loop 
              muted 
              playsInline 
              preload="metadata" 
              poster="/assets/hero-bg-new.jpg"
              disablePictureInPicture 
              controlsList="nodownload noremoteplayback" 
              onContextMenu={(e) => e.preventDefault()} 
              className="w-full h-full object-cover scale-102 group-hover:scale-105 transition-transform duration-500"
            >
              <source src={parsedVideo.src} type="video/mp4" />
            </video>
          ) : (
            <div className="relative w-full h-full overflow-hidden bg-black">
              <img 
                src={displayThumbnail} 
                alt="Tsehay Campus Hero Preview" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => { e.currentTarget.src = '/assets/hero-bg-new.jpg'; }}
              />
            </div>
          )}

          {/* Dynamic 3D Specular Light Glare (Direct Ref) */}
          <div 
            ref={glareRef}
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-40 transition-opacity duration-300"
            style={{
              background: 'radial-gradient(circle 380px at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(249,176,60,0.2) 50%, transparent 80%)',
            }}
          />

          {/* Video bottom subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

          {/* Central Inviting Golden Yellow Play Button with Magnetic Ripple */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="relative group cursor-pointer active:scale-90 transition-transform duration-300"
              title="የመግቢያ ቪዲዮውን ይመልከቱ (Watch Intro Video)"
            >
              {/* Ripple Rings */}
              <span className="absolute -inset-4 rounded-full bg-[#f9b03c]/40 animate-ping pointer-events-none" />
              <span className="absolute -inset-2 rounded-full bg-[#f9b03c]/60 blur-sm pointer-events-none" />

              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-[0_0_40px_rgba(249,176,60,0.8),0_10px_30px_rgba(0,0,0,0.8)] border-2 border-white/60 group-hover:scale-110 transition-all duration-300">
                <i className="fa-solid fa-play ml-1 group-hover:scale-110 transition-transform"></i>
              </div>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 🎆 ANAMORPHIC DEPTH BADGES (Floating smoothly outside the frame)   */}
        {/* ------------------------------------------------------------------ */}

        {/* 1. BOTTOM-LEFT POP-OUT: ACCREDITED CERTIFICATE BADGE */}
        <div 
          className="hidden sm:flex absolute -bottom-6 -left-6 lg:-left-10 z-30 p-3.5 sm:p-4 rounded-2xl items-center gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-black/95 border-2 border-[#f9b03c]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.35)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto"
          style={{
            transform: 'translate3d(0, 0, 75px)',
          }}
        >
          {/* Holographic Glowing Seal */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(249,176,60,0.6)] shrink-0 animate-pulse">
            <i className="fa-solid fa-award"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-left pr-2">
            <p className="text-[10px] text-amber-300/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              {t('practical_learning_badge') || '🎓 ከተግባራዊ ትምህርት ጋር'}
            </p>
            <p className="text-white font-black text-sm tracking-tight drop-shadow-md">
              {t('recognized_cert') || 'እውቅና ያለው ሰርተፍኬት'}
            </p>
          </div>
        </div>

        {/* 2. TOP-RIGHT POP-OUT: ACTIVE STUDENTS COUNTER WITH RADAR WAVES */}
        <div 
          className="hidden sm:flex absolute -top-6 -right-6 lg:-right-10 z-30 p-3.5 sm:p-4 rounded-2xl items-center gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-[#071328]/95 border-2 border-[#3268ba]/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(50,104,186,0.45)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto"
          style={{
            transform: 'translate3d(0, 0, 80px)',
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1e4585] via-[#3268ba] to-[#3a75d2] text-white flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(50,104,186,0.6)] shrink-0">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div className="text-left pr-2">
            <p className="text-[10px] text-blue-200/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {t('students') || 'ተማሪዎች'}
            </p>
            <p className="text-white font-black text-sm tracking-tight font-mono drop-shadow-md flex items-center gap-1.5">
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
        title="የፀሐይ ካምፓስ መግቢያ ቪዲዮ (Tsehay Campus Introduction)"
      />
    </div>
  );
}
