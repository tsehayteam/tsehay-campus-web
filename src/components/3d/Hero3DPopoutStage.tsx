'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { gsap } from 'gsap';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';
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

  const [studentCount, setStudentCount] = useState(500);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(videoSrc || DEFAULT_LANDING_VIDEO);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [showInitialThumbnail, setShowInitialThumbnail] = useState<boolean>(true);
  const [customThumbnail, setCustomThumbnail] = useState<string>(initialThumbnail || '');
  const [siteOrigin, setSiteOrigin] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  });

  // Synchronized refs for zero-latency instant video control and scroll auto-pause
  const isPlayingRef = useRef<boolean>(true);
  const isMutedRef = useRef<boolean>(false);
  const wasAutoPausedByScrollRef = useRef<boolean>(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ⚡ Instant YouTube Player State Synchronization via Window Message Events
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_) {}
        }
        if (data && typeof data === 'object') {
          // YouTube API onStateChange: 1 = Playing, 2 = Paused, 0 = Ended
          const info = data.info;
          const state = typeof info === 'number' ? info : info?.playerState;
          if (state === 1) {
            isPlayingRef.current = true;
            setIsPlaying(true);
          } else if (state === 2 || state === 0) {
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, []);

  // 3D Glassmorphic Flash Pop Feedback State
  const [flashAction, setFlashAction] = useState<'play' | 'pause' | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isInteractingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  const triggerFlashFeedback = (action: 'play' | 'pause') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashAction(action);
    flashTimerRef.current = setTimeout(() => {
      setFlashAction(null);
    }, 950);
  };



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

  // Generate YouTube Autoplay Embed URL with loop and mute enabled for browser compliance & 4K UHD preference
  const ytAutoplaySrc = parsedVideo.youtubeId
    ? `https://www.youtube.com/embed/${parsedVideo.youtubeId}?autoplay=1&mute=0&loop=1&playlist=${parsedVideo.youtubeId}&controls=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(siteOrigin || 'http://localhost:3000')}&rel=0&modestbranding=1&iv_load_policy=3&vq=hd2160&quality=hd2160&hd=1`
    : '';

  // Execute instant pause with zero delay
  const executePause = useCallback((byScroll = false) => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (byScroll) {
      wasAutoPausedByScrollRef.current = true;
    } else {
      wasAutoPausedByScrollRef.current = false;
    }

    if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [parsedVideo.isYouTube]);

  // Execute instant play with zero delay
  const executePlay = useCallback((isScrollResume = false) => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    wasAutoPausedByScrollRef.current = false;

    if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
      if (!isMutedRef.current) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
      }
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
    } else if (videoRef.current) {
      videoRef.current.muted = isMutedRef.current;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
    }
  }, [parsedVideo.isYouTube]);

  // 100% Functional Zero-Latency Interactive Play/Pause Toggle Handler
  const togglePlayPause = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isPlayingRef.current) {
      executePause(false);
      triggerFlashFeedback('pause');
    } else {
      executePlay(false);
      triggerFlashFeedback('play');
    }
  }, [executePause, executePlay]);

  // 🚀 Guaranteed Immediate Video Auto-play & Viewport Sync for Audio Ducking + Scroll Auto-Pause
  useEffect(() => {
    // Strictly Gatekeep Playback: Only trigger immediate play if preloader is already finished
    const hasPreloaderFinished = typeof window !== 'undefined' && !document.documentElement.classList.contains('tsehay-loading') && sessionStorage.getItem('tsehay_preloader_seen') === 'true';
    let playTimer: NodeJS.Timeout | null = null;
    if (hasPreloaderFinished) {
      executePlay(false);
      playTimer = setTimeout(() => executePlay(false), 300);
      setShowInitialThumbnail(false);
    }

    // Preloader reveal event: kick off video immediately and only when preloader reaches 100%
    const onPreloaderComplete = () => {
      setShowInitialThumbnail(false);
      executePlay(false);
      setTimeout(() => executePlay(false), 150);
      setTimeout(() => executePlay(false), 500);
      // Immediately notify ambient audio to remain silent while hero video is on screen
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: true, hasSound: true }
        })
      );
    };
    window.addEventListener('tsehay-preloader-complete', onPreloaderComplete);

    // Browser policy gesture fallback: kick off autoplay on first interaction
    const onUserGesture = () => {
      setShowInitialThumbnail(false);
      executePlay(false);
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: true, hasSound: true }
        })
      );
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('scroll', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
    };

    window.addEventListener('pointerdown', onUserGesture, { once: true, passive: true });
    window.addEventListener('scroll', onUserGesture, { once: true, passive: true });
    window.addEventListener('keydown', onUserGesture, { once: true, passive: true });

    // 🎧 Viewport IntersectionObserver to trigger Audio Ducking & Scroll-based Auto Pause/Resume
    let observer: IntersectionObserver | null = null;
    if (stageRef.current && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;

          if (!inView) {
            // Viewport Scroll Auto-Pause: pause when scrolled out of view
            if (isPlayingRef.current) {
              executePause(true); // true = paused by scroll
            }
            window.dispatchEvent(
              new CustomEvent('tsehay-hero-video-inview', {
                detail: { inView: false, hasSound: false }
              })
            );
          } else {
            // Viewport Scroll Auto-Resume: resume when scrolled back into view if paused by scroll
            if (wasAutoPausedByScrollRef.current && !isPlayingRef.current) {
              executePlay(true);
            }
            window.dispatchEvent(
              new CustomEvent('tsehay-hero-video-inview', {
                detail: { inView: true, hasSound: isPlayingRef.current && !isMutedRef.current }
              })
            );
          }
        },
        { threshold: [0, 0.2, 0.5, 0.8] }
      );
      observer.observe(stageRef.current);
    }

    return () => {
      if (playTimer) clearTimeout(playTimer);
      window.removeEventListener('tsehay-preloader-complete', onPreloaderComplete);
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('scroll', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
      if (observer) observer.disconnect();
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: false, hasSound: false }
        })
      );
    };
  }, [activeVideoUrl, parsedVideo.isYouTube, parsedVideo.youtubeId, siteOrigin, executePlay, executePause]);

  // Subtle Audio (Mute / Unmute) Toggle Handler with Universal Ducking
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMuted) {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
      } else if (videoRef.current) {
        videoRef.current.muted = false;
      }
      setIsMuted(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
      }
    } else {
      if (parsedVideo.isYouTube && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
      } else if (videoRef.current) {
        videoRef.current.muted = true;
      }
      setIsMuted(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
      }
    }
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
      window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
    }
  };

  // Live student counter pulse (500+)
  useEffect(() => {
    const interval = setInterval(() => {
      setStudentCount(prev => (prev >= 520 ? 500 : prev + 1));
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
          className="relative w-full aspect-video rounded-[1.8rem] sm:rounded-[2.4rem] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/20 dark:border-[#f9b03c]/45 overflow-hidden bg-black group select-none cursor-pointer touch-manipulation"
          style={{ transform: 'translateZ(0px)' }}
          onClick={togglePlayPause}
        >
          {/* Autoplaying Video: YouTube iframe, Bunny.net / Other Embed iframe, or Direct HTML5 Video */}
          {parsedVideo.isYouTube && parsedVideo.youtubeId ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
              <iframe
                ref={iframeRef}
                src={ytAutoplaySrc}
                title="Tsehay Campus Hero Video"
                className="w-full h-full object-cover pointer-events-none border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={() => {
                  setIsVideoReady(true);
                  setIsPlaying(true);
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'listening', id: parsedVideo.youtubeId }),
                      '*'
                    );
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['hd2160'] }),
                      '*'
                    );
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                      '*'
                    );
                  }
                  // Signal 4K pre-buffered readiness to preloader
                  window.dispatchEvent(new CustomEvent('tsehay-4k-video-buffered'));
                }}
              />
            </div>
          ) : parsedVideo.type === 'embed' && parsedVideo.src ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
              <iframe
                ref={iframeRef}
                src={parsedVideo.src}
                title="Tsehay Campus Hero Video"
                className="w-full h-full border-0 object-cover"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                onLoad={() => {
                  setIsVideoReady(true);
                  setIsPlaying(true);
                  window.dispatchEvent(new CustomEvent('tsehay-4k-video-buffered'));
                }}
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
                preload="auto"
                className="w-full h-full object-cover"
                onCanPlay={() => {
                  setIsVideoReady(true);
                  setIsPlaying(true);
                  if (videoRef.current) {
                    videoRef.current.muted = isMuted;
                    videoRef.current.play().catch(() => {});
                  }
                  window.dispatchEvent(new CustomEvent('tsehay-4k-video-buffered'));
                }}
                onCanPlayThrough={() => {
                  window.dispatchEvent(new CustomEvent('tsehay-4k-video-buffered'));
                }}
              />
            </div>
          ) : null}

          {/* Clean Initial Thumbnail Layer: Displayed for first 2.6s, smoothly fades out with ZERO control buttons */}
          <div 
            className={`absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center transition-opacity duration-700 ease-out z-15 ${
              showInitialThumbnail ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={togglePlayPause}
          >
            <img 
              src={displayThumbnail} 
              alt="Tsehay Campus Hero Preview" 
              className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
              onError={(e) => { e.currentTarget.src = '/assets/hero-bg-new.jpg'; }}
            />
          </div>

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


          {/* 🌟 3D Glassmorphic Flash Pop Feedback Animation */}
          {flashAction && (
            <div 
              key={flashAction + '_' + Date.now()}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              style={{ transform: 'translateZ(90px)' }}
            >
              <div className="flex flex-col items-center justify-center w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-[#040814]/85 backdrop-blur-2xl border-2 border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(249,176,60,0.45)] animate-[flashPop_0.95s_cubic-bezier(0.16,1,0.3,1)_forwards]">
                {flashAction === 'pause' ? (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(249,176,60,0.5)]">
                      <i className="fa-solid fa-pause text-2xl sm:text-4xl text-[#f9b03c] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
                    </div>
                    <span className="mt-2.5 font-heading font-black text-[11px] sm:text-xs text-white uppercase tracking-wider drop-shadow-md">
                      ተቋርጧል
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(52,211,153,0.5)]">
                      <i className="fa-solid fa-play text-2xl sm:text-4xl text-emerald-400 translate-x-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
                    </div>
                    <span className="mt-2.5 font-heading font-black text-[11px] sm:text-xs text-white uppercase tracking-wider drop-shadow-md">
                      እየተጫወተ ነው
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ⏸️ / ▶️ Persistent 3D Glassmorphic Center Play/Pause Button */}
          <div 
            className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
            style={{ transform: 'translateZ(60px)' }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause(e);
              }}
              aria-label={isPlaying ? "ቪዲዮውን አቁም (Pause Video)" : "ቪዲዮውን አስጀምር (Play Video)"}
              className={`pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-2xl border-2 border-white/30 hover:border-[#f9b03c] text-white hover:text-[#f9b03c] shadow-[0_15px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(249,176,60,0.35)] transition-all duration-200 flex items-center justify-center cursor-pointer active:scale-90 hover:scale-110 ${
                isPlaying 
                  ? 'opacity-0 group-hover:opacity-90 group-focus-within:opacity-90' 
                  : 'opacity-100 ring-4 ring-[#f9b03c]/40 animate-pulse'
              }`}
            >
              {isPlaying ? (
                <i className="fa-solid fa-pause text-xl sm:text-2xl text-white/90 drop-shadow-md"></i>
              ) : (
                <i className="fa-solid fa-play text-xl sm:text-2xl text-[#f9b03c] translate-x-0.5 drop-shadow-md"></i>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 🎆 ANAMORPHIC DEPTH BADGES (Floating smoothly outside the frame)   */}
        {/* ------------------------------------------------------------------ */}

        {/* 1. BOTTOM-LEFT POP-OUT: ACCREDITED CERTIFICATE BADGE (Strictly Contained Inside Box Boundaries) */}
        <div 
          className="flex absolute bottom-2.5 xs:bottom-3 sm:bottom-4 left-2.5 xs:left-3 sm:left-4 z-30 p-1.5 xs:p-2 sm:p-3 rounded-xl sm:rounded-2xl items-center gap-2 sm:gap-3 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-black/95 border border-[#f9b03c]/60 shadow-[0_12px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(249,176,60,0.25)] backdrop-blur-2xl transition-transform duration-300 pointer-events-auto origin-bottom-left max-w-[calc(100%-1.5rem)] sm:max-w-xs"
          style={{
            transform: 'translate3d(0, 0, 75px)',
          }}
        >
          {/* Holographic Glowing Seal */}
          <div className="relative w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-xs xs:text-sm sm:text-lg font-black shadow-[0_0_15px_rgba(249,176,60,0.5)] shrink-0 animate-pulse">
            <i className="fa-solid fa-award"></i>
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full border border-slate-950 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-left pr-1 sm:pr-2 min-w-0">
            <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-amber-300/90 font-mono font-bold uppercase tracking-wider leading-none mb-0.5 sm:mb-1 flex items-center gap-1 truncate">
              {t('practical_learning_badge') || '🎓 ከተግባራዊ ትምህርት ጋር'}
            </p>
            <p className="text-white font-black text-[10px] xs:text-xs sm:text-sm tracking-tight drop-shadow-md truncate">
              {t('recognized_cert') || 'እውቅና ያለው ሰርተፍኬት'}
            </p>
          </div>
        </div>

        {/* 2. TOP-RIGHT POP-OUT: ACTIVE STUDENTS COUNTER WITH RADAR WAVES (Responsive Mobile Scaling) */}
        <div 
          className="flex absolute top-2.5 xs:top-3 sm:-top-5 right-2.5 xs:right-3 sm:-right-4 lg:-right-6 z-30 p-1.5 xs:p-2 sm:p-3 rounded-xl sm:rounded-2xl items-center gap-2 sm:gap-3 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-[#071328]/95 border sm:border-2 border-[#3268ba]/70 shadow-[0_12px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(50,104,186,0.3)] backdrop-blur-2xl transition-transform duration-300 pointer-events-auto origin-top-right max-w-[calc(100%-1.5rem)] sm:max-w-none"
          style={{
            transform: 'translate3d(0, 0, 80px)',
          }}
        >
          <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#1e4585] via-[#3268ba] to-[#3a75d2] text-white flex items-center justify-center text-xs xs:text-sm sm:text-lg font-black shadow-[0_0_15px_rgba(50,104,186,0.5)] shrink-0">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div className="text-left pr-1 sm:pr-2 min-w-0">
            <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-blue-200/90 font-mono font-bold uppercase tracking-wider leading-none mb-0.5 sm:mb-1 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {t('students') || 'ተማሪዎች'}
            </p>
            <p className="text-white font-black text-[10px] xs:text-xs sm:text-sm tracking-tight font-mono drop-shadow-md flex items-center gap-1.5 whitespace-nowrap">
              <span>{studentCount}+ ሰልጣኞች</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            </p>
          </div>
        </div>
      </div>

      {/* 🌟 FULL-SCREEN CINEMATIC VIDEO LIGHTBOX (100% Full-Screen Deep Void Black) */}
      <CinematicVideoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
          }
        }}
        videoUrl={activeVideoUrl}
        poster={displayThumbnail}
        title="የፀሐይ ካምፓስ መግቢያ ቪዲዮ (Tsehay Campus Introduction)"
      />
    </div>
  );
}
