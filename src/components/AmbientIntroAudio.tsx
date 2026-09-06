'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * 🎵 Lusion-inspired Continuous Generative Ambient Soundscape Engine (Web Audio API)
 * Features:
 * - Multi-layered atmospheric drone & detuned warmth pads (Root C3, 5th G3, Octave C4).
 * - Evolving celestial pentatonic harmonics (E4, G4, B4, D5, E5) that slowly rise and breathe.
 * - Organic Lowpass Filter with resonant Q modulated by a slow 0.065Hz LFO (15s breath cycle).
 * - Smooth exponential gain ramping for mute/unmute (no clicks, seamless transition).
 * - 0kB asset download overhead (synthesized purely in real-time).
 * - Automatic ducking when user plays videos or opens modals.
 * - Positioned at bottom-left (fixed bottom-5 left-5 z-40) with animated visualizer equalizer bars.
 */
export default function AmbientIntroAudio() {
  const { lang } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const harmonicGainsRef = useRef<GainNode[]>([]);
  const intervalRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const isDuckedRef = useRef(false);

  // Initialize the Continuous Ambient Synthesis Engine
  const startAmbientEngine = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isInitializedRef.current && audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx: AudioContext = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const now = ctx.currentTime;

      // Master Gain for smooth volume transitions
      const masterGain = ctx.createGain();
      const initialMuted = localStorage.getItem('tsehay_ambient_sound_muted') === 'true';
      masterGain.gain.setValueAtTime(0.0001, now);
      if (!initialMuted) {
        masterGain.gain.exponentialRampToValueAtTime(0.09, now + 2.0);
      }
      masterGainRef.current = masterGain;

      // Breathing Low-Pass Filter with Resonance (Lusion style)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, now);
      filter.Q.setValueAtTime(2.0, now);
      filterRef.current = filter;

      // Slow LFO to sweep filter cutoff organically (15.4s cycle)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.065, now);
      lfoGain.gain.setValueAtTime(400, now); // Sweeps between ~450Hz and ~1250Hz

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);

      // Layer 1 & 2: Root & 5th Warm Drone Foundations (Detuned for rich chorus shimmer)
      const droneFrequencies = [
        { freq: 130.81, detune: 0, gain: 0.14, type: 'sine' as OscillatorType },    // C3
        { freq: 131.25, detune: 4, gain: 0.09, type: 'triangle' as OscillatorType },// C3+
        { freq: 196.00, detune: 0, gain: 0.11, type: 'sine' as OscillatorType },    // G3
        { freq: 196.50, detune: 3, gain: 0.08, type: 'triangle' as OscillatorType },// G3+
        { freq: 261.63, detune: 0, gain: 0.07, type: 'sine' as OscillatorType },    // C4
      ];

      droneFrequencies.forEach(item => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = item.type;
        osc.frequency.setValueAtTime(item.freq, now);
        osc.detune.setValueAtTime(item.detune, now);
        g.gain.setValueAtTime(item.gain, now);

        osc.connect(g);
        g.connect(filter);
        osc.start(now);
      });

      // Layer 3: Evolving Pentatonic Shimmer Harmonics (E4, G4, B4, D5, E5)
      const harmonicNotes = [329.63, 392.00, 493.88, 587.33, 659.25];
      harmonicGainsRef.current = [];

      harmonicNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        // Initial soft level
        const initG = idx === 0 ? 0.04 : 0.005;
        g.gain.setValueAtTime(initG, now);

        osc.connect(g);
        g.connect(filter);
        osc.start(now);

        harmonicGainsRef.current.push(g);
      });

      // Connect Filter -> Master Gain -> Audio Output
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      isInitializedRef.current = true;

      if (ctx.state === 'running') {
        setIsPlaying(!initialMuted);
      }

      // Layer 4: Living Atmosphere Pulse (slowly swells and shifts harmonics every 5 seconds)
      let step = 0;
      intervalRef.current = setInterval(() => {
        if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
        const cTime = audioCtxRef.current.currentTime;
        step++;
        harmonicGainsRef.current.forEach((gNode, index) => {
          const target = Math.sin(step * 0.7 + index * 1.3) * 0.025 + 0.035;
          const safeTarget = Math.max(0.001, target);
          try {
            gNode.gain.cancelScheduledValues(cTime);
            gNode.gain.linearRampToValueAtTime(safeTarget, cTime + 4.5);
          } catch (e) {}
        });
      }, 5000);

    } catch (e) {
      console.warn('Ambient audio init skipped:', e);
    }
  }, []);

  // Main lifecycle and browser gesture unlock
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMute = localStorage.getItem('tsehay_ambient_sound_muted');
    if (storedMute === 'true') {
      setIsMuted(true);
    }

    startAmbientEngine();

    // Browser policy unlock: resume immediately upon any user gesture
    const unlockAudio = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().then(() => {
          const isCurrentlyMuted = localStorage.getItem('tsehay_ambient_sound_muted') === 'true';
          if (!isCurrentlyMuted && masterGainRef.current && audioCtxRef.current) {
            masterGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
            masterGainRef.current.gain.exponentialRampToValueAtTime(
              0.09,
              audioCtxRef.current.currentTime + 1.2
            );
            setIsPlaying(true);
          }
        }).catch(() => {});
      } else if (audioCtxRef.current?.state === 'running') {
        const isCurrentlyMuted = localStorage.getItem('tsehay_ambient_sound_muted') === 'true';
        setIsPlaying(!isCurrentlyMuted);
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('scroll', unlockAudio, { passive: true });

    // Ducking Listeners: duck when video player or modal starts playing sound
    const handleDuck = () => {
      isDuckedRef.current = true;
      if (masterGainRef.current && audioCtxRef.current) {
        const cTime = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(cTime);
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.0001, cTime + 0.6);
      }
    };

    const handleRestore = () => {
      isDuckedRef.current = false;
      const isCurrentlyMuted = localStorage.getItem('tsehay_ambient_sound_muted') === 'true';
      if (!isCurrentlyMuted && masterGainRef.current && audioCtxRef.current) {
        const cTime = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(cTime);
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.09, cTime + 1.0);
      }
    };

    window.addEventListener('duck-ambient-audio', handleDuck);
    window.addEventListener('restore-ambient-audio', handleRestore);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
      window.removeEventListener('duck-ambient-audio', handleDuck);
      window.removeEventListener('restore-ambient-audio', handleRestore);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAmbientEngine]);

  // Toggle Mute / Unmute with silky smooth gain ramping
  const toggleMute = () => {
    if (!audioCtxRef.current) {
      startAmbientEngine();
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isMuted) {
      // Unmute: Ramp volume back up
      setIsMuted(false);
      localStorage.setItem('tsehay_ambient_sound_muted', 'false');
      if (masterGainRef.current && audioCtxRef.current && !isDuckedRef.current) {
        const cTime = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(cTime);
        masterGainRef.current.gain.setValueAtTime(Math.max(0.0001, masterGainRef.current.gain.value), cTime);
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.09, cTime + 1.0);
      }
      setIsPlaying(true);
    } else {
      // Mute: Ramp volume smoothly down to silence
      setIsMuted(true);
      localStorage.setItem('tsehay_ambient_sound_muted', 'true');
      if (masterGainRef.current && audioCtxRef.current) {
        const cTime = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(cTime);
        masterGainRef.current.gain.setValueAtTime(Math.max(0.0001, masterGainRef.current.gain.value), cTime);
        masterGainRef.current.gain.exponentialRampToValueAtTime(0.0001, cTime + 0.8);
      }
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 select-none notranslate" translate="no">
      <style jsx>{`
        @keyframes eq1 {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes eq2 {
          0%, 100% { height: 14px; }
          50% { height: 5px; }
        }
        @keyframes eq3 {
          0%, 100% { height: 7px; }
          50% { height: 17px; }
        }
        @keyframes eq4 {
          0%, 100% { height: 15px; }
          50% { height: 6px; }
        }
        .animate-eq-1 { animation: eq1 1.1s ease-in-out infinite; }
        .animate-eq-2 { animation: eq2 0.85s ease-in-out infinite; }
        .animate-eq-3 { animation: eq3 1.3s ease-in-out infinite; }
        .animate-eq-4 { animation: eq4 0.95s ease-in-out infinite; }
      `}</style>

      <button
        type="button"
        onClick={toggleMute}
        className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-2xl border transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.7)] cursor-pointer text-xs active:scale-95 ${
          !isMuted && isPlaying
            ? 'bg-[#0b1222]/90 hover:bg-[#0f1b33] border-[#f9b03c]/60 hover:border-[#f9b03c] text-white shadow-[0_0_25px_rgba(249,176,60,0.3)] ring-1 ring-[#f9b03c]/30'
            : isMuted
            ? 'bg-black/75 hover:bg-black/90 border-white/10 text-slate-400 hover:text-slate-200'
            : 'bg-[#080d1a]/85 hover:bg-[#0c1428] border-white/15 hover:border-[#f9b03c]/50 text-slate-300'
        }`}
        title={
          isMuted
            ? (lang === 'en' ? 'Unmute Ambient Soundscape' : 'የጀርባ ሙዚቃ ክፈት')
            : (lang === 'en' ? 'Mute Ambient Soundscape' : 'የጀርባ ሙዚቃ አጥፋ')
        }
      >
        {/* Glow ambient bloom */}
        {!isMuted && isPlaying && (
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#f9b03c]/30 via-amber-500/20 to-[#3268ba]/30 blur-sm pointer-events-none -z-10 animate-pulse" />
        )}

        {/* Dynamic 4-Bar Equalizer Visualizer (lusion.co style) */}
        <div className="flex items-end gap-[2px] h-4 w-4 shrink-0 pb-0.5 justify-center">
          {!isMuted && isPlaying ? (
            <>
              <span className="w-[2.5px] rounded-full bg-[#f9b03c] animate-eq-1" />
              <span className="w-[2.5px] rounded-full bg-[#f9b03c] animate-eq-2" />
              <span className="w-[2.5px] rounded-full bg-[#f9b03c] animate-eq-3" />
              <span className="w-[2.5px] rounded-full bg-[#f9b03c] animate-eq-4" />
            </>
          ) : (
            <div className="flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
              <i className="fa-solid fa-volume-xmark text-xs" />
            </div>
          )}
        </div>

        {/* Text & Status Badge */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-tight">
          <span className={!isMuted && isPlaying ? 'text-[#f9b03c]' : 'text-slate-400'}>
            {!isMuted && isPlaying ? 'SOUND' : 'MUTED'}
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-500 hidden sm:inline-block" />
          <span className="text-[10px] text-slate-400 hidden sm:inline font-sans">
            {!isMuted && isPlaying 
              ? (lang === 'en' ? 'Ambient' : 'የጀርባ ሙዚቃ') 
              : (lang === 'en' ? 'Off' : 'ጠፍቷል')}
          </span>
        </div>
      </button>
    </div>
  );
}
