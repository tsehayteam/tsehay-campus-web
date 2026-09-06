'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * 🎵 Ambient Intro Audio Synthesizer (Web Audio API)
 * Plays an inspiring, warm, harmonic e-learning welcome chime on site entry.
 * Completely synthesized with zero external audio assets for blazing fast speed.
 */
export default function AmbientIntroAudio() {
  const { lang } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasTriggeredRef = useRef(false);

  const playWelcomeChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      setIsPlaying(true);

      // Warm, uplifting E-learning chord: C4 (261.63), G4 (392.00), C5 (523.25), E5 (659.25)
      const chordNotes = [
        { freq: 261.63, delay: 0.00, gain: 0.12, type: 'sine' as OscillatorType },
        { freq: 392.00, delay: 0.08, gain: 0.10, type: 'triangle' as OscillatorType },
        { freq: 523.25, delay: 0.16, gain: 0.09, type: 'sine' as OscillatorType },
        { freq: 659.25, delay: 0.24, gain: 0.08, type: 'triangle' as OscillatorType },
        { freq: 783.99, delay: 0.32, gain: 0.05, type: 'sine' as OscillatorType },
      ];

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.85, now + 0.1);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      // Lowpass filter for smooth, warm ambient pad texture
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 2.5);

      masterGain.connect(filter);
      filter.connect(ctx.destination);

      chordNotes.forEach((note) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = note.type;
        osc.frequency.setValueAtTime(note.freq, now + note.delay);

        noteGain.gain.setValueAtTime(0.001, now + note.delay);
        noteGain.gain.exponentialRampToValueAtTime(note.gain, now + note.delay + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + 2.4);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + note.delay);
        osc.stop(now + note.delay + 2.5);
      });

      setTimeout(() => {
        setIsPlaying(false);
      }, 2800);
    } catch (e) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check mute preference
    const storedMute = localStorage.getItem('tsehay_ambient_sound_muted');
    if (storedMute === 'true') {
      setIsMuted(true);
      return;
    }

    // Check session play state so it only triggers gently on first arrival
    const hasPlayedInSession = sessionStorage.getItem('tsehay_welcome_audio_played');
    if (hasPlayedInSession === 'true') {
      return;
    }

    const triggerOnce = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      sessionStorage.setItem('tsehay_welcome_audio_played', 'true');
      playWelcomeChime();
      cleanupListeners();
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointerdown', triggerOnce);
      window.removeEventListener('keydown', triggerOnce);
      window.removeEventListener('scroll', triggerOnce);
    };

    // Attempt direct subtle playback or listen for first interaction
    try {
      playWelcomeChime();
      hasTriggeredRef.current = true;
      sessionStorage.setItem('tsehay_welcome_audio_played', 'true');
    } catch (e) {
      window.addEventListener('pointerdown', triggerOnce, { once: true, passive: true });
      window.addEventListener('keydown', triggerOnce, { once: true, passive: true });
      window.addEventListener('scroll', triggerOnce, { once: true, passive: true });
    }

    return () => cleanupListeners();
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      localStorage.setItem('tsehay_ambient_sound_muted', 'false');
      playWelcomeChime();
    } else {
      setIsMuted(true);
      localStorage.setItem('tsehay_ambient_sound_muted', 'true');
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        onClick={toggleMute}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-lg cursor-pointer text-xs select-none ${
          isPlaying
            ? 'bg-[#f9b03c]/20 border-[#f9b03c] text-[#f9b03c] shadow-[0_0_20px_rgba(249,176,60,0.5)] scale-105'
            : isMuted
            ? 'bg-black/60 hover:bg-black/80 border-white/10 text-gray-500 hover:text-gray-300'
            : 'bg-[#0a1122]/85 hover:bg-[#0f1b33] border-white/15 hover:border-[#f9b03c]/50 text-slate-300 hover:text-white'
        }`}
        title={
          isMuted
            ? (lang === 'en' ? 'Unmute Ambient Sound' : 'የመክፈቻ ድምፅ አብራ')
            : (lang === 'en' ? 'Mute Ambient Sound' : 'የመክፈቻ ድምፅ አጥፋ')
        }
      >
        <div className="relative flex items-center justify-center">
          {isPlaying ? (
            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping absolute" />
          ) : null}
          <i
            className={`fa-solid ${
              isMuted
                ? 'fa-volume-xmark text-[11px]'
                : isPlaying
                ? 'fa-waveform-lines text-[11px] text-[#f9b03c]'
                : 'fa-volume-high text-[11px] text-[#f9b03c]'
            }`}
          />
        </div>
        <span className="text-[10.5px] font-bold tracking-tight hidden sm:inline">
          {isMuted
            ? (lang === 'en' ? 'Sound Off' : 'ድምፅ ጠፍቷል')
            : (lang === 'en' ? 'Ambient Audio' : 'የመክፈቻ ድምፅ')}
        </span>
      </button>
    </div>
  );
}
