'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTsehayInteractions } from '@/hooks/useTsehayInteractions';

/**
 * TsehayAudio - Synesthetic Sound System & Ethiopian Rhythmic Soundscape
 * - No Mute Button (Lusion.co philosophy: invisible, continuous, seamless audio)
 * - Rhythmic Beat & Ethiopian Touch: Algorithmic Tizita (ትዝታ) pentatonic melody,
 *   soft Kebero-inspired sub-kick, and traditional acoustic shaker syncopation
 * - Context-Aware Tracks:
 *   * Above the fold (Hero): Serene, spacious ambient solar drone & harp overture
 *   * Scrolled down (Courses/Preview/Workshops): Upbeat rhythmic groove swells
 *   * Video playback/viewport: Complete instant ducking to silence
 * - Interactive Audio Feedback: Distinct pleasant clicks for primary CTAs vs standard controls
 */
export default function TsehayAudio() {
  // Global non-invasive interaction observer
  useTsehayInteractions();

  const pathname = usePathname();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDucked, setIsDucked] = useState(false);
  const [scrollMode, setScrollMode] = useState<'ambient' | 'groove'>('ambient');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const rhythmGainRef = useRef<GainNode | null>(null);
  const melodyGainRef = useRef<GainNode | null>(null);

  const sequencerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);

  // Quiet / classroom / admin routes
  const isQuietRoute =
    pathname?.startsWith('/classroom') ||
    pathname?.startsWith('/admin');

  // Ethiopian Tizita Pentatonic Scale Frequencies (Major Pentatonic: C, D, E, G, A)
  const TIZITA_SCALE = [
    130.81, // C3
    146.83, // D3
    164.81, // E3
    196.00, // G3
    220.00, // A3
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    659.25, // E5
  ];

  // Melodic Phrase Step Pattern (16-step loop)
  const MELODY_PATTERN = [
    { note: 5, len: 0.35, vel: 0.6 },  // C4
    null,
    { note: 7, len: 0.35, vel: 0.7 },  // E4
    null,
    { note: 8, len: 0.45, vel: 0.8 },  // G4
    { note: 7, len: 0.30, vel: 0.6 },  // E4
    null,
    { note: 9, len: 0.50, vel: 0.85 }, // A4
    null,
    { note: 10, len: 0.40, vel: 0.75 },// C5
    { note: 8, len: 0.35, vel: 0.65 }, // G4
    null,
    { note: 7, len: 0.40, vel: 0.7 },  // E4
    { note: 6, len: 0.30, vel: 0.55 }, // D4
    null,
    { note: 5, len: 0.60, vel: 0.75 }  // C4 resolution
  ];

  // Initialize Web Audio Engine
  const initAudioEngine = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    // 1. Master Output Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // 2. Continuous 432Hz Solar Ambient Drone
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.35, ctx.currentTime);
    droneGain.connect(masterGain);
    droneGainRef.current = droneGain;

    // Ambient Filter
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(360, ctx.currentTime);
    droneFilter.Q.setValueAtTime(3.0, ctx.currentTime);
    droneFilter.connect(droneGain);

    // LFO for breathing drone filter
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(120, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);
    lfo.start();

    // 432Hz Harmonic Base Stack
    const harmonics = [
      { freq: 54.0, type: 'sine' as OscillatorType, gain: 0.32 },
      { freq: 108.0, type: 'triangle' as OscillatorType, gain: 0.22 },
      { freq: 216.0, type: 'sine' as OscillatorType, gain: 0.16 },
      { freq: 432.0, type: 'sine' as OscillatorType, gain: 0.10 },
    ];

    harmonics.forEach(({ freq, type, gain: vol }) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      osc.connect(g);
      g.connect(droneFilter);
      osc.start();
    });

    // 3. Rhythm Gain (Kebero Sub-Bass & Traditional Shaker)
    const rhythmGain = ctx.createGain();
    rhythmGain.gain.setValueAtTime(0.08, ctx.currentTime); // Starts subtle in ambient overture
    rhythmGain.connect(masterGain);
    rhythmGainRef.current = rhythmGain;

    // 4. Melody Gain (Tizita Krar/Harp Plucks)
    const melodyGain = ctx.createGain();
    melodyGain.gain.setValueAtTime(0.24, ctx.currentTime);
    melodyGain.connect(masterGain);
    melodyGainRef.current = melodyGain;

    return ctx;
  }, []);

  // Synthesize Traditional Kebero (Warm Pitch-Drop Sub Drum)
  const playKeberoKick = (time: number, accent: boolean = false) => {
    const ctx = audioCtxRef.current;
    const rhythmGain = rhythmGainRef.current;
    if (!ctx || !rhythmGain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 95 : 75, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.38 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    osc.connect(gain);
    gain.connect(rhythmGain);
    osc.start(time);
    osc.stop(time + 0.25);
  };

  // Synthesize Traditional Acoustic Shaker (Senasel / Woven Reed Shaker)
  const playTraditionalShaker = (time: number, isAccent: boolean = false) => {
    const ctx = audioCtxRef.current;
    const rhythmGain = rhythmGainRef.current;
    if (!ctx || !rhythmGain) return;

    // Noise buffer for acoustic rustle
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 5200 : 4400, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.08 : 0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(rhythmGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.05);
  };

  // Synthesize Tizita Krar / Harp Melodic Pluck
  const playTizitaPluck = (freq: number, time: number, len: number, vel: number) => {
    const ctx = audioCtxRef.current;
    const melodyGain = melodyGainRef.current;
    if (!ctx || !melodyGain) return;

    // Dual oscillator for rich plucked acoustic resonance
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time); // Subtle harmonic octave shimmer

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + len);

    const gain = ctx.createGain();
    const peak = vel * 0.16;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + len);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(melodyGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + len + 0.05);
    osc2.stop(time + len + 0.05);
  };

  // Step Sequencer Clock (Tempo: 94 BPM => 16th note ~ 0.16s)
  useEffect(() => {
    if (!isUnlocked || isQuietRoute) return;

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const tempo = 94; // BPM
    const sixteenthTime = 60 / tempo / 4; // in seconds (~0.16s)
    const lookahead = 0.08; // in seconds

    nextNoteTimeRef.current = ctx.currentTime + 0.1;

    const schedule = () => {
      if (!audioCtxRef.current) return;
      const currentCtx = audioCtxRef.current;

      while (nextNoteTimeRef.current < currentCtx.currentTime + lookahead) {
        const step = stepRef.current % 16;
        const noteTime = nextNoteTimeRef.current;

        // 1. Kebero Kick Pattern (Beat 0 and syncopated beat 6/10 in groove mode)
        if (step === 0) {
          playKeberoKick(noteTime, true);
        } else if ((step === 6 || step === 10) && scrollMode === 'groove') {
          playKeberoKick(noteTime, false);
        }

        // 2. Shaker Syncopation (Continuous subtle triplet/16th pulse)
        if (step % 2 === 0) {
          playTraditionalShaker(noteTime, step % 4 === 0);
        } else if (scrollMode === 'groove') {
          playTraditionalShaker(noteTime, false);
        }

        // 3. Tizita Melody Pattern
        const melodyStep = MELODY_PATTERN[step];
        if (melodyStep && melodyStep.note !== undefined) {
          const freq = TIZITA_SCALE[melodyStep.note] || 261.63;
          playTizitaPluck(freq, noteTime, melodyStep.len, melodyStep.vel);
        }

        stepRef.current = (stepRef.current + 1) % 16;
        nextNoteTimeRef.current += sixteenthTime;
      }
    };

    sequencerTimerRef.current = setInterval(schedule, 40);

    return () => {
      if (sequencerTimerRef.current) {
        clearInterval(sequencerTimerRef.current);
      }
    };
  }, [isUnlocked, isQuietRoute, scrollMode]);

  // Context-Aware Scroll Tracker (Ambient Overture <-> Rhythmic Groove)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || 0;
          if (scrollY > 450) {
            setScrollMode('groove');
          } else {
            setScrollMode('ambient');
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Context-Aware Volume & Energy Morphing
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const rhythmGain = rhythmGainRef.current;
    const droneGain = droneGainRef.current;
    if (!ctx || !rhythmGain || !droneGain) return;

    const now = ctx.currentTime;
    if (scrollMode === 'groove') {
      // Swell rhythm energy when user explores courses/features
      rhythmGain.gain.cancelScheduledValues(now);
      rhythmGain.gain.linearRampToValueAtTime(0.48, now + 1.2);

      droneGain.gain.cancelScheduledValues(now);
      droneGain.gain.linearRampToValueAtTime(0.25, now + 1.2);
    } else {
      // Settle down to ethereal ambient overture near the top
      rhythmGain.gain.cancelScheduledValues(now);
      rhythmGain.gain.linearRampToValueAtTime(0.09, now + 1.5);

      droneGain.gain.cancelScheduledValues(now);
      droneGain.gain.linearRampToValueAtTime(0.38, now + 1.5);
    }
  }, [scrollMode]);

  // Autoplay Unlock on First User Action or Preloader Completion
  useEffect(() => {
    const unlock = () => {
      const ctx = initAudioEngine();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      setIsUnlocked(true);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('tsehay-preloader-complete', unlock);
    };

    window.addEventListener('tsehay-preloader-complete', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('tsehay-preloader-complete', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [initAudioEngine]);

  // Listen for Hero Video Viewport status to Duck Audio
  useEffect(() => {
    const handleVideoInView = (e: Event) => {
      const inView = (e as CustomEvent)?.detail?.inView ?? false;
      setIsDucked(inView);
    };

    window.addEventListener('tsehay-hero-video-inview', handleVideoInView);
    return () => {
      window.removeEventListener('tsehay-hero-video-inview', handleVideoInView);
    };
  }, []);

  // Master Gain Fade / Ducking Curve
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    const shouldMute = isQuietRoute || isDucked;

    master.gain.cancelScheduledValues(now);
    if (shouldMute) {
      // Immediate silence when hero video is active or in classroom
      master.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    } else if (isUnlocked) {
      // Smooth fade-in to pleasant listening volume
      master.gain.linearRampToValueAtTime(0.30, now + 1.2);
    }
  }, [isQuietRoute, isDucked, isUnlocked]);

  // 🔔 Distinct Interactive Click & Hover Audio Feedback
  useEffect(() => {
    // Crisp Tactile Micro-Click
    const onHover = () => {
      if (isQuietRoute || isDucked) return;
      const ctx = audioCtxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.09);
    };

    // Primary vs Standard Button Click Feedback
    const onPulse = (e: Event) => {
      if (isQuietRoute || isDucked) return;
      const ctx = audioCtxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master || ctx.state !== 'running') return;

      const isPrimary = (e as CustomEvent)?.detail?.isPrimary ?? false;
      const now = ctx.currentTime;

      if (isPrimary) {
        // Golden Tizita Chord Chime for Primary CTAs (C5 + E5)
        [523.25, 659.25].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

          osc.connect(gain);
          gain.connect(master);
          osc.start(now);
          osc.stop(now + 0.24);
        });
      } else {
        // Crisp Luxury Snap for standard controls
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.11);
      }
    };

    window.addEventListener('tsehay-audio-hover', onHover);
    window.addEventListener('tsehay-audio-pulse', onPulse);

    return () => {
      window.removeEventListener('tsehay-audio-hover', onHover);
      window.removeEventListener('tsehay-audio-pulse', onPulse);
    };
  }, [isQuietRoute, isDucked]);

  // Zero DOM rendering: Seamless invisible audio experience like lusion.co (no mute button)
  return null;
}
