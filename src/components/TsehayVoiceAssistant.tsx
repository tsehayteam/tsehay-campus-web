'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

export default function TsehayVoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();

  // Component UI States
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState('ለመጀመር ይናገሩ ወይም ማይክሮፎኑን ይጫኑ');
  const [micVolume, setMicVolume] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isStandbyActive, setIsStandbyActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tsehay_voice_standby') !== 'false';
    }
    return true;
  });

  // References
  const recognitionRef = useRef<any>(null);
  const standbyRecognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTranscriptRef = useRef<string>('');

  // 🔊 Futuristic Sci-Fi Audio Chimes Synthesis (Web Audio API)
  const playSciFiSound = useCallback((type: 'activate' | 'success' | 'close' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'activate') {
        // Gemini / Siri style rising dual-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        // Futuristic success chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        osc.frequency.setValueAtTime(1174.66, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'close') {
        // Soft descending exit tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'error') {
        // Error warning tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {}
  }, []);

  // 🗣️ Native Audible Amharic Voice Output (Natural TTS Engine with Play/Pause support)
  const speakVoice = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    try {
      // 1. Stop any pending audio or browser speech
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      setIsSpeaking(true);
      setIsAudioPaused(false);
      const cleanText = text.replace(/[*_~`#\n]/g, ' ').trim();
      const encodedText = encodeURIComponent(cleanText);

      // 2. Play natural crystal-clear Amharic audio stream via /api/ai/tts
      const ttsUrl = `/api/ai/tts?text=${encodedText}&lang=am`;
      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsAudioPaused(false);
        currentAudioRef.current = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        // Fallback to Web Speech API SpeechSynthesis if network stream fails
        try {
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'am-ET';
            utterance.rate = 0.95;
            utterance.pitch = 1.05;
            utterance.onend = () => {
              setIsSpeaking(false);
              setIsAudioPaused(false);
              if (onEnd) onEnd();
            };
            utterance.onerror = () => {
              setIsSpeaking(false);
              setIsAudioPaused(false);
              if (onEnd) onEnd();
            };
            window.speechSynthesis.speak(utterance);
            return;
          }
        } catch (e) {}
        setIsSpeaking(false);
        setIsAudioPaused(false);
        if (onEnd) onEnd();
      };

      audio.play().catch(() => {
        try {
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'am-ET';
            utterance.onend = () => { setIsSpeaking(false); setIsAudioPaused(false); onEnd?.(); };
            utterance.onerror = () => { setIsSpeaking(false); setIsAudioPaused(false); onEnd?.(); };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsSpeaking(false);
            setIsAudioPaused(false);
            if (onEnd) onEnd();
          }
        } catch (e) {
          setIsSpeaking(false);
          setIsAudioPaused(false);
          if (onEnd) onEnd();
        }
      });
    } catch (e) {
      console.warn('speakVoice error:', e);
      setIsSpeaking(false);
      setIsAudioPaused(false);
      if (onEnd) onEnd();
    }
  }, []);

  // ⏯️ Toggle Play / Pause for AI Spoken Voice Output
  const togglePlayPauseAudio = () => {
    if (currentAudioRef.current) {
      if (isAudioPaused) {
        currentAudioRef.current.play().then(() => {
          setIsAudioPaused(false);
          setIsSpeaking(true);
        }).catch(() => {});
      } else {
        currentAudioRef.current.pause();
        setIsAudioPaused(true);
        setIsSpeaking(false);
      }
    } else if (aiResponse) {
      speakVoice(aiResponse);
    }
  };

  // 🎙️ Setup Microphone Volume Analyser (For Real-time Wave reactivity)
  const setupAudioAnalyser = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
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

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicVolume(Math.min(average / 80, 1.8));
        if (isListening) {
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
    } catch (err) {}
  };

  const stopAudioAnalyser = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicVolume(0);
  };

  // 🧠 Intelligent Voice Command Router & Full Amharic Multi-turn Conversation
  const handleVoiceCommand = useCallback(async (spokenText: string) => {
    if (!spokenText.trim()) return;

    setIsListening(false);
    stopSpeechRecognition();
    stopAudioAnalyser();

    const normalized = spokenText.trim().toLowerCase();
    setStatusMessage('ምላሽ በማዘጋጀት ላይ...');
    playSciFiSound('success');

    // 1. All Courses Command ("ወደ ኮርሶች ውሰደኝ" / "ኮርሶችን አሳየኝ")
    if (
      normalized.includes('ኮርስ') ||
      normalized.includes('ኮርሶች') ||
      normalized.includes('ትምህርት') ||
      normalized.includes('ትምህርቶች') ||
      normalized.includes('ስልጠና') ||
      normalized.includes('ስልጠናዎች') ||
      normalized.includes('courses') ||
      normalized.includes('course')
    ) {
      const msg = 'እሺ፣ ወደ ኮርሶች ዝርዝር እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/courses');
      });
      return;
    }

    // 2. Checkout / Payment / Pricing Command ("ክፍያ እንዴት ነው?")
    if (
      normalized.includes('ክፍያ') ||
      normalized.includes('መክፈል') ||
      normalized.includes('ዋጋ') ||
      normalized.includes('ብር') ||
      normalized.includes('ታሪፍ') ||
      normalized.includes('መግዛት') ||
      normalized.includes('ቴሌብር') ||
      normalized.includes('pay') ||
      normalized.includes('payment') ||
      normalized.includes('checkout') ||
      normalized.includes('price') ||
      normalized.includes('pricing')
    ) {
      const msg = 'እሺ፣ የክፍያ አማራጮችን ከፍቼልዎታለሁ። በቴሌብር፣ በሲቢኢ ወይም በካርድ መክፈል ይችላሉ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-payment-modal'));
      });
      return;
    }

    // 3. Login / Register Command ("ግባ" ወይም "ሎጊን አድርግ" / "ተመዝገብ")
    if (
      normalized.includes('ግባ') ||
      normalized.includes('ሎጊን') ||
      normalized.includes('መግባት') ||
      normalized.includes('ተመዝገብ') ||
      normalized.includes('ምዝገባ') ||
      normalized.includes('ይመዝገቡ') ||
      normalized.includes('መለያ') ||
      normalized.includes('login') ||
      normalized.includes('sign in') ||
      normalized.includes('sign up') ||
      normalized.includes('register')
    ) {
      const isSignup = normalized.includes('ተመዝገብ') || normalized.includes('ምዝገባ') || normalized.includes('sign up') || normalized.includes('register');
      const msg = isSignup ? 'እሺ፣ የመመዝገቢያ ገጽ ከፍቼልዎታለሁ።' : 'እሺ፣ የመግቢያ ገጽ ከፍቼልዎታለሁ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: isSignup, isSignUp: isSignup } }));
      });
      return;
    }

    // 4. Home Page Command ("መነሻ" / "ወደ ቤት")
    if (
      normalized.includes('መነሻ') ||
      normalized.includes('ዋና ገጽ') ||
      normalized.includes('ወደ ቤት') ||
      normalized.includes('ሆም') ||
      normalized.includes('home') ||
      normalized.includes('main page')
    ) {
      const msg = 'እሺ፣ ወደ ዋናው መነሻ ገጽ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        if (pathname === '/') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          router.push('/');
        }
      });
      return;
    }

    // 5. YouTube Videos Showcase Command ("ነፃ የዩቲዩብ ቪዲዮዎች")
    if (
      normalized.includes('ዩቲዩብ') ||
      normalized.includes('youtube') ||
      normalized.includes('ቪዲዮ') ||
      normalized.includes('ቪዲዮዎች') ||
      normalized.includes('ነፃ ቪዲዮ')
    ) {
      const msg = 'እሺ፣ ነፃ የዩቲዩብ ስልጠናዎችንና ቪዲዮዎችን ይመልከቱ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        const ytSection = document.getElementById('youtube-videos-section');
        if (ytSection) {
          ytSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          router.push('/#youtube-videos-section');
        }
      });
      return;
    }

    // 6. About Us Command ("ስለ እኛ" / "ስለ ፀሐይ ካምፓስ")
    if (
      normalized.includes('ስለ እኛ') ||
      normalized.includes('ስለ እናንተ') ||
      normalized.includes('ስለ ካምፓሱ') ||
      normalized.includes('ስለ ፀሐይ') ||
      normalized.includes('ማናችሁ') ||
      normalized.includes('about') ||
      normalized.includes('about us')
    ) {
      const msg = 'እሺ፣ ስለ ፀሐይ ካምፓስ ዝርዝር መረጃ ወደያዘው ገጽ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/about');
      });
      return;
    }

    // 7. Classroom / Dashboard Command ("መማሪያ ክፍል")
    if (
      normalized.includes('መማሪያ') ||
      normalized.includes('ክፍል') ||
      normalized.includes('ዳሽቦርድ') ||
      normalized.includes('ትምህርቴ') ||
      normalized.includes('የኔ ኮርሶች') ||
      normalized.includes('dashboard') ||
      normalized.includes('classroom')
    ) {
      const msg = 'እሺ፣ ወደ መማሪያ ዳሽቦርድዎ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/dashboard');
      });
      return;
    }

    // 8. Full Multi-Turn Conversational Amharic AI Response (Gemini Engine)
    setIsAiProcessing(true);
    setStatusMessage('Tsehay AI መልስ በማመንጨት ላይ...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User voice query: "${spokenText}". Answer concisely in 1 to 2 clear, natural Amharic sentences. Be warm, direct and helpful.`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.reply || data.text || 'ጥያቄዎ ደርሶኛል! ተጨማሪ መረጃ ለማግኘት በቻት ሊያናግሩን ይችላሉ።';
        setAiResponse(reply);
        speakVoice(reply);
      } else {
        const defaultReply = 'ጥያቄዎ ደርሶኛል! ስለ ፀሐይ ካምፓስ ኮርሶች፣ ዋጋ እና ምዝገባ በዝርዝር የኮርሶች ገጻችንን ይመልከቱ።';
        setAiResponse(defaultReply);
        speakVoice(defaultReply);
      }
    } catch (e) {
      const fallbackReply = 'ጥያቄዎ ደርሶኛል! ለተጨማሪ ዝርዝር የኮርሶች ገጻችንን መመልከት ወይም በቻት መፃፍ ይችላሉ።';
      setAiResponse(fallbackReply);
      speakVoice(fallbackReply);
    } finally {
      setIsAiProcessing(false);
    }
  }, [pathname, router, speakVoice, playSciFiSound]);

  // 🎙️ Speech Recognition Engine Initialization (Active Mode with Gemini-style Pause/Silence Detection)
  const startSpeechRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('ይቅርታ፣ የእርስዎ ብራውዘር የድምፅ ማወቂያ አይደግፍም። Chrome ወይም Edge ይጠቀሙ።');
      playSciFiSound('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'am-ET';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('እየሰማሁ ነው... (Listening...)');
        setTranscript('');
        setInterimTranscript('');
        activeTranscriptRef.current = '';
        setupAudioAnalyser();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript;
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (interimStr) {
          setInterimTranscript(interimStr);
        }

        const fullCurrent = (finalStr ? (activeTranscriptRef.current ? activeTranscriptRef.current + ' ' + finalStr : finalStr) : (activeTranscriptRef.current ? activeTranscriptRef.current + ' ' + interimStr : interimStr)).trim();

        if (finalStr) {
          activeTranscriptRef.current = (activeTranscriptRef.current ? activeTranscriptRef.current + ' ' + finalStr : finalStr).trim();
          setTranscript(activeTranscriptRef.current);
          setInterimTranscript('');
        }

        // ⏱️ Gemini Live Style VAD (Voice Activity Detection):
        // When the user stops speaking / pauses for 1.8 seconds ("ሁለት ሶስት ሰከንድ ዝም ካልኩት"),
        // it automatically transitions to answering mode!
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (fullCurrent.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            const spokenToProcess = activeTranscriptRef.current || fullCurrent;
            if (spokenToProcess.trim()) {
              handleVoiceCommand(spokenToProcess);
            }
          }, 1800);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setStatusMessage('የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ ማይክሮፎን ይፍቀዱ።');
          playSciFiSound('error');
          setIsListening(false);
          stopAudioAnalyser();
        } else if (event.error === 'no-speech') {
          setStatusMessage('ምንም ድምፅ አልተሰማም። ማይክሮፎኑን በመጫን እንደገና ይናገሩ...');
        }
      };

      recognition.onend = () => {
        if (isListening) {
          setIsListening(false);
          stopAudioAnalyser();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsListening(false);
      stopAudioAnalyser();
    }
  }, [handleVoiceCommand, playSciFiSound]);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    stopAudioAnalyser();
  };

  // 🎙️ Handle Mic Tap (Manual Pause / Stop Listening -> Immediate Answer Transition)
  const handleMicToggle = () => {
    if (isListening) {
      // User tapped mic while speaking -> Immediately stop listening & transition to answering!
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      const spoken = (activeTranscriptRef.current || transcript || interimTranscript).trim();
      if (spoken) {
        handleVoiceCommand(spoken);
      } else {
        setStatusMessage('ማዳመጥ ቆሟል (Listening paused)');
      }
    } else {
      // If AI is speaking, stop speaking and start listening
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        setIsSpeaking(false);
        setIsAudioPaused(false);
      }
      startSpeechRecognition();
    }
  };

  // Open Assistant Flow
  const openAssistant = useCallback(() => {
    setIsOpen(true);
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('');
    setStatusMessage('ሰላም፣ ምን ልርዳዎት?');
    playSciFiSound('activate');

    // 🔊 Greet in natural Amharic
    speakVoice('ሰላም፣ ምን ልርዳዎት?', () => {
      startSpeechRecognition();
    });
  }, [playSciFiSound, speakVoice, startSpeechRecognition]);

  // Close Assistant Flow
  const closeAssistant = useCallback(() => {
    playSciFiSound('close');
    stopSpeechRecognition();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsAudioPaused(false);
    setIsOpen(false);
  }, [playSciFiSound]);

  // Toggle Assistant Button
  const toggleAssistant = () => {
    if (isOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  };

  // 👂 🌟 "Hey Siri" Style Standby Wake Word Listener Engine ("Hey Tsehay", "ሰላም ፀሐይ")
  useEffect(() => {
    if (typeof window === 'undefined' || !isStandbyActive || isOpen) {
      if (standbyRecognitionRef.current) {
        try { standbyRecognitionRef.current.abort(); } catch (e) {}
        standbyRecognitionRef.current = null;
      }
      return;
    }

    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let isRestarting = false;

    const startStandby = () => {
      if (isOpen || !isStandbyActive) return;
      try {
        const standby = new SpeechRecognition();
        standby.lang = 'am-ET';
        standby.continuous = true;
        standby.interimResults = true;
        standby.maxAlternatives = 1;

        standby.onresult = (event: SpeechRecognitionEvent) => {
          let heard = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            heard += event.results[i][0].transcript.toLowerCase();
          }

          const isWakeWord = 
            heard.includes('hey tsehay') ||
            heard.includes('hay tsehay') ||
            heard.includes('hi tsehay') ||
            heard.includes('hello tsehay') ||
            heard.includes('tsehay') ||
            heard.includes('ሰላም ፀሐይ') ||
            heard.includes('ሰላም ጸሐይ') ||
            heard.includes('ሄይ ፀሐይ') ||
            heard.includes('ሄይ ጸሐይ') ||
            heard.includes('ሃይ ፀሐይ') ||
            heard.includes('ሄሎ ፀሐይ') ||
            heard.includes('ፀሐይ') ||
            heard.includes('ጸሐይ');

          if (isWakeWord) {
            try { standby.abort(); } catch(e) {}
            openAssistant();
          }
        };

        standby.onerror = (err: SpeechRecognitionErrorEvent) => {
          if (err.error !== 'no-speech') {
            console.debug('Standby listener event:', err.error);
          }
        };

        standby.onend = () => {
          if (isStandbyActive && !isOpen && !isRestarting) {
            isRestarting = true;
            setTimeout(() => {
              isRestarting = false;
              startStandby();
            }, 800);
          }
        };

        standbyRecognitionRef.current = standby;
        standby.start();
      } catch (e) {
        console.debug('Standby start deferred:', e);
      }
    };

    startStandby();

    return () => {
      if (standbyRecognitionRef.current) {
        try { standbyRecognitionRef.current.abort(); } catch (e) {}
        standbyRecognitionRef.current = null;
      }
    };
  }, [isStandbyActive, isOpen, openAssistant]);

  // ⌨️ Keyboard Shortcut Listener (Ctrl + M or Cmd + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleAssistant();
      }
      if (e.key === 'Escape' && isOpen) {
        closeAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleAssistant, closeAssistant]);

  // 🎨 Gemini Live Aurora Glowing Sound Waves (Canvas Render)
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Gemini dynamic amplitude
      const dynamicAmp = isListening ? 16 + micVolume * 45 : isSpeaking && !isAudioPaused ? 22 : 6;

      // Google Gemini 4-Color Glowing Aurora Sound Waves
      const waves = [
        { color: 'rgba(56, 189, 248, 0.95)', lineWidth: 3.0, freq: 0.024, speed: 0.08, ampMult: 1.0 }, // Cyan
        { color: 'rgba(99, 102, 241, 0.9)', lineWidth: 2.5, freq: 0.019, speed: -0.06, ampMult: 0.8 },  // Indigo
        { color: 'rgba(168, 85, 247, 0.85)', lineWidth: 2.2, freq: 0.028, speed: 0.09, ampMult: 0.65 }, // Purple
        { color: 'rgba(245, 158, 11, 0.8)', lineWidth: 2.0, freq: 0.016, speed: -0.05, ampMult: 0.5 },  // Amber
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;
        ctx.shadowBlur = 14;
        ctx.shadowColor = w.color;

        for (let x = 0; x < width; x++) {
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * w.freq + step * w.speed) *
            Math.cos(x * 0.012 + step * 0.025) *
            dynamicAmp *
            w.ampMult *
            envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      step += 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, isListening, isSpeaking, isAudioPaused, micVolume]);

  return (
    <>
      {/* 🌟 1. PERSISTENT FLOATING MICROPHONE TRIGGER BUTTON */}
      <div 
        className="fixed bottom-6 right-20 sm:bottom-6 sm:right-48 md:sm:right-52 z-[9985] flex flex-col items-end gap-2 select-none"
        style={{ willChange: 'transform' }}
      >
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="Tsehay Voice Assistant (Hello Tsehay)"
          className={`relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 cursor-pointer ${
            isOpen 
              ? 'bg-gradient-to-tr from-cyan-500 via-indigo-500 to-[#f9b03c] scale-105 border-2 border-white'
              : 'bg-gradient-to-tr from-[#030509] via-[#080d1a] to-[#121c33] border-2 border-cyan-400/60 hover:border-cyan-400 hover:scale-110'
          }`}
          title='Hello Tsehay (ድምፅ አውጋኝ AI) - ይናገሩ: "Hey Tsehay" ወይም "ሰላም ፀሐይ"'
        >
          {/* Animated Pulsing Aurora Glow */}
          <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-[#f9b03c] opacity-40 blur-md group-hover:opacity-80 transition-opacity animate-pulse" />

          {/* Center Microphone Icon */}
          <div className="relative z-10 flex items-center justify-center text-white">
            {isOpen ? (
              <i className="fa-solid fa-xmark text-lg text-white"></i>
            ) : (
              <div className="flex items-center justify-center relative">
                <i className="fa-solid fa-microphone text-base sm:text-lg text-cyan-400 group-hover:scale-110 transition-transform duration-300"></i>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* 🔮 2. GEMINI LIVE STYLE FLOATING BOTTOM CARD (Non-intrusive, Compact & Interactive) */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-4 sm:right-8 w-[94vw] max-w-lg z-[9990] flex flex-col items-center animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto"
        >
          {/* Glassmorphic Gemini Pill Card */}
          <div 
            className="w-full rounded-3xl p-5 sm:p-6 bg-slate-950/95 border border-cyan-500/30 shadow-[0_12px_45px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.2)] flex flex-col relative overflow-hidden backdrop-blur-2xl"
          >
            {/* Top Bar: Gemini Live Badge, Standby Indicator & Controls */}
            <div className="w-full flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30">
                  <i className="fa-solid fa-sparkles text-xs text-cyan-400"></i>
                  <span>Gemini Voice AI</span>
                </span>

                {/* Standby Wake toggle badge */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStandbyActive;
                    setIsStandbyActive(next);
                    try { localStorage.setItem('tsehay_voice_standby', next ? 'true' : 'false'); } catch (e) {}
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                    isStandbyActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                  title='Auto Wake ("Hey Tsehay")'
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isStandbyActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isStandbyActive ? 'Hey Tsehay ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="ዝጋ (Close)"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>

            {/* Gemini 4-Color Aurora Wave Visualizer */}
            <div className="w-full h-16 sm:h-20 flex items-center justify-center relative my-1">
              <canvas
                ref={canvasRef}
                width={460}
                height={80}
                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]"
              />
            </div>

            {/* Live Transcription & Spoken Response Bubble */}
            <div className="w-full min-h-[50px] flex flex-col justify-center my-1.5 px-1">
              {transcript || interimTranscript ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-2">
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                    <span className="text-cyan-400 font-extrabold mr-1">እርስዎ:</span>
                    "{transcript} <span className="text-cyan-300 animate-pulse">{interimTranscript}</span>"
                  </p>
                </div>
              ) : (
                <div className="text-center py-1">
                  <p className="text-xs font-bold text-gray-300">
                    {statusMessage}
                  </p>
                </div>
              )}

              {/* AI Spoken Answer with Live Voice Wave Indicator */}
              {aiResponse && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-purple-950/80 border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-in fade-in shadow-md">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-volume-high animate-bounce' : isAudioPaused ? 'fa-pause' : 'fa-check'} text-xs`}></i>
                  </div>
                  <span className="text-left flex-1 leading-relaxed">{aiResponse}</span>
                </div>
              )}
            </div>

            {/* Gemini Live Control Deck: [Pause/Play Audio] | [Mic Stop/Listen] | [Quick Actions] */}
            <div className="w-full flex items-center justify-between gap-3 mt-2 pt-3 border-t border-white/10">
              {/* Left: Pause / Resume Audio Button */}
              <button
                type="button"
                onClick={togglePlayPauseAudio}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                  isSpeaking && !isAudioPaused
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : isAudioPaused
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
                title={isSpeaking && !isAudioPaused ? 'ድምፁን ለጊዜው አቁም (Pause Voice)' : 'ድምፁን አስቀጥል (Resume Voice)'}
              >
                <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                <span>{isSpeaking && !isAudioPaused ? 'Pause Voice' : isAudioPaused ? 'Resume Voice' : 'Play Voice'}</span>
              </button>

              {/* Center / Right: Microphone Action Button */}
              <button
                type="button"
                onClick={handleMicToggle}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-[#f9b03c] text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:scale-105'
                }`}
                title={isListening ? 'ማዳመጥ አቁም እና መልሱን ተቀበል (Stop & Answer)' : 'ማዳመጥ ጀምር (Start Speaking)'}
              >
                <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'} text-sm`}></i>
                <span>{isListening ? 'ጨርሻለሁ (Answer Now)' : 'ተናገር (Speak)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
