'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * AnalogRollingDigit - Vertical Rolling Odometer / Chronometer Digit Column
 * Scrolls vertically from 0 to max like a high-precision analog stopwatch.
 */
function AnalogRollingDigit({ value, max = 9 }: { value: number; max?: number }) {
  const digits = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="relative h-[70px] sm:h-[96px] md:h-[116px] overflow-hidden leading-none select-none inline-flex items-center">
      <div
        className="transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
        style={{ transform: `translateY(-${value * (100 / digits.length)}%)` }}
      >
        {digits.map((d) => (
          <div
            key={d}
            className="h-[70px] sm:h-[96px] md:h-[116px] flex items-center justify-center font-mono font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-white antialiased subpixel-antialiased drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * LusionPreloader - Luxury Minimalist Fullscreen Preloader
 * - Analog-style Vertical Rolling Odometer Counter (Sharp & High Contrast)
 * - Minimalist Header (Zero technical clutter, no 4K/Ultra labels)
 * - Fluid Animated 3D Central Logo with rotating solar rings
 * - Dynamic Subtitle Typing Animation
 * - Strict Asset Gatekeeping
 */
export default function LusionPreloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);
  const [is4KBuffered, setIs4KBuffered] = useState(false);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Dynamic Subtitle Typing Animation State
  const [typedText, setTypedText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const TYPING_PHRASES = [
      'የወደፊት የቢዝነስ እና የክህሎት ጉዞዎን ዛሬ ይጀምሩ...',
      'በኢትዮጵያ ቀዳሚው የተግባራዊ ክህሎት ማዕከል...',
      'የሺን፣ ዲጂታል ማርኬቲንግ እና የቪዲዮ ኤዲቲንግ ስልጠናዎች...',
      'እውቀትዎን ወደ ገቢ የሚቀይሩበት ትክክለኛ ካምፓስ...',
    ];

    const currentPhrase = TYPING_PHRASES[phraseIdx % TYPING_PHRASES.length];
    let timer: NodeJS.Timeout;

    if (!isDeleting && charIdx < currentPhrase.length) {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.slice(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, 45);
    } else if (!isDeleting && charIdx === currentPhrase.length) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 1600);
    } else if (isDeleting && charIdx > 0) {
      timer = setTimeout(() => {
        setTypedText(currentPhrase.slice(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, 22);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setPhraseIdx(prev => (prev + 1) % TYPING_PHRASES.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, phraseIdx]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let fontsReady = false;
    let imagesReady = false;
    let windowReady = false;
    let video4KReady = false;

    // 0. Preconnect & Pre-buffer 4K CDN Domains
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

    // Fallback safety timer: ensure video4KReady is guaranteed within 1800ms max so preloader never hangs indefinitely
    const videoSafetyTimer = setTimeout(() => {
      handle4KBuffered();
    }, 1800);

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

    // 2. Critical Images Preload
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

    // 4. Strict Asset Gatekeeping & Analog Digital Progress Lerper
    const startTime = performance.now();
    const minDurationMs = 1300;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const timeRatio = Math.min(1, elapsed / minDurationMs);

      // Milestone Target: Scales to 75% with time, strictly requires 4K buffer + fonts + images for 100%
      let targetProgress = timeRatio * 75;
      if (fontsReady) targetProgress += 6;
      if (imagesReady) targetProgress += 6;
      if (video4KReady) targetProgress += 13;

      // Strict Gatekeeping: ONLY allow 100% when 4K video buffer and all critical assets are confirmed ready
      const allAssetsReady = fontsReady && imagesReady && video4KReady;
      if ((windowReady || elapsed >= minDurationMs) && allAssetsReady && elapsed >= minDurationMs) {
        targetProgress = 100;
      }

      // Smooth fast lerp towards target
      progressRef.current += (targetProgress - progressRef.current) * 0.16;
      if (progressRef.current >= 99.2 && elapsed >= minDurationMs && allAssetsReady) {
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

        // Smoothly reveal main page content by removing tsehay-loading gatekeeper
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('tsehay-loading');
        }

        // Strictly notify hero video to begin playback ONLY when preloader is 100% ready
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));

        setTimeout(() => {
          setIsDone(true);
          setTimeout(() => {
            setShouldRemove(true);
          }, 950);
        }, 250);
      }
    };

    // Safety fallback: guaranteed unblock after 3.2s in case of slow network
    const safetyUnblockTimer = setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('tsehay-loading');
      }
    }, 3200);

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      clearTimeout(videoSafetyTimer);
      clearTimeout(safetyUnblockTimer);
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

      {/* Top Bar - Ultra Minimalist (No static text, no 4K/Ultra labels) */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse shadow-[0_0_8px_#f9b03c]" />
        </div>
      </div>

      {/* Center 3D Animated Logo with Fluid Floating Animation & Dynamic Typing Subtitle */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative group animate-[float_5s_ease-in-out_infinite]">
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

        {/* Dynamic Subtitle Typing Animation Under Logo */}
        <div className="mt-8 flex flex-col items-center justify-center text-center px-4 max-w-xl">
          <div className="min-h-[32px] sm:min-h-[38px] flex items-center justify-center gap-1.5">
            <p className="font-heading font-semibold text-sm sm:text-base md:text-lg text-slate-100 tracking-wide drop-shadow-md">
              {typedText}
            </p>
            <span className="brand-typing-cursor" />
          </div>
        </div>
      </div>

      {/* Bottom Area: Razor-Sharp Analog-Style Vertical Rolling Counter */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-end justify-between">
        {/* Bottom-Left Sharp High-Contrast Analog Rolling Counter (Clean & Noticeable Digital Counter) */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 sm:gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-[#040814]/95 border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.2)]">
            {/* Hundreds Reel */}
            {progress >= 100 && (
              <AnalogRollingDigit value={1} max={1} />
            )}
            {/* Tens Reel */}
            <AnalogRollingDigit value={progress >= 100 ? 0 : Math.floor((progress % 100) / 10)} max={9} />
            {/* Ones Reel */}
            <AnalogRollingDigit value={progress >= 100 ? 0 : progress % 10} max={9} />
            <span className="font-mono font-black text-xl sm:text-3xl md:text-4xl text-[#f9b03c] ml-1 select-none drop-shadow-[0_0_12px_rgba(249,176,60,0.8)]">
              %
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

