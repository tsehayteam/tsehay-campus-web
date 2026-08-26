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
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState('ለመጀመር "Hey Tsehay" ወይም "ሰላም ፀሐይ" ይበሉ');
  const [currentLang, setCurrentLang] = useState<'am-ET' | 'en-US'>('am-ET');
  const [micVolume, setMicVolume] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
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
        // Siri-like rising dual-tone chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        // Futuristic success chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'close') {
        // Soft descending exit tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        // Error warning tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }, []);

  // 🗣️ Native Audible Amharic Voice Output (Natural TTS Engine)
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
      const cleanText = text.replace(/[*_~`#\n]/g, ' ').trim();
      const encodedText = encodeURIComponent(cleanText);

      // 2. Play natural crystal-clear Amharic audio stream via /api/ai/tts
      const ttsUrl = `/api/ai/tts?text=${encodedText}&lang=am`;
      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
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
              if (onEnd) onEnd();
            };
            utterance.onerror = () => {
              setIsSpeaking(false);
              if (onEnd) onEnd();
            };
            window.speechSynthesis.speak(utterance);
            return;
          }
        } catch (e) {}
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      audio.play().catch(() => {
        // In case autoplay is restricted before interaction, fallback to speech synthesis
        try {
          if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'am-ET';
            utterance.onend = () => {
              setIsSpeaking(false);
              if (onEnd) onEnd();
            };
            utterance.onerror = () => {
              setIsSpeaking(false);
              if (onEnd) onEnd();
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsSpeaking(false);
            if (onEnd) onEnd();
          }
        } catch (e) {
          setIsSpeaking(false);
          if (onEnd) onEnd();
        }
      });
    } catch (e) {
      console.warn('speakVoice error:', e);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  }, []);

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
    setStatusMessage('ትእዛዝዎን በማከናወን ላይ...');
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
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
        setTimeout(() => setIsOpen(false), 600);
      });
      return;
    }

    // 8. Full Multi-Turn Conversational Amharic AI Response (Queries Tsehay AI Chat Engine)
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

  // 🎙️ Speech Recognition Engine Initialization (Active Mode)
  const startSpeechRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setStatusMessage('ይቅርታ፣ የእርስዎ ብራውዘር የድምፅ ማወቂያ (Web Speech) አይደግፍም። Chrome ወይም Edge ይጠቀሙ።');
      playSciFiSound('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = currentLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('እየሰማሁ ነው... (Listening...)');
        setTranscript('');
        setInterimTranscript('');
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

        if (finalStr) {
          setTranscript(prev => (prev ? prev + ' ' + finalStr : finalStr));
          setInterimTranscript('');
          
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // Ultra-fast response: Execute command within 600ms of user finishing speaking
          silenceTimerRef.current = setTimeout(() => {
            handleVoiceCommand(finalStr);
          }, 600);
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
          setStatusMessage('ምንም ድምፅ አልተሰማም። እባክዎ እንደገና ይናገሩ...');
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
  }, [currentLang, handleVoiceCommand, playSciFiSound]);

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

  // Open Assistant Flow
  const openAssistant = useCallback(() => {
    setIsOpen(true);
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('');
    setStatusMessage('ሰላም፣ ምን ልርዳዎት?');
    playSciFiSound('activate');

    // 🔊 Audibly greet the user immediately with native Amharic TTS: "ሰላም፣ ምን ልርዳዎት?"
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

  // 👂 🌟 "Hey Siri" Style Standby Wake Word Listener Engine ("Hey Tsehay", "ሰላም ፀሐይ", "Hello Tsehay")
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

          // Check wake word matches
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

  // 🎨 Siri-Style Animated Harmonic Wave Visualizer (Canvas WebGL-feel rendering)
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

      // Dynamic amplitude driven by live mic volume or speaking oscillation
      const dynamicAmp = isListening ? 24 + micVolume * 55 : isSpeaking ? 30 : 8;

      // Wave configurations: 4 layered harmonic Siri waves
      const waves = [
        { color: 'rgba(249, 176, 60, 0.95)', lineWidth: 3.5, freq: 0.022, speed: 0.06, ampMult: 1.0 }, // Amber Gold
        { color: 'rgba(50, 104, 186, 0.85)', lineWidth: 2.8, freq: 0.018, speed: -0.05, ampMult: 0.8 }, // Royal Blue
        { color: 'rgba(56, 189, 248, 0.8)', lineWidth: 2.0, freq: 0.030, speed: 0.08, ampMult: 0.65 }, // Electric Cyan
        { color: 'rgba(168, 85, 247, 0.75)', lineWidth: 1.8, freq: 0.015, speed: -0.04, ampMult: 0.5 }, // Violet
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;
        ctx.shadowBlur = 15;
        ctx.shadowColor = w.color;

        for (let x = 0; x < width; x++) {
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * w.freq + step * w.speed) *
            Math.cos(x * 0.01 + step * 0.02) *
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
  }, [isOpen, isListening, isSpeaking, micVolume]);

  return (
    <>
      {/* 🌟 1. PERSISTENT FLOATING MICROPHONE TRIGGER BUTTON (With Standby Badge & Pulse Effect) */}
      <div 
        className="fixed bottom-6 right-20 sm:bottom-6 sm:right-48 md:sm:right-52 z-[9985] flex flex-col items-end gap-2 select-none"
        style={{ willChange: 'transform' }}
      >
        {/* Floating Glowing Microphone Button */}
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="Tsehay Voice Assistant (Hello Tsehay)"
          className={`relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-[0_0_25px_rgba(249,176,60,0.4)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 cursor-pointer ${
            isOpen 
              ? 'bg-gradient-to-tr from-red-500 via-amber-500 to-[#f9b03c] scale-105 border-2 border-white'
              : 'bg-gradient-to-tr from-[#030509] via-[#080d1a] to-[#121c33] border-2 border-[#f9b03c]/60 hover:border-[#f9b03c] hover:scale-110'
          }`}
          title='Hello Tsehay (ድምፅ አውጋኝ AI) - ይናገሩ: "Hey Tsehay" ወይም "ሰላም ፀሐይ"'
        >
          {/* Animated Pulsing Outer Glow Aura */}
          <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#f9b03c] via-amber-300 to-[#3268ba] opacity-40 blur-md group-hover:opacity-80 transition-opacity animate-pulse" />

          {/* Radar Ring Ripple */}
          <span className="absolute inset-0 rounded-full border border-[#f9b03c] opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-700 pointer-events-none" />

          {/* Center Microphone Icon with Voice Wave Accent */}
          <div className="relative z-10 flex items-center justify-center text-white">
            {isOpen ? (
              <i className="fa-solid fa-xmark text-lg text-white"></i>
            ) : (
              <div className="flex items-center justify-center relative">
                <i className="fa-solid fa-microphone text-base sm:text-lg text-[#f9b03c] group-hover:scale-110 transition-transform duration-300"></i>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* 🔮 2. FUTURISTIC SIRI-STYLE VOICE ASSISTANT HUD OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAssistant();
          }}
        >
          {/* Central Glassmorphic Hologram Card */}
          <div 
            className="w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-slate-950/95 border border-amber-500/40 shadow-[0_0_80px_rgba(249,176,60,0.3)] flex flex-col items-center relative overflow-hidden backdrop-blur-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button, Standby Status & Language Toggle */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30">
                  <i className="fa-solid fa-bolt text-xs"></i>
                  <span>Hey Tsehay (Voice AI)</span>
                </span>

                {/* Standby Wake-word toggle pill */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStandbyActive;
                    setIsStandbyActive(next);
                    try { localStorage.setItem('tsehay_voice_standby', next ? 'true' : 'false'); } catch (e) {}
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    isStandbyActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                  title='Standby Wake Word ("Hey Tsehay")'
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isStandbyActive ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
                  <span>{isStandbyActive ? 'Auto Wake ON' : 'Auto Wake OFF'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={closeAssistant}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Siri Animated Audio Waveform Canvas */}
            <div className="w-full h-24 sm:h-28 flex items-center justify-center relative my-2">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(249,176,60,0.5)]"
              />
            </div>

            {/* Dynamic Status / Speech Transcription */}
            <div className="w-full text-center min-h-[75px] flex flex-col items-center justify-center my-3 px-2">
              {transcript || interimTranscript ? (
                <div className="space-y-1">
                  <p className="text-base sm:text-lg font-black text-white tracking-wide">
                    "{transcript} <span className="text-[#f9b03c] animate-pulse">{interimTranscript}</span>"
                  </p>
                  <p className="text-xs text-gray-400 font-medium">የተናገሩት ጥያቄ (Recognized)</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black text-white font-heading">
                    {statusMessage}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isListening ? 'ማይክሮፎኑ ክፍት ነው፣ ድምፅዎን ያሰሙ...' : 'ለማውራት ከታች ያለውን ማይክሮፎን ይጫኑ'}
                  </p>
                </div>
              )}

              {/* AI Spoken Response Box (Natural Amharic Voice) */}
              {aiResponse && (
                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-md">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-[#f9b03c] shrink-0">
                    <i className="fa-solid fa-volume-high text-xs animate-bounce"></i>
                  </div>
                  <span className="text-left flex-1">{aiResponse}</span>
                </div>
              )}
            </div>

            {/* Interactive Mic Control & Voice Action */}
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopSpeechRecognition();
                  } else {
                    startSpeechRecognition();
                  }
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-tr from-red-500 to-amber-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse'
                    : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#3268ba] text-slate-950 shadow-[0_0_25px_rgba(249,176,60,0.5)] hover:scale-105'
                }`}
                title={isListening ? 'ማዳመጥ አቁም' : 'ማዳመጥ ጀምር'}
              >
                <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'}`}></i>
              </button>
            </div>

            {/* Quick Voice Command Suggestion Pills */}
            <div className="w-full mt-6 pt-4 border-t border-white/10">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5 text-center font-heading">
                በአማርኛ ይሞክሩ (Try Speaking in Amharic):
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { text: '🎙️ "ወደ ኮርሶች ውሰደኝ"', query: 'ወደ ኮርሶች ውሰደኝ' },
                  { text: '🎙️ "ክፍያ እንዴት ነው?"', query: 'ክፍያ እንዴት ነው?' },
                  { text: '🎙️ "ነፃ ቪዲዮዎችን አሳየኝ"', query: 'ነፃ ቪዲዮዎችን አሳየኝ' },
                  { text: '🎙️ "ግባ (Login)"', query: 'ግባ' },
                  { text: '🎙️ "ስለ ፀሐይ ካምፓስ"', query: 'ስለ እናንተ ንገረኝ' },
                  { text: '🎙️ "ወደ መማሪያ ክፍል"', query: 'ወደ መማሪያ ክፍል' },
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(prompt.query);
                      handleVoiceCommand(prompt.query);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#f9b03c]/20 border border-white/10 hover:border-[#f9b03c]/50 text-[11px] font-bold text-gray-300 hover:text-white transition-all cursor-pointer active:scale-95"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
