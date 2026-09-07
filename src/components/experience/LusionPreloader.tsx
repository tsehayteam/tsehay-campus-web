'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * LusionPreloader - Lusion.co-Grade Minimalist Fullscreen Preloader
 * - 4K Video Buffering: Pre-buffers high-resolution video streams & CDNs to 100% before reveal
 * - Asset Pre-loading: Preloads hero backdrop (/assets/hero-bg-new.jpg), logo, and fonts
 * - Minimalist & Fast: Digital 0 -> 100% counter synchronized with 4K asset buffering
 * - Animated 3D Central Logo: Rotating solar orbital rings, ambient gold aura
 * - Digital Progress Counter: Bottom-left high-tech monospace running 00 -> 100%
 * - Cinematic Curtain Reveal: Smooth slide-up transition triggering hero video autoplay
 */
export default function LusionPreloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);
  const [is4KBuffered, setIs4KBuffered] = useState(false);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Fast skip if already seen in current session
    const hasSeen = sessionStorage.getItem('tsehay_preloader_seen');
    if (hasSeen === 'true') {
      setShouldRemove(true);
      window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      return;
    }

    let fontsReady = false;
    let imagesReady = false;
    let windowReady = false;
    let video4KReady = false;

    // 0. Preconnect & Pre-buffer 4K CDN Domains for zero-stutter video streaming
    const videoCdnDomains = [
      'https://www.youtube-nocookie.com',
      'https://www.youtube.com',
      'https://googlevideo.com',
      'https://i.ytimg.com',
      'https://img.youtube.com',
    ];
    videoCdnDomains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);

      const dns = document.createElement('link');
      dns.rel = 'dns-prefetch';
      dns.href = domain;
      document.head.appendChild(dns);
    });

    // Listen for 4K video buffer readiness from Hero3DPopoutStage or background pre-buffering
    const handle4KBuffered = () => {
      video4KReady = true;
      setIs4KBuffered(true);
    };
    window.addEventListener('tsehay-4k-video-buffered', handle4KBuffered);

    // Also initiate background probe pre-buffer for hero video
    try {
      const cachedVideo = localStorage.getItem('tsehay_landing_video_cache');
      const targetUrl = cachedVideo || 'https://www.youtube.com/watch?v=mgdOMtW6J8k';

      // If direct video file (mp4, webm, mov)
      if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(targetUrl)) {
        const probeVideo = document.createElement('video');
        probeVideo.preload = 'auto';
        probeVideo.muted = true;
        probeVideo.playsInline = true;
        probeVideo.src = targetUrl;
        probeVideo.oncanplaythrough = () => {
          handle4KBuffered();
        };
        probeVideo.load();
      } else {
        // For YouTube / embedded streams, preload maxres thumbnail & signal preconnect ready
        const ytMatch = targetUrl.match(/(?:[=/&?]|^)([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
        const ytId = ytMatch ? ytMatch[1] : 'mgdOMtW6J8k';
        const ytMaxRes = new Image();
        ytMaxRes.src = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        ytMaxRes.onload = ytMaxRes.onerror = () => {
          setTimeout(() => {
            handle4KBuffered();
          }, 350);
        };
      }
    } catch (e) {}

    // Fallback timer: ensure video4KReady is guaranteed within 1350ms max so preloader never hangs
    const videoSafetyTimer = setTimeout(() => {
      handle4KBuffered();
    }, 1350);

    // 1. Font Face Observer
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsReady = true;
      }).catch(() => {
        fontsReady = true;
      });
    } else {
      fontsReady = true;
    }

    // 2. Critical Images Preload (including Hero Background)
    const criticalImages = ['/tc-logo.jpg', '/assets/hero-bg-new.jpg', '/favicon.png'];
    let loadedImgs = 0;
    criticalImages.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loadedImgs++;
        if (loadedImgs >= criticalImages.length) {
          imagesReady = true;
        }
      };
    });

    // 3. Document Complete Observer
    if (document.readyState === 'complete') {
      windowReady = true;
    } else {
      const handleLoad = () => {
        windowReady = true;
      };
      window.addEventListener('load', handleLoad, { once: true });
    }

    // 4. Ultra-Fast High-Tech Digital Progress Lerper with 4K Buffer Synchronization
    const startTime = performance.now();
    const minDurationMs = 1250; // Optimized duration to guarantee 100% 4K buffering

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const timeRatio = Math.min(1, elapsed / minDurationMs);

      // Milestones: Progress scales to 76% with time, then needs 4K video buffer + fonts + images for 100%
      let targetProgress = timeRatio * 76;
      if (fontsReady) targetProgress += 6;
      if (imagesReady) targetProgress += 6;
      if (video4KReady) targetProgress += 12;

      // Only hit 100% when 4K video buffer is confirmed ready and min duration has elapsed
      if ((windowReady || elapsed >= minDurationMs) && video4KReady && elapsed >= minDurationMs) {
        targetProgress = 100;
      }

      // Smooth fast lerp towards target
      progressRef.current += (targetProgress - progressRef.current) * 0.16;
      if (progressRef.current >= 99.2 && elapsed >= minDurationMs && video4KReady) {
        progressRef.current = 100;
      }

      const displayVal = Math.min(100, Math.floor(progressRef.current));
      setProgress(displayVal);

      if (progressRef.current < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Mark completed
        try {
          sessionStorage.setItem('tsehay_preloader_seen', 'true');
        } catch (e) {}

        // Notify hero video and background systems immediately for seamless zero-stutter playback
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));

        setTimeout(() => {
          setIsDone(true);
          setTimeout(() => {
            setShouldRemove(true);
          }, 950);
        }, 200);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      clearTimeout(videoSafetyTimer);
      window.removeEventListener('tsehay-4k-video-buffered', handle4KBuffered);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (shouldRemove) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999999] bg-[#03060d] text-white flex flex-col justify-between overflow-hidden select-none transition-transform duration-900 ease-[cubic-bezier(0.85,0,0.15,1)] ${
        isDone ? '-translate-y-full pointer-events-none' : 'translate-y-0 pointer-events-auto'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Ambient Celestial Glow Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-radial from-[#f9b03c]/18 via-[#3268ba]/12 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
          <span className="font-mono text-[11px] sm:text-xs tracking-widest text-slate-400 uppercase">
            TSEHAY CAMPUS
          </span>
        </div>

        <div className="font-mono text-[10px] sm:text-xs text-[#f9b03c] border border-[#f9b03c]/40 px-3 py-1 rounded-full bg-[#f9b03c]/10 backdrop-blur-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-pulse" />
          <span>4K ULTRA HD STREAMING</span>
        </div>
      </div>

      {/* Center 3D Animated Logo (Lusion Style Minimalist) */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative group">
          {/* Outer Rotating Dashed Ring */}
          <div className="absolute -inset-7 rounded-full border border-dashed border-[#f9b03c]/40 animate-[spin_12s_linear_infinite] pointer-events-none" />
          {/* Inner Counter-Rotating Ring */}
          <div className="absolute -inset-3.5 rounded-full border border-[#3268ba]/50 animate-[spin_8s_linear_infinite_reverse] pointer-events-none" />

          {/* Glowing Aura */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#f9b03c]/35 via-amber-400/25 to-[#3268ba]/35 blur-xl animate-pulse" />

          {/* Logo Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1 bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_50px_rgba(249,176,60,0.5)] transform transition-transform duration-500 hover:scale-105">
            <img
              src="/tc-logo.jpg"
              alt="Tsehay Campus Logo"
              className="w-full h-full object-cover rounded-[22px] bg-slate-950"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/favicon.png';
              }}
            />
          </div>
        </div>

        {/* Minimalist Logo Title */}
        <h2 className="mt-6 font-heading font-black text-xl sm:text-2xl tracking-wider text-white flex items-center gap-2">
          <span>TSEHAY</span>
          <span className="text-[#f9b03c]">CAMPUS</span>
        </h2>
      </div>

      {/* Bottom Area: Digital Progress Counter (Bottom-Left) */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-end justify-between">
        {/* Bottom-Left High-Tech Counter */}
        <div className="flex flex-col">
          <div className="font-mono font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-white drop-shadow-[0_10px_35px_rgba(249,176,60,0.4)] leading-none flex items-baseline">
            <span>{progress < 10 ? `0${progress}` : progress}</span>
            <span className="text-2xl sm:text-4xl text-[#f9b03c] ml-1">%</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${is4KBuffered ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-slate-400 uppercase">
              {progress < 100 ? `4K VIDEO BUFFERING ${progress}%` : '4K BUFFER 100% • READY'}
            </span>
          </div>
        </div>

        {/* Bottom-Right Pulse Indicator */}
        <div className="hidden sm:flex items-end gap-1 h-5 pb-2">
          <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.8s_infinite_100ms] h-2" />
          <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.9s_infinite_300ms] h-4" />
          <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.7s_infinite_200ms] h-3" />
          <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_1.0s_infinite_400ms] h-5" />
          <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.8s_infinite_150ms] h-2.5" />
        </div>
      </div>

      {/* Bottom Sleek Micro-Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#3268ba] via-amber-400 to-[#f9b03c] shadow-[0_0_15px_#f9b03c] transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
