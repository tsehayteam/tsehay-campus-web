'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * LusionPreloader - Lusion.co-Grade Minimalist Fullscreen Preloader
 * - Asset Pre-loading: Preloads hero backdrop (/assets/hero-bg-new.jpg), logo, and fonts
 * - Minimalist & Fast: Zero verbose text/sync messages; fast, snappy 0 -> 100% digital transition
 * - Animated 3D Central Logo: Rotating solar orbital rings, ambient gold aura, and breathing scale
 * - Digital Progress Counter: Bottom-left high-tech monospace running 00 -> 100%
 * - Cinematic Curtain Reveal: Smooth slide-up transition triggering hero video autoplay
 */
export default function LusionPreloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);
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

    // 4. Ultra-Fast High-Tech Digital Progress Lerper (Target ~1.1s total duration)
    const startTime = performance.now();
    const minDurationMs = 1200; // Snappy 1.2s duration for sleek Lusion.co feel

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const timeRatio = Math.min(1, elapsed / minDurationMs);

      // Accelerated milestone target
      let targetProgress = timeRatio * 88;
      if (fontsReady) targetProgress += 4;
      if (imagesReady) targetProgress += 4;
      if (windowReady && elapsed >= minDurationMs) targetProgress = 100;

      // Smooth fast lerp towards target
      progressRef.current += (targetProgress - progressRef.current) * 0.18;
      if (progressRef.current >= 99.2 && elapsed >= minDurationMs) {
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

        // Notify hero video and background systems immediately
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

        <div className="font-mono text-[10px] sm:text-xs text-[#f9b03c] border border-[#f9b03c]/40 px-3 py-1 rounded-full bg-[#f9b03c]/10 backdrop-blur-md">
          ONLINE CAMPUS
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-slate-400 uppercase">
              READY
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
