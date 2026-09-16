'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * LusionPreloader - Smooth, Dignified Luxury Fullscreen Preloader
 * - Central Logo gently breathing with radiant solar aura
 * - Clean Amharic motivational subtitle
 * - Precision monotonic progress bar to 100%
 * - Smooth 0.8s Opacity Fade-Out (duration: 0.8s, ease: 'easeInOut')
 * - Completely unmounts from DOM after fade-out completes
 * - Strict zero-delay BFCache & History Pop suppression
 */
export default function LusionPreloader() {
  const [shouldRemove, setShouldRemove] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      // 1. Never re-trigger on browser back/forward navigation (BFCache instant return)
      const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = (navEntry && navEntry.type === 'back_forward') || (window.performance?.navigation?.type === 2);
      if (isBackForward) {
        document.documentElement.classList.remove('tsehay-loading');
        return true;
      }

      // 2. Only show on the root landing page
      if (window.location.pathname !== '/' && window.location.pathname !== '') {
        return true;
      }

      // 3. Skip if already seen in this session or local storage
      if (
        sessionStorage.getItem('tsehay_preloader_shown') === 'true' || 
        sessionStorage.getItem('tsehay_preloader_seen') === 'true' ||
        localStorage.getItem('tsehay_preloader_seen') === 'true'
      ) {
        return true;
      }

      // 4. Skip on authentication redirects / dashboard / classroom routes
      const isAuthOrDashboard = window.location.hash.includes('access_token') || 
                               window.location.hash.includes('refresh_token') || 
                               window.location.search.includes('code=') ||
                               window.location.pathname.startsWith('/auth/') ||
                               window.location.pathname.startsWith('/login') ||
                               window.location.pathname.startsWith('/dashboard') ||
                               window.location.pathname.startsWith('/classroom') ||
                               Boolean(localStorage.getItem('tsehay_auth_user_cache'));
      if (isAuthOrDashboard) {
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
        localStorage.setItem('tsehay_preloader_seen', 'true');
        return true;
      }

      return false;
    } catch (e) {
      return true;
    }
  });

  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // If already skipped or on internal route, immediately unblock document and notify media
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isNotLanding = window.location.pathname !== '/' && window.location.pathname !== '';
      if (isNotLanding || shouldRemove) {
        document.documentElement.classList.remove('tsehay-loading');
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      }
    }
  }, [shouldRemove]);

  // Suppress preloader immediately on history pop (browser back/forward) or pageshow (BFCache)
  useEffect(() => {
    const handleHistoryPop = () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('tsehay-loading');
      }
      setIsFadingOut(true);
      setShouldRemove(true);
      window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
    };

    window.addEventListener('popstate', handleHistoryPop, { passive: true });
    window.addEventListener('pageshow', handleHistoryPop, { passive: true });

    return () => {
      window.removeEventListener('popstate', handleHistoryPop);
      window.removeEventListener('pageshow', handleHistoryPop);
    };
  }, []);

  // Smooth loading progression and 0.8s fade-out sequence
  useEffect(() => {
    if (typeof window === 'undefined' || shouldRemove) return;

    let isUnlocked = false;
    const startTime = performance.now();
    const durationMs = 1350; // Smooth ~1.35s loading budget

    const finishPreloader = () => {
      if (isUnlocked) return;
      isUnlocked = true;
      setProgress(100);
      progressRef.current = 100;

      // 1. Save seen flags
      try {
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
        localStorage.setItem('tsehay_preloader_seen', 'true');
      } catch (e) {}

      // 2. Begin 0.8s smooth opacity fade-out
      setIsFadingOut(true);

      // 3. Immediately unblock the document and reveal the website
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('tsehay-loading');
      }

      // 4. Dispatch preloader-complete so 3D audio and video resume smoothly
      window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));

      // 5. Complete DOM Unmount after exactly 800ms
      setTimeout(() => {
        setShouldRemove(true);
      }, 800);
    };

    const updateProgress = (now: number) => {
      if (isUnlocked) return;
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      const currentTick = Math.min(100, Math.floor(ratio * 100));

      setProgress(currentTick);
      progressRef.current = currentTick;

      if (currentTick < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        finishPreloader();
      }
    };

    // Safety fallback timer: guaranteed unblock after 2.2s in case of any delay
    const safetyTimer = setTimeout(() => {
      if (!isUnlocked) {
        finishPreloader();
      }
    }, 2200);

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      clearTimeout(safetyTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shouldRemove]);

  if (shouldRemove) return null;

  return (
    <div
      id="tsehay-lusion-preloader"
      className={`fixed inset-0 z-[9999999] bg-[#03060d] text-white flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-[800ms] ease-in-out ${
        isFadingOut 
          ? 'opacity-0 pointer-events-none scale-[1.02]' 
          : 'opacity-100 pointer-events-auto scale-100'
      }`}
      style={{
        willChange: 'opacity, transform',
        transitionProperty: 'opacity, transform, visibility',
        transitionDuration: '800ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      aria-label="Tsehay Campus Loading Screen"
    >
      {/* 1. Ambient Celestial Glow Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#f9b03c]/18 via-[#3268ba]/12 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* 2. Center Brand Logo with Majestic Glowing Aura */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Rotating Dashed Celestial Ring */}
          <div className="absolute -inset-6 sm:-inset-8 rounded-full border border-dashed border-[#f9b03c]/40 animate-[spin_12s_linear_infinite] pointer-events-none shadow-[0_0_30px_rgba(249,176,60,0.25)]" />

          {/* Glowing Aura Halo */}
          <div className="absolute -inset-5 rounded-3xl bg-gradient-to-tr from-[#f9b03c]/45 via-amber-400/30 to-[#3268ba]/45 blur-2xl animate-pulse pointer-events-none" />

          {/* Logo Frame with Gold Gradient Edge */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl p-[3px] bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_55px_rgba(249,176,60,0.5)] overflow-hidden">
            <img
              src="/tc-logo.jpg"
              alt="Tsehay Campus"
              className="w-full h-full object-cover rounded-[21px] bg-slate-950 select-none pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/favicon.png';
              }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <div className="mt-8 flex items-center gap-2">
          <span className="font-heading font-black text-xl sm:text-2xl tracking-wider text-white">
            TSEHAY <span className="text-[#f9b03c]">CAMPUS</span>
          </span>
        </div>

        {/* Motivational Tagline */}
        <p className="mt-2 text-xs sm:text-sm text-slate-300 font-medium tracking-wide max-w-sm">
          የወደፊት የቢዝነስ እና የክህሎት ጉዞዎን ዛሬ ይጀምሩ
        </p>

        {/* Minimal High-End Progress Bar */}
        <div className="mt-6 w-44 sm:w-56 h-1 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#3268ba] via-amber-400 to-[#f9b03c] rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
