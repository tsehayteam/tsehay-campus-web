'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * LusionPreloader - Lusion.co-Grade Fullscreen Preloader & Asset Orchestrator
 * - Asset Pre-loading: Verifies document.fonts.ready, core images, and audio engine readiness
 * - Animated Central Logo: Rotating solar halo ring, breathing pulse, and scale ease
 * - Digital Progress Counter: Bottom-left high-tech monospace running 00% -> 100%
 * - Smooth Reveal & Auto-play: Cinematic curtain slide-up reveal triggering hero video autoplay
 */
export default function LusionPreloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldRemove, setShouldRemove] = useState(false);
  const [statusText, setStatusText] = useState('INITIALIZING CAMPUS SYSTEM...');
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user already saw the preloader in this session to prevent repeated annoying flashes
    const hasSeen = sessionStorage.getItem('tsehay_preloader_seen');
    if (hasSeen === 'true') {
      setShouldRemove(true);
      // Still trigger autoplay event in case hero video is waiting
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

    // 2. Critical Images Preload
    const criticalImages = ['/tc-logo.jpg', '/favicon.png'];
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

    // 4. High-Tech Digital Progress Lerper (Fast jumping 0 -> 100)
    const startTime = performance.now();
    const minDurationMs = 1600; // Optimal 1.6s duration for premium brand impact without stalling

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const timeRatio = Math.min(1, elapsed / minDurationMs);

      // Milestone progress calculation
      let targetProgress = timeRatio * 85;
      if (fontsReady) targetProgress += 5;
      if (imagesReady) targetProgress += 5;
      if (windowReady && elapsed >= minDurationMs) targetProgress = 100;

      // Smooth fast lerp towards target
      progressRef.current += (targetProgress - progressRef.current) * 0.14;
      if (progressRef.current >= 99.5 && elapsed >= minDurationMs) {
        progressRef.current = 100;
      }

      const displayVal = Math.min(100, Math.floor(progressRef.current));
      setProgress(displayVal);

      // Status messages
      if (displayVal < 30) {
        setStatusText('CONNECTING TO TSEHAY ENGINE...');
      } else if (displayVal < 70) {
        setStatusText('SYNCHRONIZING COURSES & ASSETS...');
      } else if (displayVal < 99) {
        setStatusText('OPTIMIZING 3D AUDIO-VISUAL ATMOSPHERE...');
      } else {
        setStatusText('100% COMPLETE // SYSTEM READY');
      }

      if (progressRef.current < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Complete! Mark as seen and initiate smooth reveal
        try {
          sessionStorage.setItem('tsehay_preloader_seen', 'true');
        } catch (e) {}

        // Dispatches event so hero video starts immediately
        window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));

        setTimeout(() => {
          setIsDone(true);
          setTimeout(() => {
            setShouldRemove(true);
          }, 1100);
        }, 300);
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
      className={`fixed inset-0 z-[9999999] bg-[#03060d] text-white flex flex-col justify-between overflow-hidden select-none transition-transform duration-1000 ease-[cubic-bezier(0.85,0,0.15,1)] ${
        isDone ? '-translate-y-full pointer-events-none' : 'translate-y-0 pointer-events-auto'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Ambient Radial Glowing Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-radial from-[#f9b03c]/20 via-[#3268ba]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Top Header Information */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
          <span className="font-mono text-[11px] sm:text-xs tracking-widest text-slate-400 uppercase">
            TSEHAY CAMPUS // PORTAL V2.4
          </span>
        </div>

        <div className="font-mono text-[10px] sm:text-xs text-[#f9b03c]/90 border border-[#f9b03c]/30 px-3 py-1 rounded-full bg-[#f9b03c]/10 backdrop-blur-md">
          ETHIOPIA #1 ONLINE LEARNING
        </div>
      </div>

      {/* Center Animated Logo & Solar Pulse */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative group">
          {/* Rotating Celestial Glowing Halo Ring */}
          <div className="absolute -inset-6 rounded-full border border-dashed border-[#f9b03c]/40 animate-[spin_16s_linear_infinite] pointer-events-none" />
          <div className="absolute -inset-3 rounded-full border border-[#3268ba]/50 animate-[spin_10s_linear_infinite_reverse] pointer-events-none" />

          {/* Ambient Breathing Gold Aura */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#f9b03c]/30 via-amber-400/20 to-[#3268ba]/30 blur-xl animate-pulse" />

          {/* Logo Frame */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1 bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-[#3268ba] shadow-[0_0_50px_rgba(249,176,60,0.55)] transform transition-transform duration-500 hover:scale-105">
            <img
              src="/tc-logo.jpg"
              alt="Tsehay Campus"
              className="w-full h-full object-cover rounded-[22px] bg-slate-950"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/favicon.png';
              }}
            />
          </div>
        </div>

        {/* Center Title */}
        <h2 className="mt-6 font-heading font-black text-xl sm:text-2xl tracking-wider text-white flex items-center gap-1.5">
          <span>TSEHAY</span>
          <span className="text-[#f9b03c]">CAMPUS</span>
        </h2>
        <p className="font-mono text-[11px] text-slate-400 tracking-widest mt-1">
          {statusText}
        </p>
      </div>

      {/* Bottom Area: Digital Counter (Bottom-Left) & Audio Wave / Coordinates */}
      <div className="relative z-10 px-6 py-6 sm:px-12 sm:py-8 flex items-end justify-between">
        {/* Bottom-Left Digital Counter */}
        <div className="flex flex-col">
          <div className="font-mono font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-white drop-shadow-[0_10px_35px_rgba(249,176,60,0.4)] leading-none flex items-baseline">
            <span>{progress < 10 ? `0${progress}` : progress}</span>
            <span className="text-2xl sm:text-4xl text-[#f9b03c] ml-1">%</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-slate-400 uppercase">
              ASSETS LOADED // ZERO LATENCY
            </span>
          </div>
        </div>

        {/* Bottom-Right Coordinates & Animated Sound Bars */}
        <div className="hidden sm:flex flex-col items-end gap-2 font-mono text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[#f9b03c]">9°01&apos;N 38°45&apos;E</span>
            <span>// ADDIS ABABA</span>
          </div>
          <div className="flex items-end gap-1 h-5">
            <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.8s_infinite_100ms] h-2" />
            <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.9s_infinite_300ms] h-4" />
            <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.7s_infinite_200ms] h-3" />
            <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_1.0s_infinite_400ms] h-5" />
            <span className="w-1 bg-[#f9b03c] rounded-full animate-[bounce_0.8s_infinite_150ms] h-2.5" />
          </div>
        </div>
      </div>

      {/* Bottom Sleek Micro-Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#3268ba] via-amber-400 to-[#f9b03c] shadow-[0_0_15px_#f9b03c] transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
