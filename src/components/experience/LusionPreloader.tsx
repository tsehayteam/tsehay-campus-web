'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * AnalogRollingDigit - Vertical Rolling Odometer / Chronometer Digit Column
 * Scrolls vertically from bottom to top in ordered succession like a luxury analog chronograph.
 */
function AnalogRollingDigit({ 
  value, 
  digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] 
}: { 
  value: number; 
  digits?: number[]; 
}) {
  const itemHeightPercent = 100 / digits.length;
  const foundIdx = digits.indexOf(value);
  const targetIndex = foundIdx !== -1 ? foundIdx : Math.min(digits.length - 1, Math.max(0, value));

  return (
    <div className="relative h-[68px] sm:h-[88px] md:h-[108px] overflow-hidden leading-none select-none inline-flex items-center">
      <div
        className="transition-transform duration-200 ease-out flex flex-col will-change-transform"
        style={{ transform: `translate3d(0, -${targetIndex * itemHeightPercent}%, 0)` }}
      >
        {digits.map((d, idx) => (
          <div
            key={idx}
            className="h-[68px] sm:h-[88px] md:h-[108px] flex items-center justify-center font-mono font-black text-6xl sm:text-7xl md:text-8xl tracking-tight text-white antialiased subpixel-antialiased drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
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
  const [shouldRemove, setShouldRemove] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (typeof window !== 'undefined') {
        const isAuthCallback = window.location.hash.includes('access_token') || 
                               window.location.hash.includes('refresh_token') || 
                               window.location.search.includes('code=') ||
                               window.location.pathname.startsWith('/auth/');
        if (isAuthCallback) {
          sessionStorage.setItem('tsehay_preloader_shown', 'true');
          sessionStorage.setItem('tsehay_preloader_seen', 'true');
          return true;
        }
      }

      const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
      const isReload = navEntry?.type === 'reload';
      
      if (isReload) {
        sessionStorage.removeItem('tsehay_preloader_shown');
        return false;
      }

      return sessionStorage.getItem('tsehay_preloader_shown') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [is4KBuffered, setIs4KBuffered] = useState(false);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // If already shown or if on auth callback, immediately unblock document and dispatch complete
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isAuthCallback = window.location.hash.includes('access_token') || 
                             window.location.hash.includes('refresh_token') || 
                             window.location.search.includes('code=') ||
                             window.location.pathname.startsWith('/auth/');
      if (isAuthCallback || shouldRemove) {
        document.documentElement.classList.remove('tsehay-loading');
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      }
    }
  }, [shouldRemove]);

  // Dynamic Subtitle Typing Animation State
  const [typedText, setTypedText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (shouldRemove) return;

    const TYPING_PHRASES = [
      'የወደፊት የቢዝነስ እና የክህሎት ጉዞዎን ዛሬ ይጀምሩ',
      'በኢትዮጵያ ቀዳሚው የተግባራዊ ክህሎት ማዕከል',
      'የሺን፣ ዲጂታል ማርኬቲንግ እና የቪዲዮ ኤዲቲንግ ስልጠናዎች',
      'እውቀትዎን ወደ ገቢ የሚቀይሩበት ትክክለኛ ካምፓስ',
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
  }, [charIdx, isDeleting, phraseIdx, shouldRemove]);

  useEffect(() => {
    if (typeof window === 'undefined' || shouldRemove) return;

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

    // 4. Calibrated Smooth Stop-Watch Progression & Immediate Unlock at 100
    const startTime = performance.now();
    const durationMs = 1900;
    let isUnlocked = false;

    const finishPreloader = () => {
      if (isUnlocked) return;
      isUnlocked = true;
      setProgress(100);
      progressRef.current = 100;

      setTimeout(() => {
        // 1. Mark completed in sessionStorage
        try {
          sessionStorage.setItem('tsehay_preloader_shown', 'true');
          sessionStorage.setItem('tsehay_preloader_seen', 'true');
        } catch (e) {}

        // 2. Smoothly reveal main page content by removing tsehay-loading gatekeeper
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('tsehay-loading');
        }

        // 3. Notify hero video and background media to begin playback immediately
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));

        // 4. Instant slide-up fade-out transition with zero lag
        setIsDone(true);
        setTimeout(() => {
          setShouldRemove(true);
        }, 850);
      }, 250);
    };

    const updateProgress = (now: number) => {
      if (isUnlocked) return;

      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);

      // Steady, monotonic stopwatch tick from 0 to 100
      const calculatedTick = Math.min(100, Math.floor(ratio * 100));

      setProgress(calculatedTick);
      progressRef.current = calculatedTick;

      if (calculatedTick < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        finishPreloader();
      }
    };

    // Safety fallback: guaranteed unblock after 2.8s in case of any animation delay
    const safetyUnblockTimer = setTimeout(() => {
      if (!isUnlocked) {
        finishPreloader();
      }
    }, 2800);

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

      {/* Top Bar - Completely Clean & Minimalist (Zero noise, zero blinking dots) */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between pointer-events-none" />

      {/* Center Motion Graphics Animated Logo with Dynamic Video Intro Aesthetic */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center animate-[mgLogoReveal_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          {/* Concentric Expanding Shockwave Waves */}
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#f9b03c]/35 animate-[mgEnergyPulse_2.6s_ease-out_infinite] pointer-events-none" />
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#3268ba]/40 animate-[mgEnergyPulse_2.6s_ease-out_infinite_1.3s] pointer-events-none" />

          {/* Outer Rotating Dashed Celestial Ring */}
          <div className="absolute -inset-8 sm:-inset-10 rounded-full border border-dashed border-[#f9b03c]/45 animate-[mgRingSpin_9s_linear_infinite] pointer-events-none shadow-[0_0_25px_rgba(249,176,60,0.25)]" />
          
          {/* Inner Counter-Rotating Dotted Ring */}
          <div className="absolute -inset-4 sm:-inset-5 rounded-full border border-dotted border-[#3268ba]/55 animate-[mgRingReverseSpin_6s_linear_infinite] pointer-events-none" />

          {/* Orbiting Luminous Photon Particle */}
          <div className="absolute w-full h-full flex items-center justify-center pointer-events-none animate-[mgOrbitParticle_3.8s_linear_infinite]">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-300 to-[#f9b03c] shadow-[0_0_12px_#f9b03c,0_0_20px_#ffffff]" />
          </div>

          {/* Glowing Aura Halo */}
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-[#f9b03c]/45 via-amber-400/30 to-[#3268ba]/45 blur-2xl animate-[mgHaloBreathe_3.2s_ease-in-out_infinite]" />

          {/* Logo Container with High-End Holographic Sheen Sweep */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl p-[3px] bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_55px_rgba(249,176,60,0.5)] overflow-hidden">
            {/* Dynamic Laser Light Sheen Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[22px]">
              <div className="w-24 h-[250%] -top-3/4 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[mgSheenSweep_2.8s_ease-in-out_infinite]" />
            </div>

            <img
              src="/tc-logo.jpg"
              alt="Tsehay Campus Logo"
              className="w-full h-full object-cover rounded-[21px] bg-slate-950 relative z-10 select-none pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/favicon.png';
              }}
            />
          </div>
        </div>

        {/* Dynamic Subtitle Typing Animation Under Logo */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center text-center px-4 max-w-xl">
          <div className="min-h-[32px] sm:min-h-[38px] flex items-center justify-center">
            <p className="font-heading font-semibold text-sm sm:text-base md:text-lg text-slate-100 tracking-wide drop-shadow-md">
              {typedText}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Area: Precision Stop-Watch Vertical Rolling Counter */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-end justify-between">
        {/* Bottom-Left Sharp Stop-Watch Counter (1 digit for 0-9, 2 digits for 10-99, 3 digits for 100) */}
        <div className="flex flex-col">
          <div className="flex items-baseline px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-[#040814]/95 border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.2)]">
            {progress >= 100 ? (
              <div className="flex items-baseline">
                <AnalogRollingDigit value={1} digits={[0, 1]} />
                <AnalogRollingDigit value={0} digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} />
                <AnalogRollingDigit value={0} digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} />
              </div>
            ) : progress >= 10 ? (
              <div className="flex items-baseline">
                <AnalogRollingDigit 
                  value={Math.floor(progress / 10)} 
                  digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} 
                />
                <AnalogRollingDigit 
                  value={progress % 10} 
                  digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} 
                />
              </div>
            ) : (
              <AnalogRollingDigit 
                value={progress} 
                digits={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sleek Micro-Progress Bar (Hits 100% full exactly at 100) */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#3268ba] via-amber-400 to-[#f9b03c] shadow-[0_0_15px_#f9b03c] transition-all duration-100 ease-out"
          style={{ width: `${(progress / 100) * 100}%` }}
        />
      </div>

      {/* Embedded CSS Keyframes for Motion Graphics Intro & Sleek Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes mgLogoReveal {
          0% {
            transform: scale(0.62) rotate(-6deg);
            opacity: 0;
            filter: blur(12px) brightness(1.7);
          }
          45% {
            transform: scale(1.07) rotate(1.5deg);
            opacity: 1;
            filter: blur(0px) brightness(1.2);
          }
          75% {
            transform: scale(0.97) rotate(-0.5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
          }
        }
        @keyframes mgRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes mgRingReverseSpin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes mgEnergyPulse {
          0% {
            transform: scale(0.85);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.22);
            opacity: 0.35;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes mgSheenSweep {
          0% {
            transform: translateX(-160%) skewX(-25deg);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          40% {
            transform: translateX(260%) skewX(-25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(260%) skewX(-25deg);
            opacity: 0;
          }
        }
        @keyframes mgHaloBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.95;
          }
        }
        @keyframes mgOrbitParticle {
          0% {
            transform: rotate(0deg) translateX(70px) rotate(0deg);
            opacity: 0.8;
          }
          50% {
            transform: rotate(180deg) translateX(74px) rotate(-180deg);
            opacity: 1;
          }
          100% {
            transform: rotate(360deg) translateX(70px) rotate(-360deg);
            opacity: 0.8;
          }
        }
      `}} />
    </div>
  );
}

