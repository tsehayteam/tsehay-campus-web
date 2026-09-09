'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { gsap } from 'gsap';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';
import { supabase } from '@/lib/supabase/client';
import CinematicVideoModal from '@/components/CinematicVideoModal';
import { Volume2, VolumeX } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState<boolean>(true);
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
  const isMutedRef = useRef<boolean>(true);
  const wasAutoPausedByScrollRef = useRef<boolean>(false);
  const lastUserActionTimeRef = useRef<number>(0);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ⚡ Universal Player State Synchronization via Window Message Events (Bunny Stream, Player.js, YouTube)
  useEffect(() => {
    const handleUniversalMessage = (event: MessageEvent) => {
      // Prevent delayed buffering/state bounceback from reversing user action within 900ms
      if (Date.now() - lastUserActionTimeRef.current < 900) {
        return;
      }
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_) {}
        }
        if (data && typeof data === 'object') {
          // 1. Bunny.net Stream event: { channel: "bunnystream", event: "play" | "pause" | "ended" }
          if (data.channel === 'bunnystream') {
            if (data.event === 'play' || data.event === 'playing') {
              isPlayingRef.current = true;
              setIsPlaying(true);
            } else if (data.event === 'pause' || data.event === 'ended') {
              isPlayingRef.current = false;
              setIsPlaying(false);
            }
            return;
          }

          // 2. Player.js event (used by Bunny.net Stream, Vimeo, etc.)
          if (data.context === 'player.js') {
            if (data.event === 'play' || data.event === 'playing') {
              isPlayingRef.current = true;
              setIsPlaying(true);
            } else if (data.event === 'pause' || data.event === 'ended') {
              isPlayingRef.current = false;
              setIsPlaying(false);
            }
            return;
          }

          // 3. YouTube API onStateChange: 1 = Playing, 2 = Paused, 0 = Ended
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

    window.addEventListener('message', handleUniversalMessage);
    return () => window.removeEventListener('message', handleUniversalMessage);
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

  const triggerFlashFeedback = useCallback((action: 'play' | 'pause') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashAction(action);
    flashTimerRef.current = setTimeout(() => {
      setFlashAction(null);
    }, 600);
  }, []);

  // 1. Initial Load & Persistent Cache Recovery
  useEffect(() => {
    let isCancelled = false;

    // A. Instant LocalStorage Cache Warm-up
    try {
      const cachedUrl = localStorage.getItem('tsehay_landing_video_cache');
      const cachedThumb = localStorage.getItem('tsehay_landing_video_thumb');
      if (cachedUrl && cachedUrl.trim() && !videoSrc) {
        setActiveVideoUrl(cachedUrl.trim());
      }
      if (cachedThumb && cachedThumb.trim() && !initialThumbnail) {
        setCustomThumbnail(cachedThumb.trim());
      }
    } catch (e) {}

    // B. Live Fetch & Supabase Edge Sync
    const fetchLandingVideo = async () => {
      try {
        let fetchedUrl = '';
        let fetchedThumb = '';

        try {
          const res = await fetch(`/api/admin/site-settings?key=landing_video&_t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (res.ok) {
            const json = await res.json();
            fetchedUrl = json?.data?.url || json?.data?.videoUrl || json?.data?.youtubeUrl || '';
            fetchedThumb = json?.data?.landingVideoThumbnail || json?.data?.thumbnail || json?.data?.thumbnailUrl || json?.data?.poster || '';
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

        if (isCancelled) return;

        if (fetchedUrl && typeof fetchedUrl === 'string' && fetchedUrl.trim()) {
          setActiveVideoUrl(fetchedUrl.trim());
          try {
            localStorage.setItem('tsehay_landing_video_cache', fetchedUrl.trim());
          } catch (e) {}
        }

        if (fetchedThumb && typeof fetchedThumb === 'string' && fetchedThumb.trim()) {
          setCustomThumbnail(fetchedThumb.trim());
          try {
            localStorage.setItem('tsehay_landing_video_thumb', fetchedThumb.trim());
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Landing video live sync skipped:", err);
      }
    };

    fetchLandingVideo();

    // 3. Supabase Realtime WebSocket Listener
    let sbChannel: any = null;
    try {
      sbChannel = supabase
        .channel('public:site_settings_landing_video')
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
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : (siteOrigin || 'http://localhost:3000');
  const ytAutoplaySrc = parsedVideo.youtubeId
    ? `https://www.youtube.com/embed/${parsedVideo.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${parsedVideo.youtubeId}&controls=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}&rel=0&modestbranding=1&iv_load_policy=3&vq=hd2160&quality=hd2160&hd=1`
    : '';

  // Generate Universal Embed URL with autoplay, muted, loop, preload, responsive enabled (for Bunny Stream, Vimeo, etc.)
  const embedAutoplaySrc = React.useMemo(() => {
    if (!parsedVideo.src) return '';
    let src = parsedVideo.src;
    if (src.includes('mediadelivery.net') || src.includes('bunnycdn.com') || src.includes('b-cdn.net')) {
      if (!src.includes('autoplay=')) {
        src += (src.includes('?') ? '&' : '?') + 'autoplay=true';
      }
      if (!src.includes('muted=')) {
        src += (src.includes('?') ? '&' : '?') + 'muted=true';
      }
      if (!src.includes('loop=')) {
        src += (src.includes('?') ? '&' : '?') + 'loop=true';
      }
      if (!src.includes('preload=')) {
        src += (src.includes('?') ? '&' : '?') + 'preload=true';
      }
      if (!src.includes('responsive=')) {
        src += (src.includes('?') ? '&' : '?') + 'responsive=true';
      }
    } else if (src.includes('vimeo.com')) {
      if (!src.includes('autoplay=')) {
        src += (src.includes('?') ? '&' : '?') + 'autoplay=1&muted=1&loop=1&background=1';
      }
    }
    return src;
  }, [parsedVideo.src]);

  // Universal Video Playback Command Dispatcher (Bunny Stream, Player.js, Vimeo, YouTube, HTML5 Video)
  const sendUniversalPlaybackCommand = useCallback((action: 'play' | 'pause' | 'mute' | 'unmute') => {
    // 1. Direct HTML5 video tag control
    if (videoRef.current) {
      try {
        if (action === 'play') {
          videoRef.current.muted = isMutedRef.current;
          videoRef.current.play().catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
        } else if (action === 'pause') {
          videoRef.current.pause();
        } else if (action === 'mute') {
          videoRef.current.muted = true;
        } else if (action === 'unmute') {
          videoRef.current.muted = false;
        }
      } catch (_) {}
    }

    // 2. Universal iframe control (Bunny.net Stream, Player.js, Vimeo, YouTube)
    if (iframeRef.current?.contentWindow) {
      const cw = iframeRef.current.contentWindow;

      // A. Player.js protocol (Bunny.net Stream, Vimeo, generic Player.js)
      const pjsObj = {
        context: 'player.js',
        version: '0.0.11',
        method: action,
      };
      const pjsSimple = {
        context: 'player.js',
        method: action,
      };
      try { cw.postMessage(pjsObj, '*'); } catch (_) {}
      try { cw.postMessage(JSON.stringify(pjsObj), '*'); } catch (_) {}
      try { cw.postMessage(pjsSimple, '*'); } catch (_) {}
      try { cw.postMessage(JSON.stringify(pjsSimple), '*'); } catch (_) {}

      // B. Vimeo / generic postMessage protocol
      try { cw.postMessage({ method: action }, '*'); } catch (_) {}
      try { cw.postMessage(JSON.stringify({ method: action }), '*'); } catch (_) {}

      // C. YouTube IFrame API protocol
      const ytFunc = action === 'play' ? 'playVideo' : action === 'pause' ? 'pauseVideo' : action === 'mute' ? 'mute' : 'unMute';
      try {
        cw.postMessage(JSON.stringify({ event: 'listening' }), '*');
        cw.postMessage(JSON.stringify({ event: 'command', func: ytFunc, args: [] }), '*');
        cw.postMessage(JSON.stringify({ event: 'command', func: ytFunc, args: '' }), '*');
      } catch (_) {}
    }
  }, []);

  // Execute instant pause with zero delay
  const executePause = useCallback((byScroll = false) => {
    lastUserActionTimeRef.current = Date.now();
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (byScroll) {
      wasAutoPausedByScrollRef.current = true;
    } else {
      wasAutoPausedByScrollRef.current = false;
    }

    // Send pause & mute to active video player (Bunny, YouTube, HTML5, etc.)
    sendUniversalPlaybackCommand('pause');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
      window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: false, hasSound: false }
        })
      );
    }
  }, [sendUniversalPlaybackCommand]);

  // Execute instant play with zero delay
  const executePlay = useCallback((isScrollResume = false) => {
    lastUserActionTimeRef.current = Date.now();
    isPlayingRef.current = true;
    setIsPlaying(true);
    wasAutoPausedByScrollRef.current = false;

    // Send play to active video player (Bunny, YouTube, HTML5, etc.)
    sendUniversalPlaybackCommand('play');
    if (!isMutedRef.current) {
      sendUniversalPlaybackCommand('unmute');
    }

    if (typeof window !== 'undefined') {
      const hasSound = !isMutedRef.current;
      if (hasSound) {
        window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
        window.dispatchEvent(
          new CustomEvent('tsehay-hero-video-inview', {
            detail: { inView: true, hasSound: true }
          })
        );
      } else {
        window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
      }
    }
  }, [sendUniversalPlaybackCommand]);

  // 100% Functional Zero-Latency Interactive Play/Pause Toggle Handler (1-Click Guarantee)
  const togglePlayPause = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowInitialThumbnail(false);

    if (isPlayingRef.current) {
      executePause(false); // false = manually paused by user click
      triggerFlashFeedback('pause');
    } else {
      executePlay(false); // false = manually played by user click
      triggerFlashFeedback('play');
    }
  }, [executePause, executePlay, triggerFlashFeedback]);

  // 🔊 Single Tap Unmute & Playback Action Handler (Unmutes, ducks ambient audio, and smoothly fades badge)
  const handleVideoClick = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowInitialThumbnail(false);

    if (isMutedRef.current) {
      // 1. Unmute video audio immediately
      setIsMuted(false);
      isMutedRef.current = false;
      sendUniversalPlaybackCommand('unmute');

      // 2. Ensure video playback is running
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        sendUniversalPlaybackCommand('play');
      }

      // 3. Auto-duck / silence background ambient audio to prevent audio overlap
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
        window.dispatchEvent(
          new CustomEvent('tsehay-hero-video-inview', {
            detail: { inView: true, hasSound: true }
          })
        );
      }
      triggerFlashFeedback('play');
    } else {
      togglePlayPause(e);
    }
  }, [sendUniversalPlaybackCommand, togglePlayPause, triggerFlashFeedback]);

  // 🚀 Unified Playback & Scroll Viewport Manager
  // - Auto-plays when preloader completes
  // - Automatically PAUSES video when user scrolls down away from the landing video
  // - Automatically RESUMES video when user scrolls back up to the video
  useEffect(() => {
    // 1. Initial play if preloader already finished
    const hasPreloaderFinished = typeof window !== 'undefined' && !document.documentElement.classList.contains('tsehay-loading') && sessionStorage.getItem('tsehay_preloader_seen') === 'true';
    let playTimer: NodeJS.Timeout | null = null;
    if (hasPreloaderFinished) {
      executePlay(false);
      playTimer = setTimeout(() => executePlay(false), 300);
      setShowInitialThumbnail(false);
    }

    // 2. Preloader completion listener
    const onPreloaderComplete = () => {
      setShowInitialThumbnail(false);
      executePlay(false);
      setTimeout(() => executePlay(false), 150);
      setTimeout(() => executePlay(false), 500);
      const hasSound = isPlayingRef.current && !isMutedRef.current;
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: true, hasSound }
        })
      );
    };
    window.addEventListener('tsehay-preloader-complete', onPreloaderComplete);

    // 3. High-Precision Scroll Handler: Auto-pause when scrolled down, auto-resume when scrolled back up
    let scrollTicking = false;

    const handleScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;

      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        let isPastVideo = false;

        if (stageRef.current) {
          const rect = stageRef.current.getBoundingClientRect();
          // Video bottom is scrolled past top threshold or scrollY > 200
          if (rect.bottom < 160 || scrollY > 220) {
            isPastVideo = true;
          } else if (rect.bottom >= 160 && rect.top <= window.innerHeight * 0.8) {
            isPastVideo = false;
          } else {
            isPastVideo = scrollY > 220;
          }
        } else {
          isPastVideo = scrollY > 220;
        }

        if (isPastVideo) {
          // ⬇️ Scrolled down: PAUSE VIDEO, MUTE SOUND, RESTORE BACKGROUND MUSIC!
          wasAutoPausedByScrollRef.current = true;
          if (isPlayingRef.current) {
            executePause(true); // true = auto-paused by scroll
          }
          if (!isMutedRef.current) {
            isMutedRef.current = true;
            setIsMuted(true);
            sendUniversalPlaybackCommand('mute');
          }
          window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
          window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
          window.dispatchEvent(
            new CustomEvent('tsehay-hero-video-inview', {
              detail: { inView: false, hasSound: false }
            })
          );
        } else {
          // ⬆️ Scrolled back up: RESUME VIDEO if it was auto-paused by scroll!
          if (wasAutoPausedByScrollRef.current && !isPlayingRef.current) {
            executePlay(true); // true = auto-resumed by scroll back
          }
          const hasSound = isPlayingRef.current && !isMutedRef.current;
          window.dispatchEvent(
            new CustomEvent('tsehay-hero-video-inview', {
              detail: { inView: true, hasSound }
            })
          );
          if (hasSound) {
            window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
            window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
          }
        }

        scrollTicking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // 4. Viewport IntersectionObserver with strict 0.25 threshold
    let observer: IntersectionObserver | null = null;
    if (stageRef.current && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
          const scrollY = window.scrollY || window.pageYOffset || 0;

          if (!inView && scrollY > 150) {
            wasAutoPausedByScrollRef.current = true;
            if (isPlayingRef.current) {
              executePause(true);
            }
            if (!isMutedRef.current) {
              isMutedRef.current = true;
              setIsMuted(true);
              sendUniversalPlaybackCommand('mute');
            }
            window.dispatchEvent(
              new CustomEvent('tsehay-hero-video-inview', {
                detail: { inView: false, hasSound: false }
              })
            );
            window.dispatchEvent(new CustomEvent('restore-ambient-audio'));
            window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: false } }));
          } else if (inView) {
            if (wasAutoPausedByScrollRef.current && !isPlayingRef.current) {
              executePlay(true);
            }
            const hasSound = isPlayingRef.current && !isMutedRef.current;
            window.dispatchEvent(
              new CustomEvent('tsehay-hero-video-inview', {
                detail: { inView: true, hasSound }
              })
            );
            if (hasSound) {
              window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
              window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
            }
          }
        },
        { threshold: [0, 0.15, 0.25, 0.5, 0.75, 1.0] }
      );
      observer.observe(stageRef.current);
    }

    return () => {
      if (playTimer) clearTimeout(playTimer);
      window.removeEventListener('tsehay-preloader-complete', onPreloaderComplete);
      window.removeEventListener('scroll', handleScroll);
      if (observer) observer.disconnect();
      window.dispatchEvent(
        new CustomEvent('tsehay-hero-video-inview', {
          detail: { inView: false, hasSound: false }
        })
      );
    };
  }, [activeVideoUrl, parsedVideo.isYouTube, parsedVideo.youtubeId, siteOrigin, executePlay, executePause, sendUniversalPlaybackCommand]);

  // Subtle Audio (Mute / Unmute) Toggle Handler with Universal Ducking
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isMuted) {
      sendUniversalPlaybackCommand('unmute');
      setIsMuted(false);
      isMutedRef.current = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duck-ambient-audio'));
        window.dispatchEvent(new CustomEvent('tsehay-audio-duck', { detail: { duck: true } }));
      }
    } else {
      sendUniversalPlaybackCommand('mute');
      setIsMuted(true);
      isMutedRef.current = true;
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
      {/*  3D Holographic Backdrop Aura */}
      <div 
        className="absolute -inset-6 sm:-inset-10 rounded-[3rem] opacity-70 pointer-events-none transition-transform duration-500 ease-out"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(249,176,60,0.25) 0%, rgba(50,104,186,0.28) 45%, transparent 75%)',
          filter: 'blur(45px)',
          transform: 'translate3d(0, 0, -40px)',
        }}
      />

      {/*  Main 3D Anamorphic Tilt Rig */}
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
          onClick={handleVideoClick}
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
          ) : parsedVideo.type === 'embed' && (embedAutoplaySrc || parsedVideo.src) ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
              <iframe
                ref={iframeRef}
                id="tsehay_hero_embed_iframe"
                src={embedAutoplaySrc || parsedVideo.src}
                title="Tsehay Campus Hero Video"
                className="w-full h-full border-0 object-cover pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                onLoad={() => {
                  setIsVideoReady(true);
                  setIsPlaying(true);
                  sendUniversalPlaybackCommand('play');
                  window.dispatchEvent(new CustomEvent('tsehay-4k-video-buffered'));
                }}
              />
            </div>
          ) : parsedVideo.isDirectVideo || parsedVideo.type === 'video' ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-none">
              <video
                ref={videoRef}
                src={activeVideoUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover pointer-events-none"
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
            className={`absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center transition-opacity duration-700 ease-out z-15 pointer-events-none ${
              showInitialThumbnail ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img 
              src={displayThumbnail} 
              alt="Tsehay Campus Hero Preview" 
              className="w-full h-full object-cover pointer-events-none scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
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


          {/*  3D Glassmorphic Flash Pop Feedback Animation */}
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

          {/* 🔊 Frosted Glass Center Tap-to-Unmute Card Overlay */}
          <div 
            className={`absolute inset-0 z-25 flex items-center justify-center transition-all duration-500 pointer-events-none ${
              isMuted ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
            style={{ transform: 'translateZ(60px)' }}
          >
            <button
              type="button"
              onClick={handleVideoClick}
              className="pointer-events-auto group/unmute flex items-center gap-3.5 sm:gap-4.5 px-5 sm:px-7 py-3 sm:py-4 rounded-2xl sm:rounded-3xl bg-slate-950/85 hover:bg-black/95 backdrop-blur-2xl border-2 border-[#f9b03c]/70 hover:border-[#f9b03c] shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(249,176,60,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer touch-manipulation select-none"
              aria-label="ድምፁን ለመክፈት ይጫኑ"
            >
              {/* Circular Speaker Icon with Gold Glow */}
              <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#ffe082] text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(249,176,60,0.6)] group-hover/unmute:scale-110 transition-transform">
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-black shadow-[0_0_8px_#34d399] animate-ping" />
              </div>

              {/* Text Stack */}
              <div className="text-left select-none pr-1">
                <p className="font-heading font-black text-sm sm:text-base text-white tracking-wide leading-snug drop-shadow-md">
                  ቪዲዮዋ እየታየ ነው
                </p>
                <p className="font-heading font-black text-xs sm:text-sm text-[#f9b03c] tracking-normal flex items-center gap-1.5 mt-0.5 group-hover/unmute:text-amber-300 transition-colors">
                  <span>ድምፁን ለመክፈት ይጫኑ</span>
                  <i className="fa-solid fa-volume-high text-[11px] group-hover/unmute:scale-110 transition-transform" />
                </p>
              </div>
            </button>
          </div>

          {/* ⏸️ / ▶️ Persistent 3D Glassmorphic Center Play/Pause Button (Shown when unmuted) */}
          {!isMuted && (
            <div 
              className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none transition-opacity duration-300"
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
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/*  ANAMORPHIC DEPTH BADGES (Floating smoothly outside the frame)   */}
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
              {t('practical_learning_badge') || 'ከተግባራዊ ትምህርት ጋር'}
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

      {/*  FULL-SCREEN CINEMATIC VIDEO LIGHTBOX (100% Full-Screen Deep Void Black) */}
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
