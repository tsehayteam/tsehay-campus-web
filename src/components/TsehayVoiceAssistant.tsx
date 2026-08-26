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
  const [statusMessage, setStatusMessage] = useState('ሰላም! ጥያቄዎን ወይም ትእዛዝዎን ይናገሩ...');
  const [micVolume, setMicVolume] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'am' | 'en'>('am');
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
  const isOpenRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  isOpenRef.current = isOpen;
  isSpeakingRef.current = isSpeaking;

  // 🔊 Tsehay Futuristic Audio Chimes Synthesis (Web Audio API)
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        osc.frequency.setValueAtTime(1174.66, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'close') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.14);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {}
  }, []);

  // 🛑 Stop Voice Speech Immediately (For Interruption / Barge-in)
  const stopVoiceOutput = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setIsAudioPaused(false);
  }, []);

  // Close Assistant Flow
  const closeAssistant = useCallback(() => {
    playSciFiSound('close');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    stopAudioAnalyser();
    stopVoiceOutput();
    setIsOpen(false);
    isOpenRef.current = false;
  }, [playSciFiSound, stopVoiceOutput]);

  // 🗣️ Native Audible Amharic Voice Output (Strictly NO English Background Speech)
  const speakVoice = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    try {
      stopVoiceOutput();

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setIsAudioPaused(false);

      const cleanText = text.replace(/[*_~`#\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      const encodedText = encodeURIComponent(cleanText);

      // Pure Native Amharic audio stream
      const ttsUrl = `/api/ai/tts?text=${encodedText}&lang=${selectedLang}`;
      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      const handleAudioEnd = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setIsAudioPaused(false);
        currentAudioRef.current = null;
        if (onEnd) {
          onEnd();
        }
      };

      audio.onended = handleAudioEnd;
      audio.onerror = () => {
        handleAudioEnd();
      };

      audio.play().catch(() => {
        handleAudioEnd();
      });
    } catch (e) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setIsAudioPaused(false);
      if (onEnd) onEnd();
    }
  }, [selectedLang, stopVoiceOutput]);

  // ⏯️ Toggle Play / Pause for AI Voice Output
  const togglePlayPauseAudio = () => {
    if (currentAudioRef.current) {
      if (isAudioPaused) {
        currentAudioRef.current.play().then(() => {
          setIsAudioPaused(false);
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        }).catch(() => {});
      } else {
        currentAudioRef.current.pause();
        setIsAudioPaused(true);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    } else if (aiResponse) {
      speakVoice(aiResponse);
    }
  };

  // 🎙️ Setup Microphone Volume Analyser (Supports Live Wave + User Interruption)
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
        const normalizedVol = Math.min(average / 70, 2.0);
        setMicVolume(normalizedVol);

        // 🛑 BARGE-IN INTERRUPTION: If AI is speaking and user speaks, stop AI voice immediately!
        if (isSpeakingRef.current && normalizedVol > 0.45) {
          stopVoiceOutput();
          setStatusMessage('እየሰማሁ ነው... (Listening...)');
        }

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

  // 🧠 Comprehensive Tsehay Campus Knowledge Base & Voice Router (With Clean Auto-Dismiss on Navigation)
  const handleVoiceCommand = useCallback(async (spokenText: string) => {
    if (!spokenText.trim()) return;

    stopVoiceOutput();
    setIsListening(false);
    stopSpeechRecognition();
    stopAudioAnalyser();

    const normalized = spokenText.trim().toLowerCase();
    setStatusMessage('ምላሽ በማዘጋጀት ላይ...');
    playSciFiSound('success');

    const isCorrection = normalized.startsWith('አይ') || normalized.startsWith('ኖ') || normalized.includes('እንደዛ አይደለም') || normalized.includes('አልተረዳሽኝም');

    // 1. Navigation: All Courses (ኮርሶች / ስልጠናዎች) -> Auto Dismiss
    if (
      normalized.includes('ኮርስ') ||
      normalized.includes('ኮርሶች') ||
      normalized.includes('ስልጠና') ||
      normalized.includes('ስልጠናዎች') ||
      normalized.includes('ትምህርት') ||
      normalized.includes('ትምህርቶች') ||
      normalized.includes('courses') ||
      normalized.includes('course')
    ) {
      const msg = 'ወደ ኮርሶች ዝርዝር እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/courses');
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 2. Navigation: Home Page (ወደ ዋናው ገጽ / ወደ ቤት) -> Auto Dismiss
    if (
      normalized.includes('መነሻ') ||
      normalized.includes('ዋና ገጽ') ||
      normalized.includes('ዋናው ገጽ') ||
      normalized.includes('ወደ ቤት') ||
      normalized.includes('ሆም') ||
      normalized.includes('home')
    ) {
      const msg = 'ወደ ዋናው መነሻ ገጽ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        if (pathname === '/') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          router.push('/');
        }
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 3. Navigation: Payments & Checkout Modal (ክፍያ / ቴሌብር / ባንክ) -> Auto Dismiss
    if (
      normalized.includes('ክፍያ') ||
      normalized.includes('መክፈል') ||
      normalized.includes('ዋጋ') ||
      normalized.includes('ብር') ||
      normalized.includes('ታሪፍ') ||
      normalized.includes('መግዛት') ||
      normalized.includes('ቴሌብር') ||
      normalized.includes('ባንክ') ||
      normalized.includes('cbe') ||
      normalized.includes('lakipay') ||
      normalized.includes('paypal') ||
      normalized.includes('pay') ||
      normalized.includes('payment') ||
      normalized.includes('price')
    ) {
      const msg = 'የክፍያ አማራጮችን ከፍቼልዎታለሁ። በቴሌብር፣ በሲቢኢ ብር ወይም በካርድ መክፈል ይችላሉ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-payment-modal'));
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 4. Navigation: Login / Register Modal (ግባ / ተመዝገብ / አካውንት) -> Auto Dismiss
    if (
      normalized.includes('ግባ') ||
      normalized.includes('ሎጊን') ||
      normalized.includes('መግባት') ||
      normalized.includes('ተመዝገብ') ||
      normalized.includes('ምዝገባ') ||
      normalized.includes('ይመዝገቡ') ||
      normalized.includes('መለያ') ||
      normalized.includes('አካውንት') ||
      normalized.includes('login') ||
      normalized.includes('register')
    ) {
      const isSignup = normalized.includes('ተመዝገብ') || normalized.includes('ምዝገባ') || normalized.includes('register') || normalized.includes('አካውንት');
      const msg = isSignup ? 'የመመዝገቢያ መስኮት ከፍቼልዎታለሁ።' : 'የመግቢያ መስኮት ከፍቼልዎታለሁ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: isSignup, isSignUp: isSignup } }));
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 5. Navigation: Dashboard / Classroom (ዳሽቦርድ / መማሪያ ክፍል) -> Auto Dismiss
    if (
      normalized.includes('መማሪያ') ||
      normalized.includes('ክፍል') ||
      normalized.includes('ዳሽቦርድ') ||
      normalized.includes('ትምህርቴ') ||
      normalized.includes('dashboard') ||
      normalized.includes('classroom')
    ) {
      const msg = 'ወደ መማሪያ ዳሽቦርድዎ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/dashboard');
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 6. Navigation: Certificates (ሰርተፊኬት / የምስክር ወረቀት) -> Auto Dismiss
    if (
      normalized.includes('ሰርተፊኬት') ||
      normalized.includes('ሰርተፍኬት') ||
      normalized.includes('ማረጋገጫ') ||
      normalized.includes('የምስክር ወረቀት') ||
      normalized.includes('certificate')
    ) {
      const msg = 'ማንኛውንም ኮርስ ሲያጠናቅቁ ይፋዊ ዲጂታል ሰርተፊኬት ይሰጥዎታል። ወደ ሰርተፊኬት ገጽ እየወሰድኩዎት ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/certificate');
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 7. Navigation: Free YouTube Videos (ነፃ ቪዲዮዎች) -> Auto Dismiss
    if (
      normalized.includes('ነፃ ቪዲዮ') ||
      normalized.includes('ነጻ ቪዲዮ') ||
      normalized.includes('ቪዲዮዎች')
    ) {
      const msg = 'ነፃ የዩቲዩብ ቪዲዮዎችን ይመልከቱ።';
      setAiResponse(msg);
      speakVoice(msg, () => {
        const ytSection = document.getElementById('youtube-videos-section');
        if (ytSection) {
          ytSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          router.push('/#youtube-videos-section');
        }
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 8. Info Q&A: Address & Location (አድራሻ / የት ነው ያላችሁት?)
    if (
      normalized.includes('አድራሻ') ||
      normalized.includes('የት ነው') ||
      normalized.includes('የት ናችሁ') ||
      normalized.includes('ቦታ') ||
      normalized.includes('ቢሮ') ||
      normalized.includes('location') ||
      normalized.includes('address')
    ) {
      const msg = 'አድራሻችን ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ ነው። በአካልም ሆነ በኦንላይን ስልጠናዎችን እንሰጣለን።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 9. Info Q&A: Phone Numbers & Contact (ስልክ ቁጥር / እንዴት ላግኛችሁ?)
    if (
      normalized.includes('ስልክ') ||
      normalized.includes('ስልክ ቁጥር') ||
      normalized.includes('ግንኙነት') ||
      normalized.includes('ማናገር') ||
      normalized.includes('መደወል') ||
      normalized.includes('phone') ||
      normalized.includes('contact')
    ) {
      const msg = 'በስልክ ቁጥር 0980209090፣ በዋትስአፕ ወይም በቴሌግራም @TsehayTeam በቀጥታ ሊያገኙን ይችላሉ።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 10. Info Q&A: Social Media (ቴሌግራም / ዩቲዩብ / ቲክቶክ)
    if (
      normalized.includes('ቴሌግራም') ||
      normalized.includes('telegram') ||
      normalized.includes('ቲክቶክ') ||
      normalized.includes('tiktok') ||
      normalized.includes('ዋትስአፕ') ||
      normalized.includes('whatsapp')
    ) {
      const msg = 'ይፋዊ የቴሌግራም ቻናላችን @TsehayTeam ሲሆን፣ የዩቲዩብ ቻናላችን @eyoubsahle ነው። በዋትስአፕም በ 0980209090 ይገኛሉ።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 11. Info Q&A: Founder & Instructor Eyoub Sahle (መስራች / ኢዮብ ሳህሌ)
    if (
      normalized.includes('ኢዮብ') ||
      normalized.includes('እዮብ') ||
      normalized.includes('መስራች') ||
      normalized.includes('ባለቤት') ||
      normalized.includes('founder') ||
      normalized.includes('eyoub')
    ) {
      const msg = 'የፀሐይ ካምፓስ መስራችና ዋና አሰልጣኝ ኢዮብ ሳህሌ (Eyoub Sahle) ነው። እሱ በዲጂታል ማርኬቲንግና በዩቲዩብ በርካታ ተማሪዎችን ያፈራ የTsehay Digital መስራች ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 12. Info Q&A: Shein Import Business Course (የሼን ስልጠና)
    if (
      normalized.includes('ሼን') ||
      normalized.includes('ሺን') ||
      normalized.includes('shein') ||
      normalized.includes('ኢምፖርት')
    ) {
      const msg = 'የሼን ኢምፖርት ቢዝነስ ስልጠና በአነስተኛ ካፒታል እቃዎችን ከሼን አዘው በኢትዮጵያ የሚሸጡበትን መንገድ ያስተምራል። ዋጋው 4,500 ብር ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 13. Info Q&A: YouTube Success Course (የዩቲዩብ ስልጠና)
    if (
      normalized.includes('ዩቲዩብ ስልጠና') ||
      normalized.includes('ዩቲዩብ ኮርስ') ||
      normalized.includes('youtube course')
    ) {
      const msg = 'የዩቲዩብ ስልጠናችን የዩቲዩብ ቻናል ከዜሮ ከፍተው በዶላር ገቢ የሚያገኙበትን የተሟላ መንገድ ያስተምራል። ዋጋው 5,500 ብር ነው።';
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 14. Intelligent Conversational AI Query (Pure Ethiopian Amharic Tone)
    setIsAiProcessing(true);
    setStatusMessage('ፀሐይ AI መልስ በማዘጋጀት ላይ...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User voice query: "${spokenText}". ${isCorrection ? 'The user is correcting you; apologize briefly and give the exact right answer.' : 'Provide a concise, helpful 1-sentence response in pure, natural Amharic.'} Website details: Address: Bole, Addis Ababa. Phone: 0980209090. Telegram: @TsehayTeam. Founder: Eyoub Sahle. Do NOT repeat words.`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let reply = (data.reply || data.text || 'ጥያቄዎ ደርሶኛል! ተጨማሪ መረጃ ለማግኘት በቻት ሊያናግሩን ይችላሉ።').replace(/[*_#]/g, '').trim();
        setAiResponse(reply);
        speakVoice(reply, () => resumeListeningForNextTurn());
      } else {
        const defaultReply = 'ጥያቄዎ ደርሶኛል! ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ ክፍያና ምዝገባ በዝርዝር የኮርሶች ገጻችንን ይመልከቱ።';
        setAiResponse(defaultReply);
        speakVoice(defaultReply, () => resumeListeningForNextTurn());
      }
    } catch (e) {
      const fallbackReply = 'ጥያቄዎ ደርሶኛል! ለተጨማሪ ዝርዝር የኮርሶች ገጻችንን መመልከት ወይም በ 0980209090 መደወል ይችላሉ።';
      setAiResponse(fallbackReply);
      speakVoice(fallbackReply, () => resumeListeningForNextTurn());
    } finally {
      setIsAiProcessing(false);
    }
  }, [pathname, router, speakVoice, playSciFiSound, stopVoiceOutput, closeAssistant]);

  // 🔄 Continuous Listening for Next Turn (Tsehay ALWAYS answers every subsequent question)
  const resumeListeningForNextTurn = () => {
    if (!isOpenRef.current) return;
    setStatusMessage('እየሰማሁ ነው... ቀጣይ ጥያቄዎን ይናገሩ');
    setTranscript('');
    setInterimTranscript('');
    activeTranscriptRef.current = '';
    setTimeout(() => {
      if (isOpenRef.current && !isSpeakingRef.current) {
        startSpeechRecognition();
      }
    }, 400);
  };

  // 🎙️ Speech Recognition Engine Initialization (Active Mode with Clean Deduplication)
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
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang === 'am' ? 'am-ET' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('እየሰማሁ ነው... (Listening...)');
        setupAudioAnalyser();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }

        finalStr = finalStr.trim();
        setTranscript(finalStr);
        setInterimTranscript(interimStr);

        const fullSpeech = (finalStr + ' ' + interimStr).trim();
        activeTranscriptRef.current = fullSpeech;

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (fullSpeech.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (activeTranscriptRef.current.trim()) {
              handleVoiceCommand(activeTranscriptRef.current.trim());
            }
          }, 1400);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          setStatusMessage('የማይክሮፎን ፈቃድ አልተሰጠም። እባክዎ ማይክሮፎን ይፍቀዱ።');
          playSciFiSound('error');
          setIsListening(false);
          stopAudioAnalyser();
        }
      };

      recognition.onend = () => {
        if (isOpenRef.current && isListening) {
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
  }, [handleVoiceCommand, playSciFiSound, selectedLang]);

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
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      const spoken = (activeTranscriptRef.current || transcript || interimTranscript).trim();
      if (spoken) {
        handleVoiceCommand(spoken);
      } else {
        setStatusMessage('ማዳመጥ ቆሟል (Listening paused)');
      }
    } else {
      stopVoiceOutput();
      setTranscript('');
      setInterimTranscript('');
      activeTranscriptRef.current = '';
      startSpeechRecognition();
    }
  };

  // Open Assistant Flow
  const openAssistant = useCallback(() => {
    setIsOpen(true);
    isOpenRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    activeTranscriptRef.current = '';
    setAiResponse('');
    setStatusMessage('ሰላም! ምን ልርዳዎት?');
    playSciFiSound('activate');

    speakVoice('ሰላም፣ ምን ልርዳዎት?', () => {
      startSpeechRecognition();
    });
  }, [playSciFiSound, speakVoice, startSpeechRecognition]);

  // Toggle Assistant Button
  const toggleAssistant = () => {
    if (isOpen) {
      closeAssistant();
    } else {
      openAssistant();
    }
  };

  // 👂 🌟 Rock-Solid Instant Wake Word Listener ("ፀሐይ", "ፀሐይ AI", "ሰላም ፀሐይ", "Hey Tsehay")
  useEffect(() => {
    if (typeof window === 'undefined' || !isStandbyActive) {
      if (standbyRecognitionRef.current) {
        try { standbyRecognitionRef.current.abort(); } catch (e) {}
        standbyRecognitionRef.current = null;
      }
      return;
    }

    if (isOpen) {
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
      if (isOpenRef.current || !isStandbyActive) return;
      try {
        if (standbyRecognitionRef.current) {
          try { standbyRecognitionRef.current.abort(); } catch (e) {}
        }

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
            heard.includes('ፀሐይ') ||
            heard.includes('ጸሐይ') ||
            heard.includes('ፀሃይ') ||
            heard.includes('ጸሃይ') ||
            heard.includes('ሰላም ፀሐይ') ||
            heard.includes('ሰላም ጸሐይ') ||
            heard.includes('ሰላም ፀሃይ') ||
            heard.includes('ሄይ ፀሐይ') ||
            heard.includes('ሄይ ጸሐይ') ||
            heard.includes('ሃይ ፀሐይ') ||
            heard.includes('ሄሎ ፀሐይ') ||
            heard.includes('hey tsehay') ||
            heard.includes('tsehay ai') ||
            heard.includes('tsehay') ||
            heard.includes('hello tsehay') ||
            heard.includes('hi tsehay');

          if (isWakeWord) {
            try { standby.abort(); } catch(e) {}
            openAssistant();
          }
        };

        standby.onerror = () => {};

        standby.onend = () => {
          if (isStandbyActive && !isOpenRef.current && !isRestarting) {
            isRestarting = true;
            setTimeout(() => {
              isRestarting = false;
              startStandby();
            }, 500);
          }
        };

        standbyRecognitionRef.current = standby;
        standby.start();
      } catch (e) {
        setTimeout(() => {
          if (isStandbyActive && !isOpenRef.current) startStandby();
        }, 800);
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

  // ☀️ 🎨 Compact Glowing 3D Golden Sun Pulse Visualizer (Canvas Render)
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
      const centerX = width / 2;
      const centerY = height / 2;

      // Energy calculation
      const energy = isListening ? 1.0 + micVolume * 1.8 : isSpeaking && !isAudioPaused ? 1.4 : 0.65;
      const baseRadius = 15 * energy;

      // 1. Glowing Radial Bloom
      const bloomGrad = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, baseRadius * 2.5);
      bloomGrad.addColorStop(0, 'rgba(255, 230, 109, 0.95)');
      bloomGrad.addColorStop(0.4, 'rgba(249, 176, 60, 0.5)');
      bloomGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = bloomGrad;
      ctx.fill();

      // 2. Radiating Solar Rays
      const numRays = 16;
      ctx.save();
      ctx.translate(centerX, centerY);
      for (let i = 0; i < numRays; i++) {
        const angle = (i * Math.PI * 2) / numRays + step * 0.025;
        const rayAmp = Math.sin(step * 0.1 + i * 1.5) * (5 * energy) + (9 * energy);
        const startR = baseRadius * 0.9;
        const endR = startR + rayAmp;

        const x1 = Math.cos(angle) * startR;
        const y1 = Math.sin(angle) * startR;
        const x2 = Math.cos(angle) * endR;
        const y2 = Math.sin(angle) * endR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 214, 10, 0.85)' : 'rgba(249, 176, 60, 0.7)';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f9b03c';
        ctx.stroke();
      }
      ctx.restore();

      // 3. Central Solid Golden Sun Core
      const coreGrad = ctx.createRadialGradient(centerX - 2, centerY - 2, 1, centerX, centerY, baseRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.35, '#ffea79');
      coreGrad.addColorStop(0.75, '#f9b03c');
      coreGrad.addColorStop(1, '#d97706');

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#f9b03c';
      ctx.fill();

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
      {/* 🌟 1. FLOATING TSEHAY SUN BUTTON */}
      <div 
        className="fixed bottom-8 right-6 sm:bottom-10 sm:right-8 z-[9985] flex flex-col items-end gap-2 select-none"
        style={{ willChange: 'transform' }}
      >
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="ፀሐይ AI ድምፅ ረዳት (Tsehay Voice AI)"
          className={`relative group flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-[0_0_30px_rgba(249,176,60,0.55)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 cursor-pointer ${
            isOpen 
              ? 'bg-gradient-to-tr from-red-500 via-amber-500 to-[#f9b03c] scale-105 border-2 border-white'
              : 'bg-gradient-to-tr from-[#0b132b] via-[#1c2541] to-[#030509] border-2 border-[#f9b03c] hover:scale-110'
          }`}
          title='ፀሐይ AI (ድምፅ አውጋኝ) - ይናገሩ: "ፀሐይ" ወይም "ሰላም ፀሐይ"'
        >
          {/* Animated Pulsing Sun Aura */}
          <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-500 opacity-60 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />

          {/* Center Sun & Microphone Icon */}
          <div className="relative z-10 flex items-center justify-center text-white">
            {isOpen ? (
              <i className="fa-solid fa-xmark text-lg text-white"></i>
            ) : (
              <div className="flex items-center justify-center relative">
                <i className="fa-solid fa-sun text-xl text-[#f9b03c] group-hover:rotate-45 transition-transform duration-500"></i>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* 🔮 2. ULTRA-COMPACT 3D HOLOGRAPHIC CAPSULE (Elevated, Compact & Sleek) */}
      {isOpen && (
        <div 
          className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 w-[90vw] sm:w-[360px] max-w-sm z-[9990] flex flex-col items-center animate-in slide-in-from-bottom-8 duration-300 pointer-events-auto"
        >
          {/* 3D Glassmorphic Capsule with Beveled Gold Border */}
          <div 
            className="w-full rounded-3xl p-4 bg-gradient-to-b from-slate-900/95 via-[#0b132b]/95 to-black/95 border border-[#f9b03c]/40 shadow-[0_15px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18),0_0_30px_rgba(249,176,60,0.2)] flex flex-col relative overflow-hidden backdrop-blur-2xl"
          >
            {/* Top Bar: Mini Tsehay Brand, Language Switcher & Close */}
            <div className="w-full flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 shadow-sm">
                  <i className="fa-solid fa-sun text-[10px] text-[#f9b03c] animate-spin-slow"></i>
                  <span>ፀሐይ AI</span>
                </span>

                {/* Language Switcher Pill */}
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedLang === 'am' ? 'en' : 'am';
                    setSelectedLang(next);
                    if (isListening) {
                      stopSpeechRecognition();
                      setTimeout(() => startSpeechRecognition(), 200);
                    }
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 transition cursor-pointer"
                  title="ቋንቋ ቀይር (Switch Language)"
                >
                  <i className="fa-solid fa-globe mr-0.5 text-[#f9b03c] text-[9px]"></i>
                  {selectedLang === 'am' ? 'አማርኛ' : 'EN'}
                </button>

                {/* Standby Wake toggle badge */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStandbyActive;
                    setIsStandbyActive(next);
                    try { localStorage.setItem('tsehay_voice_standby', next ? 'true' : 'false'); } catch (e) {}
                  }}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                    isStandbyActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                  title='Auto Wake ("ፀሐይ")'
                >
                  <span className={`w-1 h-1 rounded-full ${isStandbyActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isStandbyActive ? 'Auto Wake' : 'Off'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={closeAssistant}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark text-[11px]"></i>
              </button>
            </div>

            {/* Compact 3D Sun Pulse Visualizer */}
            <div className="w-full h-14 flex items-center justify-center relative my-0.5">
              <canvas
                ref={canvasRef}
                width={280}
                height={65}
                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(249,176,60,0.6)]"
              />
            </div>

            {/* Live Transcription & Spoken Response Bubble */}
            <div className="w-full min-h-[38px] flex flex-col justify-center my-1 px-1">
              {transcript || interimTranscript ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 mb-1.5">
                  <p className="text-xs font-bold text-white leading-relaxed">
                    <span className="text-[#f9b03c] font-extrabold mr-1">እርስዎ:</span>
                    "{transcript} <span className="text-amber-300 animate-pulse">{interimTranscript}</span>"
                  </p>
                </div>
              ) : (
                <div className="text-center py-0.5">
                  <p className="text-[11px] font-bold text-gray-300">
                    {statusMessage}
                  </p>
                </div>
              )}

              {/* AI Spoken Answer Bubble */}
              {aiResponse && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-start gap-2 animate-in fade-in shadow-md">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-[#f9b03c] shrink-0 mt-0.5">
                    <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-volume-high animate-bounce' : isAudioPaused ? 'fa-pause' : 'fa-check'} text-[10px]`}></i>
                  </div>
                  <span className="text-left flex-1 leading-relaxed">{aiResponse}</span>
                </div>
              )}
            </div>

            {/* Control Deck: [Pause/Play Voice] | [Mic Toggle / Answer Now] */}
            <div className="w-full flex items-center justify-between gap-2 mt-1 pt-2 border-t border-white/10">
              {/* Pause / Resume Audio Button */}
              <button
                type="button"
                onClick={togglePlayPauseAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  isSpeaking && !isAudioPaused
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : isAudioPaused
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
                title={isSpeaking && !isAudioPaused ? 'ድምፁን አቁም' : 'ድምፁን አስቀጥል'}
              >
                <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                <span>{isSpeaking && !isAudioPaused ? 'Pause' : isAudioPaused ? 'Resume' : 'Play'}</span>
              </button>

              {/* Microphone Action Button */}
              <button
                type="button"
                onClick={handleMicToggle}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all duration-300 cursor-pointer shadow-md active:scale-95 ${
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.4)] hover:scale-105'
                }`}
                title={isListening ? 'ማዳመጥ አቁም' : 'ማዳመጥ ጀምር'}
              >
                <i className={`fa-solid ${isListening ? 'fa-microphone-lines' : 'fa-microphone'} text-xs`}></i>
                <span>{isListening ? 'Answer' : 'Speak'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
