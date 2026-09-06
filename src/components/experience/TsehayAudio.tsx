'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTsehayInteractions } from '@/hooks/useTsehayInteractions';

/**
 * TsehayAudio - Synesthetic Sound System (Web Audio API Synthesizer)
 * - 432Hz Harmonic Base Ambient Solar Drone with breathing resonant lowpass
 * - Crystalline ping on hover & spatial low-end pulse on button click
 * - Auto-unlock on first user interaction
 * - Route auto-dampening (silent in classroom & video lectures)
 * - Hero video viewport ducking (crossfades to 0 when video plays in view)
 * - Floating minimalist glassmorphic controller at bottom-right (z-50)
 */
export default function TsehayAudio() {
  // Non-invasive interaction observer hook attached globally
  useTsehayInteractions();

  const pathname = usePathname();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDucked, setIsDucked] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const lfoRef = useRef<{ lfo: OscillatorNode; lfoGain: GainNode } | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  // Check if route is a quiet / classroom / admin route
  const isQuietRoute = 
    pathname?.startsWith('/classroom') || 
    pathname?.startsWith('/admin');

  // Initialize Web Audio Context & Synthesizers
  const initAudioEngine = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Drone Gain
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    droneGain.connect(masterGain);
    droneGainRef.current = droneGain;

    // Resonant Lowpass Filter for warm solar depth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(3.5, ctx.currentTime);
    filter.connect(droneGain);
    filterRef.current = filter;

    // Slow breathing LFO modulating the filter frequency (0.065 Hz = ~15s breath cycle)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(140, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    lfoRef.current = { lfo, lfoGain };

    // 🌟 432Hz Harmonic Base Stack (Warm, Meditative Solar Chord)
    // 54Hz (Sub-Bass), 108Hz (Deep Bass), 216Hz (Warm Mid), 432Hz (Solar Celestial)
    const harmonicFrequencies = [
      { freq: 54.0, type: 'sine' as OscillatorType, gain: 0.35, detune: -4 },
      { freq: 108.0, type: 'triangle' as OscillatorType, gain: 0.28, detune: 5 },
      { freq: 216.0, type: 'sine' as OscillatorType, gain: 0.20, detune: -6 },
      { freq: 432.0, type: 'sine' as OscillatorType, gain: 0.15, detune: 7 },
    ];

    const oscNodes: OscillatorNode[] = [];
    harmonicFrequencies.forEach(({ freq, type, gain: oscVolume, detune }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(detune, ctx.currentTime);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(oscVolume, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      oscNodes.push(osc);
    });

    oscillatorsRef.current = oscNodes;
    return ctx;
  }, []);

  // 🔔 Play Crystalline Ping (Interactive Element Hover)
  const playCrystallinePing = useCallback(() => {
    if (isMuted || !isUnlocked || isQuietRoute) return;
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // High crystal harmonic (432 * 4 = 1728Hz with bell decay)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1728, now);
    osc.frequency.exponentialRampToValueAtTime(864, now + 0.12);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.045, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(pingGain);
    pingGain.connect(master);

    osc.start(now);
    osc.stop(now + 0.20);
  }, [isMuted, isUnlocked, isQuietRoute]);

  // ⚡ Play Futuristic Pulse / Thump (Primary Button Click)
  const playFuturisticPulse = useCallback((isPrimary: boolean = false) => {
    if (isMuted || !isUnlocked || isQuietRoute) return;
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // Sub-kick pitch drop 110Hz -> 42Hz
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = isPrimary ? 120 : 85;
    const endFreq = isPrimary ? 40 : 35;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.14);

    const pulseGain = ctx.createGain();
    const peakVolume = isPrimary ? 0.22 : 0.12;
    pulseGain.gain.setValueAtTime(peakVolume, now);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(pulseGain);
    pulseGain.connect(master);

    osc.start(now);
    osc.stop(now + 0.20);
  }, [isMuted, isUnlocked, isQuietRoute]);

  // Autoplay compliance: unlock AudioContext on first user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      const ctx = initAudioEngine();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      setIsUnlocked(true);
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [initAudioEngine]);

  // Listen to custom interaction events
  useEffect(() => {
    const onHover = () => playCrystallinePing();
    const onPulse = (e: Event) => {
      const isPrimary = (e as CustomEvent)?.detail?.isPrimary ?? false;
      playFuturisticPulse(isPrimary);
    };

    window.addEventListener('tsehay-audio-hover', onHover);
    window.addEventListener('tsehay-audio-pulse', onPulse);

    return () => {
      window.removeEventListener('tsehay-audio-hover', onHover);
      window.removeEventListener('tsehay-audio-pulse', onPulse);
    };
  }, [playCrystallinePing, playFuturisticPulse]);

  // Listen to Hero Video in-view for intelligent ducking
  useEffect(() => {
    const handleHeroVideoInView = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && detail.inView) {
        setIsDucked(true);
      } else {
        setIsDucked(false);
      }
    };

    window.addEventListener('tsehay-hero-video-inview', handleHeroVideoInView);
    return () => {
      window.removeEventListener('tsehay-hero-video-inview', handleHeroVideoInView);
    };
  }, []);

  // Smooth Crossfade volume adjustment based on Mute, Ducked, Route states
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    const drone = droneGainRef.current;
    if (!ctx || !master || !drone) return;

    const now = ctx.currentTime;
    const shouldMute = isMuted || isQuietRoute || isDucked;

    if (shouldMute) {
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      setIsPlaying(false);
    } else {
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(0.32, now + 1.2);

      drone.gain.cancelScheduledValues(now);
      drone.gain.linearRampToValueAtTime(0.85, now + 1.2);
      setIsPlaying(true);
    }
  }, [isMuted, isQuietRoute, isDucked]);

  // Toggle Mute / Unmute
  const toggleSound = () => {
    const ctx = initAudioEngine();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    setIsUnlocked(true);
    setIsMuted(prev => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      <button
        type="button"
        onClick={toggleSound}
        className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full transition-all duration-300 shadow-2xl cursor-pointer backdrop-blur-xl border ${
          !isMuted && isPlaying
            ? 'bg-[#0b101d]/85 border-[#f9b03c]/60 text-white shadow-[0_0_25px_rgba(249,176,60,0.35)]'
            : 'bg-[#070709]/80 border-white/15 text-slate-400 hover:text-white hover:border-white/30'
        }`}
        title={isMuted ? 'የጀርባ ድምጽ ክፈት (Unmute Ambient Music)' : 'የጀርባ ድምጽ አጥፋ (Mute Ambient Music)'}
      >
        {/* Equalizer Waveform Indicator */}
        <div className="flex items-center gap-0.5 h-3.5">
          <span className={`w-0.5 rounded-full bg-[#f9b03c] transition-all duration-300 ${!isMuted && isPlaying ? 'h-3 animate-pulse' : 'h-1 opacity-40'}`} />
          <span className={`w-0.5 rounded-full bg-[#f9b03c] transition-all duration-300 ${!isMuted && isPlaying ? 'h-3.5 animate-bounce' : 'h-1 opacity-40'}`} />
          <span className={`w-0.5 rounded-full bg-[#f9b03c] transition-all duration-300 ${!isMuted && isPlaying ? 'h-2 animate-pulse' : 'h-1 opacity-40'}`} />
          <span className={`w-0.5 rounded-full bg-[#f9b03c] transition-all duration-300 ${!isMuted && isPlaying ? 'h-3.5 animate-bounce' : 'h-1 opacity-40'}`} />
        </div>

        {/* Audio Icon & Label */}
        <span className="text-xs font-heading font-black tracking-wide flex items-center gap-1.5">
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-slate-400' : 'fa-volume-high text-[#f9b03c]'}`}></i>
          <span className="hidden sm:inline text-[11px]">
            {isMuted ? 'ድምጽ ዝግ (Mute)' : isDucked ? 'Ducked' : '432Hz Solar'}
          </span>
        </span>
      </button>
    </div>
  );
}
