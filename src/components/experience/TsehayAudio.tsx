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
  const uiGainRef = useRef<GainNode | null>(null);

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

    // 1. Master Output Gain with Sub-Bass & Hum Removal Filter (160Hz HighPass)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const highPassFilter = ctx.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.setValueAtTime(160, ctx.currentTime); // Completely wipes out low-frequency hum, buzz, and mud

    masterGain.connect(highPassFilter);
    highPassFilter.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // 2. Dedicated UI Click & Feedback Gain (Direct to destination, NEVER silenced by video ducking)
    const uiGain = ctx.createGain();
    uiGain.gain.setValueAtTime(0.22, ctx.currentTime);
    uiGain.connect(ctx.destination);
    uiGainRef.current = uiGain;

    // 3. Rhythm Gain (Traditional Ethiopian Kebero & Shaker Beat)
    const rhythmGain = ctx.createGain();
    rhythmGain.gain.setValueAtTime(0.12, ctx.currentTime);
    rhythmGain.connect(masterGain);
    rhythmGainRef.current = rhythmGain;

    // 4. Melody Gain (Ethiopian Tizita Pentatonic Krar Plucks)
    const melodyGain = ctx.createGain();
    melodyGain.gain.setValueAtTime(0.26, ctx.currentTime);
    melodyGain.connect(masterGain);
    melodyGainRef.current = melodyGain;

    return ctx;
  }, []);

  // Synthesize Traditional Kebero (Warm Acoustic Percussion, Zero Sub-Rumble)
  const playKeberoKick = (time: number, accent: boolean = false) => {
    const ctx = audioCtxRef.current;
    const rhythmGain = rhythmGainRef.current;
    if (!ctx || !rhythmGain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 125 : 100, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.26 : 0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

    osc.connect(gain);
    gain.connect(rhythmGain);
    osc.start(time);
    osc.stop(time + 0.16);
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

    // Gentle bandpass filter for organic rustle, eliminating harsh hiss
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 3200 : 2800, time);
    filter.Q.setValueAtTime(2.0, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.02 : 0.012, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

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
    const melodyGain = melodyGainRef.current;
    if (!ctx || !rhythmGain || !melodyGain) return;

    const now = ctx.currentTime;
    if (scrollMode === 'groove') {
      // Swell rhythm & melody energy when user explores courses/features
      rhythmGain.gain.cancelScheduledValues(now);
      rhythmGain.gain.linearRampToValueAtTime(0.38, now + 1.0);

      melodyGain.gain.cancelScheduledValues(now);
      melodyGain.gain.linearRampToValueAtTime(0.32, now + 1.0);
    } else {
      // Settle down to gentle ambient melody near the top
      rhythmGain.gain.cancelScheduledValues(now);
      rhythmGain.gain.linearRampToValueAtTime(0.10, now + 1.2);

      melodyGain.gain.cancelScheduledValues(now);
      melodyGain.gain.linearRampToValueAtTime(0.24, now + 1.2);
    }
  }, [scrollMode]);

  // Autoplay Unlock on First User Action (Mobile touch/click/scroll) & Persistent Reload State
  useEffect(() => {
    const resumeAudioContext = () => {
      const ctx = audioCtxRef.current || initAudioEngine();
      if (ctx) {
        if (ctx.state === 'suspended' || (ctx as any).state === 'interrupted') {
          ctx.resume().then(() => {
            setIsUnlocked(true);
            try {
              localStorage.setItem('tsehay_audio_persisted', 'true');
            } catch (e) {}
          }).catch(() => {});
        } else if (ctx.state === 'running') {
          setIsUnlocked(true);
          try {
            localStorage.setItem('tsehay_audio_persisted', 'true');
          } catch (e) {}
        }
      }
    };

    // Mobile gesture handler - ensures audio awakens and remains lifetime active on mobile
    const handleUserGesture = () => {
      resumeAudioContext();
    };

    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('touchend', handleUserGesture, { passive: true });
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('scroll', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });
    window.addEventListener('tsehay-preloader-complete', resumeAudioContext);

    // Visibility observer (mobile app switch / screen lock/unlock)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const ctx = audioCtxRef.current || initAudioEngine();
        if (ctx && (ctx.state === 'suspended' || (ctx as any).state === 'interrupted')) {
          ctx.resume().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Initial check: if audio was previously unlocked, attempt instant initialization
    try {
      if (localStorage.getItem('tsehay_audio_persisted') === 'true') {
        resumeAudioContext();
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('touchend', handleUserGesture);
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('scroll', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('tsehay-preloader-complete', resumeAudioContext);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [initAudioEngine]);

  // Universal Audio Ducking Listener (Hero Video, YouTube Embeds, Modals, HTMLMediaElements)
  useEffect(() => {
    // 1. Hero video in-view & sound sync
    const handleVideoInView = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const inView = detail?.inView ?? false;
      const hasSound = detail?.hasSound ?? false;

      // Auto-duck ONLY when the hero video is in viewport AND actively playing sound!
      if (inView && hasSound) {
        setIsDucked(true);
      } else {
        // If hero video is out of view, paused, or muted, verify if any other media is playing sound
        const allMedia = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
        const anyAudible = allMedia.some(m => !m.paused && !m.ended && !m.muted && m.volume > 0);
        if (!anyAudible) {
          setIsDucked(false);
        }
      }
    };

    // 2. Explicit custom duck/restore events
    const handleUniversalDuck = (e: Event) => {
      const duck = (e as CustomEvent)?.detail?.duck ?? true;
      setIsDucked(duck);
    };

    // 3. HTMLMediaElement (<video>, <audio>) detection across the entire DOM
    const handleMediaPlay = (e: Event) => {
      if (e.target instanceof HTMLMediaElement) {
        // Only duck if media is not muted and has audible volume
        if (!e.target.muted && e.target.volume > 0) {
          setIsDucked(true);
        }
      }
    };

    const handleMediaPauseOrEnd = (e: Event) => {
      if (e.target instanceof HTMLMediaElement) {
        const allMedia = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
        const anyAudible = allMedia.some(m => !m.paused && !m.ended && !m.muted && m.volume > 0);
        if (!anyAudible) {
          setIsDucked(false);
        }
      }
    };

    const handleMediaVolume = (e: Event) => {
      if (e.target instanceof HTMLMediaElement) {
        if (e.target.muted || e.target.volume === 0) {
          const allMedia = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
          const anyAudible = allMedia.some(m => !m.paused && !m.ended && !m.muted && m.volume > 0);
          if (!anyAudible) {
            setIsDucked(false);
          }
        } else if (!e.target.paused && !e.target.ended) {
          setIsDucked(true);
        }
      }
    };

    // 4. YouTube Iframe postMessage state sync (captures embedded YouTube play/pause events)
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data?.event === 'onStateChange') {
          // 1 = PLAYING
          if (data.info === 1) {
            setIsDucked(true);
          } else if (data.info === 2 || data.info === 0) {
            // 2 = PAUSED, 0 = ENDED
            setIsDucked(false);
          }
        }
      } catch (err) {}
    };

    window.addEventListener('tsehay-hero-video-inview', handleVideoInView);
    window.addEventListener('tsehay-audio-duck', handleUniversalDuck);
    window.addEventListener('duck-ambient-audio', () => setIsDucked(true));
    window.addEventListener('restore-ambient-audio', () => setIsDucked(false));
    window.addEventListener('message', handleWindowMessage);

    document.addEventListener('play', handleMediaPlay, true);
    document.addEventListener('pause', handleMediaPauseOrEnd, true);
    document.addEventListener('ended', handleMediaPauseOrEnd, true);
    document.addEventListener('volumechange', handleMediaVolume, true);

    return () => {
      window.removeEventListener('tsehay-hero-video-inview', handleVideoInView);
      window.removeEventListener('tsehay-audio-duck', handleUniversalDuck);
      window.removeEventListener('message', handleWindowMessage);
      document.removeEventListener('play', handleMediaPlay, true);
      document.removeEventListener('pause', handleMediaPauseOrEnd, true);
      document.removeEventListener('ended', handleMediaPauseOrEnd, true);
      document.removeEventListener('volumechange', handleMediaVolume, true);
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
      // Fast, clean fade to silence (0.25s) when any media has sound
      master.gain.linearRampToValueAtTime(0.0001, now + 0.25);
    } else if (isUnlocked) {
      // Smooth restoration to pleasant ambient volume (0.8s) when media pauses or leaves view
      master.gain.linearRampToValueAtTime(0.28, now + 0.8);
    }
  }, [isQuietRoute, isDucked, isUnlocked]);

  // 🔔 Distinct Interactive Click & Hover Audio Feedback (Always active, NEVER blocked by video ducking)
  useEffect(() => {
    // Crisp Tactile Micro-Tick on Hover
    const onHover = () => {
      if (isQuietRoute) return;
      const ctx = audioCtxRef.current;
      const uiGain = uiGainRef.current;
      if (!ctx || !uiGain || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.035);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(uiGain);
      osc.start(now);
      osc.stop(now + 0.045);
    };

    // Primary vs Standard Button Click Feedback
    const onPulse = (e: Event) => {
      if (isQuietRoute) return;
      const ctx = audioCtxRef.current;
      const uiGain = uiGainRef.current;
      if (!ctx || !uiGain) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const isPrimary = (e as CustomEvent)?.detail?.isPrimary ?? false;
      const now = ctx.currentTime;

      if (isPrimary) {
        // Golden Tizita Tri-Tone Chime for Primary CTAs (C5 + E5 + G5)
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.015);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, now + idx * 0.015);
          gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.015 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.015 + 0.22);

          osc.connect(gain);
          gain.connect(uiGain);
          osc.start(now + idx * 0.015);
          osc.stop(now + idx * 0.015 + 0.25);
        });
      } else {
        // Crisp Modern Tactile Snap for standard controls & links (1200Hz -> 550Hz, zero mud)
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.035);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        osc.connect(gain);
        gain.connect(uiGain);
        osc.start(now);
        osc.stop(now + 0.045);
      }
    };

    window.addEventListener('tsehay-audio-hover', onHover);
    window.addEventListener('tsehay-audio-pulse', onPulse);

    return () => {
      window.removeEventListener('tsehay-audio-hover', onHover);
      window.removeEventListener('tsehay-audio-pulse', onPulse);
    };
  }, [isQuietRoute]);

  // Zero DOM rendering: Seamless invisible audio experience like lusion.co (no mute button)
  return null;
}
