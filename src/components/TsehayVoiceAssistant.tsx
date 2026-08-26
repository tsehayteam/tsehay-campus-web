'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

// 🔤 Amharic Homophone & Dialect Normalizer
function normalizeAmharic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[ሐኀኃ]/g, 'ሀ')
    .replace(/[ሁሑኁ]/g, 'ሁ')
    .replace(/[ሂሒኚኂ]/g, 'ሂ')
    .replace(/[ሃሓኃ]/g, 'ሃ')
    .replace(/[ሄሔኄ]/g, 'ሄ')
    .replace(/[ህሕኅ]/g, 'ህ')
    .replace(/[ሆሖኆ]/g, 'ሆ')
    .replace(/[ሠ]/g, 'ሰ')
    .replace(/[ሡ]/g, 'ሱ')
    .replace(/[ሢ]/g, 'ሲ')
    .replace(/[ሣ]/g, 'ሳ')
    .replace(/[ሤ]/g, 'ሴ')
    .replace(/[ሥ]/g, 'ስ')
    .replace(/[ሦ]/g, 'ሶ')
    .replace(/[ዐ]/g, 'አ')
    .replace(/[ዑ]/g, 'ኡ')
    .replace(/[ዒ]/g, 'ኢ')
    .replace(/[ዓ]/g, 'ኣ')
    .replace(/[ዔ]/g, 'ኤ')
    .replace(/[ዕ]/g, 'እ')
    .replace(/[ዖ]/g, 'ኦ')
    .replace(/[ፀ]/g, 'ጸ')
    .replace(/[ፁ]/g, 'ጹ')
    .replace(/[ፂ]/g, 'ጺ')
    .replace(/[ፃ]/g, 'ጻ')
    .replace(/[ፄ]/g, 'ጼ')
    .replace(/[ፅ]/g, 'ጽ')
    .replace(/[ፆ]/g, 'ጾ')
    .replace(/[ዪ]/g, 'ይ')
    .replace(/[፣።፤፦]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function TsehayVoiceAssistant() {
  const router = useRouter();

  // Assistant Lifecycle States
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiSpeech, setAiSpeech] = useState('');
  const [micVolume, setMicVolume] = useState(0);

  // References
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const isWaveActiveRef = useRef<boolean>(false);
  const assistantStateRef = useRef<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const activeTranscriptRef = useRef<string>('');

  isWaveActiveRef.current = isWaveActive;
  assistantStateRef.current = assistantState;

  // 🔊 Synthesize High-Tech Ambient Chime
  const playChime = useCallback((type: 'wake' | 'success' | 'dismiss') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'wake') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18); // C6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'dismiss') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.16);
        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {}
  }, []);

  // 🛑 Stop Voice Audio Instantly (Barge-in / Interruption)
  const stopVoiceOutput = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // 🎙️ Web Audio Volume Analyser for Live Wave Reactivity
  const startAudioAnalyser = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      if (mediaStreamRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVol = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(avg / 45, 2.5);
        setMicVolume(normalized);

        // Instant interruption cutoff if user speaks while AI speaks
        if (assistantStateRef.current === 'speaking' && normalized > 0.22) {
          stopVoiceOutput();
          setAssistantState('listening');
        }

        requestAnimationFrame(updateVol);
      };
      updateVol();
    } catch (e) {}
  };

  // 🗣️ Voice Output (Native Edge TTS with Fallback to window.speechSynthesis)
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    stopVoiceOutput();
    setAssistantState('speaking');

    const cleanText = text.replace(/[*_~`#\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
    const isEng = /^[a-zA-Z0-9\s?,.!'":;@#$%^&*()_\-+=\[\]{}]+$/.test(cleanText);
    const lang = isEng ? 'en' : 'am';

    const finishSpeech = () => {
      setAssistantState('idle');
      if (onEnd) onEnd();
    };

    try {
      const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      audio.onended = finishSpeech;
      audio.onerror = () => {
        // Fallback to local window.speechSynthesis
        try {
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = isEng ? 'en-US' : 'am-ET';
            utterance.rate = 1.0;
            utterance.onend = finishSpeech;
            utterance.onerror = finishSpeech;
            window.speechSynthesis.speak(utterance);
          } else {
            finishSpeech();
          }
        } catch (err) {
          finishSpeech();
        }
      };

      audio.play().catch(() => {
        finishSpeech();
      });
    } catch (e) {
      finishSpeech();
    }
  }, [stopVoiceOutput]);

  // 🧠 Process User Voice Command via Backend Gemini API
  const handleCommand = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;

    // Filter out pure wake word if spoken alone
    const norm = normalizeAmharic(rawText);
    if (/^(ሰላም\s*ጸሀይ|ሰላም\s*ፀሐይ|ጸሀይ|ፀሐይ|hey\s*tsehay|hello\s*tsehay)$/i.test(norm)) {
      setAssistantState('speaking');
      const greeting = 'ሰላም! ምን ልርዳዎት?';
      setAiSpeech(greeting);
      speakText(greeting, () => {
        setAssistantState('listening');
      });
      return;
    }

    setAssistantState('processing');

    try {
      const response = await fetch('/api/ai/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: rawText, language: 'am' })
      });

      if (response.ok) {
        const data = await response.json();
        const speech = data.speech || 'እሺ፣ ተከናውኗል።';
        setAiSpeech(speech);

        // Execute dictated actions
        if (data.action === 'route' && data.path) {
          speakText(speech, () => {
            router.push(data.path);
            scheduleDismissWave(1200);
          });
          return;
        }

        if (data.action === 'modal' && data.modal) {
          speakText(speech, () => {
            if (data.modal === 'payment') {
              window.dispatchEvent(new CustomEvent('open-payment-modal'));
            } else if (data.modal === 'auth') {
              window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: data.isSignupMode } }));
            }
            scheduleDismissWave(1200);
          });
          return;
        }

        // Default Reply
        speakText(speech, () => {
          scheduleDismissWave(2500);
        });
      } else {
        const fallback = 'ጥያቄዎ ደርሶኛል! ስለ ፀሐይ ካምፓስ ዝርዝር መረጃ የኮርሶችን ገጽ መመልከት ይችላሉ።';
        setAiSpeech(fallback);
        speakText(fallback, () => scheduleDismissWave(2500));
      }
    } catch (e) {
      const fallback = 'ጥያቄዎ ደርሶኛል! ለተጨማሪ ዝርዝር በስልክ 0980209090 ሊያገኙን ይችላሉ።';
      setAiSpeech(fallback);
      speakText(fallback, () => scheduleDismissWave(2500));
    }
  }, [router, speakText]);

  // Dismiss Jarvis Wave smoothly
  const scheduleDismissWave = useCallback((delayMs: number = 2000) => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => {
      setIsWaveActive(false);
      setAssistantState('idle');
      setTranscript('');
      setAiSpeech('');
      activeTranscriptRef.current = '';
      playChime('dismiss');
    }, delayMs);
  }, [playChime]);

  // 👂 Wake Word Detection & Continuous Speech Recognition Loop
  const startContinuousListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'am-ET';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 2;

      recognition.onstart = () => {
        startAudioAnalyser();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        const fullHeard = (finalStr + ' ' + interimStr).trim();
        const norm = normalizeAmharic(fullHeard);

        // 1. WAKE WORD DETECTION (Hands-Free Activation)
        const isWake = 
          /ሰላም\s*ጸሀይ|ሰላም\s*ፀሐይ|ጸሀይ|ፀሐይ|hey\s*tsehay|hello\s*tsehay|tsehay/i.test(norm) ||
          /hey tsehay|hello tsehay|tsehay/i.test(fullHeard.toLowerCase());

        if (isWake && !isWaveActiveRef.current) {
          setIsWaveActive(true);
          setAssistantState('listening');
          setTranscript('');
          setAiSpeech('');
          activeTranscriptRef.current = '';
          playChime('wake');

          // If wake phrase had a trailing command (e.g. "ፀሐይ ወደ ኮርሶች ውሰደኝ")
          const stripped = fullHeard
            .replace(/ሰላም\s*ጸሀይ|ሰላም\s*ፀሐይ|ጸሀይ|ፀሐይ|hey\s*tsehay|hello\s*tsehay/gi, '')
            .trim();

          if (stripped.length > 2) {
            setTranscript(stripped);
            activeTranscriptRef.current = stripped;
            handleCommand(stripped);
            return;
          }
        }

        // 2. ACTIVE COMMAND PROCESSING
        if (isWaveActiveRef.current && fullHeard.length > 0) {
          setTranscript(fullHeard);
          activeTranscriptRef.current = fullHeard;

          // Clear previous silence timeout
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

          silenceTimerRef.current = setTimeout(() => {
            if (activeTranscriptRef.current.trim() && assistantStateRef.current !== 'processing') {
              handleCommand(activeTranscriptRef.current.trim());
            }
          }, 1200);
        }
      };

      recognition.onerror = () => {
        // Silently recover on network / no-speech timeouts
      };

      recognition.onend = () => {
        // Automatically restart continuous recognition loop in background
        setTimeout(() => {
          startContinuousListening();
        }, 300);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setTimeout(() => {
        startContinuousListening();
      }, 1000);
    }
  }, [handleCommand, playChime]);

  // Request Mic Permission & Start Background Engine On Mount
  useEffect(() => {
    startContinuousListening();

    const handleUserInteraction = () => {
      startAudioAnalyser();
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [startContinuousListening]);

  // 🌊 🎨 Cinematic Bottom-Anchored Jarvis Waveform Visualizer (Golden Yellow #f9b03c & Royal Blue #3268ba)
  useEffect(() => {
    if (!isWaveActive) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height * 0.75; // Anchored gracefully towards the bottom

      const isSpeakingState = assistantState === 'speaking';
      const energy = isSpeakingState 
        ? 1.2 + Math.sin(step * 0.12) * 0.35
        : Math.max(0.35, micVolume * 1.5);

      // Brand Colors: Golden Yellow (#f9b03c) & Royal Blue (#3268ba) + Electric Cyan Highlights
      const waves = [
        { color: 'rgba(249, 176, 60, 0.85)', freq: 0.018, amp: 26 * energy, speed: 0.05, phase: 0 },
        { color: 'rgba(50, 104, 186, 0.80)', freq: 0.014, amp: 30 * energy, speed: -0.04, phase: Math.PI / 2 },
        { color: 'rgba(255, 214, 10, 0.70)', freq: 0.022, amp: 20 * energy, speed: 0.06, phase: Math.PI },
        { color: 'rgba(0, 240, 255, 0.75)', freq: 0.016, amp: 24 * energy, speed: -0.05, phase: Math.PI * 1.5 }
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = w.color;
        ctx.shadowBlur = 18;
        ctx.shadowColor = w.color;
        ctx.lineCap = 'round';

        for (let x = 0; x <= width; x += 4) {
          // Bell-curve envelope to anchor wave nicely across screen edges
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * w.freq + step * w.speed + w.phase) * (w.amp * envelope);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Bottom Radiant Energy Core Glow
      const centerGlow = ctx.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, width * 0.45);
      centerGlow.addColorStop(0, 'rgba(249, 176, 60, 0.25)');
      centerGlow.addColorStop(0.4, 'rgba(50, 104, 186, 0.15)');
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(width / 2, centerY, width * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      step += 1;
      animationFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isWaveActive, assistantState, micVolume]);

  return (
    <>
      {/* 🌊 CINEMATIC JARVIS-STYLE BOTTOM-ANCHORED WAVE VISUALIZER */}
      <div 
        className={`fixed bottom-0 left-0 w-full z-[9999] pointer-events-none transition-all duration-700 ease-out flex flex-col items-center justify-end pb-4 ${
          isWaveActive 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Deep Dark Ambient Glow Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent h-48 sm:h-56 -z-10" />

        {/* Dynamic Holographic Subtitle Pill */}
        <div className="max-w-md w-[92vw] px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(249,176,60,0.25)] flex flex-col items-center text-center mb-2 animate-in fade-in duration-300">
          
          {/* Status Header Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#f9b03c]">
              {assistantState === 'listening' ? 'Tsehay AI • እየሰማሁ ነው...' : assistantState === 'processing' ? 'Tsehay AI • በማዘጋጀት ላይ...' : 'Tsehay AI • በመናገር ላይ...'}
            </span>
          </div>

          {/* User Transcript */}
          {transcript && (
            <p className="text-xs font-bold text-white leading-relaxed mb-1">
              <span className="text-gray-400 mr-1">እርስዎ:</span>
              "{transcript}"
            </p>
          )}

          {/* AI Spoken Answer */}
          {aiSpeech && (
            <p className="text-xs font-bold text-[#f9b03c] leading-relaxed">
              {aiSpeech}
            </p>
          )}
        </div>

        {/* Full-Width Canvas for Fluid Golden Yellow & Royal Blue Sine Waves */}
        <div className="w-full h-20 sm:h-24 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={typeof window !== 'undefined' ? window.innerWidth : 1200}
            height={96}
            className="w-full h-full object-cover filter drop-shadow-[0_0_15px_rgba(249,176,60,0.8)]"
          />
        </div>
      </div>
    </>
  );
}
