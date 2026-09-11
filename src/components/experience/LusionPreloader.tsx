'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Cinematic Split-Curtain Preloader with Kinetic Text Reveal
 * - Fullscreen fixed overlay with theater split curtain panels (50% left / 50% right)
 * - Sleek #0d1117 aesthetic with subtle luminous center seam
 * - Sequential kinetic reveal of 3 motivational Amharic words: "ተማር።" -> "ተግብር።" -> "እደግ።"
 * - Dramatic split-curtain reveal with GSAP power3.inOut / expo.inOut
 * - Concurrent hero content entrance (scale 0.95 -> 1.0, opacity 0 -> 1)
 * - Strict ~2.4s duration budget with 3.5s safety fallback timeout
 * - Zero-delay BFCache & History Pop suppression
 */
export default function LusionPreloader() {
  const [shouldRemove, setShouldRemove] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      // 1. Never re-trigger on browser back/forward navigation (BFCache zero-delay return)
      const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = (navEntry && navEntry.type === 'back_forward') || (window.performance?.navigation?.type === 2);
      if (isBackForward) {
        document.documentElement.classList.remove('tsehay-loading');
        return true;
      }

      // 2. Only show on the primary landing page
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

      // 4. Skip on authentication redirects / dashboard routes
      const isAuthOrDashboard = window.location.hash.includes('access_token') || 
                               window.location.hash.includes('refresh_token') || 
                               window.location.search.includes('code=') ||
                               window.location.pathname.startsWith('/auth/') ||
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

  const containerRef = useRef<HTMLDivElement>(null);
  const leftCurtainRef = useRef<HTMLDivElement>(null);
  const rightCurtainRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const word1Ref = useRef<HTMLDivElement>(null);
  const word2Ref = useRef<HTMLDivElement>(null);
  const word3Ref = useRef<HTMLDivElement>(null);

  // If already skipped or on deep route, immediately unblock document and notify media
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isNotLanding = window.location.pathname !== '/' && window.location.pathname !== '';
      if (isNotLanding || shouldRemove) {
        document.documentElement.classList.remove('tsehay-loading');
        document.documentElement.classList.remove('tsehay-curtain-revealing');
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      }
    }
  }, [shouldRemove]);

  // Suppress preloader immediately on history pop (browser back/forward) or pageshow
  useEffect(() => {
    const handleHistoryPop = () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('tsehay-loading');
        document.documentElement.classList.remove('tsehay-curtain-revealing');
      }
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

  // Master GSAP Timeline Orchestration
  useEffect(() => {
    if (shouldRemove || typeof window === 'undefined') return;

    let isCompleted = false;

    const cleanupAndDismiss = () => {
      if (isCompleted) return;
      isCompleted = true;

      try {
        sessionStorage.setItem('tsehay_preloader_shown', 'true');
        sessionStorage.setItem('tsehay_preloader_seen', 'true');
        localStorage.setItem('tsehay_preloader_seen', 'true');
      } catch (e) {}

      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('tsehay-loading');
        document.documentElement.classList.remove('tsehay-curtain-revealing');
        
        const pageWrapper = document.getElementById('tsehay-page-wrapper');
        if (pageWrapper) {
          gsap.set(pageWrapper, { opacity: 1, scale: 1, clearProps: 'transform,opacity' });
        }
      }

      window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      setShouldRemove(true);
    };

    // Fallback safety timeout (max 3.5s) to guarantee the curtain opens even if assets or events lag
    const fallbackTimer = setTimeout(() => {
      cleanupAndDismiss();
    }, 3500);

    const ctx = gsap.context(() => {
      // 1. Initial GSAP state setups
      gsap.set([leftCurtainRef.current, rightCurtainRef.current], { xPercent: 0 });
      gsap.set(seamRef.current, { opacity: 1 });
      gsap.set(orbRef.current, { opacity: 0.8, scale: 1 });
      gsap.set(badgeRef.current, { opacity: 1, y: 0 });
      gsap.set([word1Ref.current, word2Ref.current, word3Ref.current], { opacity: 0, y: 35 });

      // 2. Build Master Animation Timeline (~2.4s total duration)
      const tl = gsap.timeline({
        onComplete: () => {
          cleanupAndDismiss();
        }
      });

      // ----------------------------------------------------------------------
      // Step A: Kinetic Text Stagger (Amharic Motivational Words)
      // ----------------------------------------------------------------------
      // Word 1: "ተማር።" (Learn.)
      tl.to(word1Ref.current, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: 'power2.out'
      })
      .to(word1Ref.current, {
        opacity: 0,
        y: -28,
        duration: 0.22,
        ease: 'power2.in',
        delay: 0.28
      })

      // Word 2: "ተግብር።" (Execute / Practice.)
      .to(word2Ref.current, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: 'power2.out'
      })
      .to(word2Ref.current, {
        opacity: 0,
        y: -28,
        duration: 0.22,
        ease: 'power2.in',
        delay: 0.28
      })

      // Word 3: "እደግ።" (Grow.)
      .to(word3Ref.current, {
        opacity: 1,
        y: 0,
        duration: 0.34,
        ease: 'power2.out'
      })
      .to(word3Ref.current, {
        opacity: 0,
        y: -28,
        duration: 0.24,
        ease: 'power2.in',
        delay: 0.32
      })

      // Seamlessly fade out badge, vertical seam, and celestial orb right before curtain split
      .to(badgeRef.current, {
        opacity: 0,
        y: 15,
        duration: 0.2,
        ease: 'power2.in'
      }, '-=0.2')
      .to(seamRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: 'power1.out'
      }, '-=0.1')
      .to(orbRef.current, {
        opacity: 0,
        scale: 1.4,
        duration: 0.35,
        ease: 'power2.out'
      }, '-=0.2')

      // ----------------------------------------------------------------------
      // Step B: Theater-Style Split Curtain Reveal (Simultaneous -100% / +100%)
      // ----------------------------------------------------------------------
      .add(() => {
        // Unlock page wrapper so it can be revealed concurrently
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('tsehay-curtain-revealing');
        }
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      }, 'splitCurtains')
      .to(leftCurtainRef.current, {
        xPercent: -100,
        duration: 0.95,
        ease: 'power3.inOut'
      }, 'splitCurtains')
      .to(rightCurtainRef.current, {
        xPercent: 100,
        duration: 0.95,
        ease: 'power3.inOut'
      }, 'splitCurtains');

      // ----------------------------------------------------------------------
      // Step C: Content Entrance (Concurrently scales 0.95 -> 1.0, opacity 0 -> 1)
      // ----------------------------------------------------------------------
      const pageWrapper = document.getElementById('tsehay-page-wrapper');
      if (pageWrapper) {
        tl.fromTo(pageWrapper, 
          { opacity: 0, scale: 0.95 },
          { 
            opacity: 1, 
            scale: 1, 
            duration: 0.92, 
            ease: 'power2.out',
            clearProps: 'transform'
          }, 
          'splitCurtains+=0.06'
        );
      }
    }, containerRef);

    return () => {
      clearTimeout(fallbackTimer);
      ctx.revert();
    };
  }, [shouldRemove]);

  if (shouldRemove) return null;

  return (
    <div
      ref={containerRef}
      id="tsehay-lusion-preloader"
      className="fixed inset-0 z-[9999999] overflow-hidden select-none pointer-events-auto"
      style={{ width: '100vw', height: '100vh' }}
      aria-label="Tsehay Campus Loading Experience"
    >
      {/* 1. Left Curtain Panel (Width: 50vw, Pinned to Left Edge) */}
      <div
        ref={leftCurtainRef}
        className="absolute top-0 left-0 w-1/2 h-full z-10 will-change-transform border-r border-[#f9b03c]/20"
        style={{
          background: '#0d1117',
          backgroundImage: 'radial-gradient(circle at 80% 50%, #151c27 0%, #0d1117 70%)',
          boxShadow: 'inset -25px 0 60px rgba(0, 0, 0, 0.7)'
        }}
      />

      {/* 2. Right Curtain Panel (Width: 50vw, Pinned to Right Edge) */}
      <div
        ref={rightCurtainRef}
        className="absolute top-0 right-0 w-1/2 h-full z-10 will-change-transform border-l border-[#f9b03c]/15"
        style={{
          background: '#0d1117',
          backgroundImage: 'radial-gradient(circle at 20% 50%, #151c27 0%, #0d1117 70%)',
          boxShadow: 'inset 25px 0 60px rgba(0, 0, 0, 0.7)'
        }}
      />

      {/* 3. Luminous Vertical Seam Dividing Line */}
      <div
        ref={seamRef}
        className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 z-20 pointer-events-none will-change-opacity"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(249, 176, 60, 0.7) 25%, rgba(255, 255, 255, 0.95) 50%, rgba(249, 176, 60, 0.7) 75%, transparent 100%)',
          boxShadow: '0 0 16px rgba(249, 176, 60, 0.7), 0 0 30px rgba(249, 176, 60, 0.35)'
        }}
      />

      {/* 4. Ambient Celestial Halo Behind Kinetic Text */}
      <div
        ref={orbRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full z-20 pointer-events-none will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(249, 176, 60, 0.18) 0%, rgba(50, 104, 186, 0.12) 45%, transparent 70%)',
          filter: 'blur(55px)'
        }}
      />

      {/* 5. Centered Kinetic Container for Sequential Amharic Words */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-full max-w-2xl h-36 flex items-center justify-center text-center px-4"
        aria-live="polite"
      >
        {/* Word 1: "ተማር።" (Learn.) */}
        <div
          ref={word1Ref}
          className="absolute font-black tracking-tight text-5xl sm:text-7xl md:text-8xl select-none will-change-transform"
          style={{
            fontFamily: 'var(--font-ethiopic-var), var(--font-heading-var), sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #ffe299 28%, #f9b03c 65%, #e58700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 35px rgba(249, 176, 60, 0.6)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.9))'
          }}
        >
          ተማር።
        </div>

        {/* Word 2: "ተግብር።" (Execute / Practice.) */}
        <div
          ref={word2Ref}
          className="absolute font-black tracking-tight text-5xl sm:text-7xl md:text-8xl select-none will-change-transform"
          style={{
            fontFamily: 'var(--font-ethiopic-var), var(--font-heading-var), sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #ffe299 28%, #f9b03c 65%, #e58700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 35px rgba(249, 176, 60, 0.6)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.9))'
          }}
        >
          ተግብር።
        </div>

        {/* Word 3: "እደግ።" (Grow.) */}
        <div
          ref={word3Ref}
          className="absolute font-black tracking-tight text-5xl sm:text-7xl md:text-8xl select-none will-change-transform"
          style={{
            fontFamily: 'var(--font-ethiopic-var), var(--font-heading-var), sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #ffe299 28%, #f9b03c 65%, #e58700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 35px rgba(249, 176, 60, 0.6)) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.9))'
          }}
        >
          እደግ።
        </div>
      </div>

      {/* 6. Subtle Preloader Brand Badge */}
      <div
        ref={badgeRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-[#f9b03c]/25 bg-black/40 backdrop-blur-md text-xs font-bold tracking-widest text-slate-300 pointer-events-none select-none uppercase will-change-transform"
      >
        <span className="w-2 h-2 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c]" />
        <span>TSEHAY <span className="text-[#f9b03c]">CAMPUS</span></span>
      </div>
    </div>
  );
}
