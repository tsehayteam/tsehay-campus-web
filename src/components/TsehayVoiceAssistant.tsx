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

// 🔤 Master Amharic Homophone & Dialect Normalizer (Harmonizes ሐ/ኀ/ሀ, ሠ/ሰ, ዐ/አ, ፀ/ጸ, ዪ/ይ)
function normalizeAmharicPhonetics(text: string): string {
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

// 🧠 Context-Aware Auto-Correction & Precise Intent Classifier
interface SpeechCorrectionResult {
  corrected: string;
  raw: string;
  detectedIntent?: string;
  isEnglishLanguageDetected?: boolean;
}

function autoCorrectAmharicSpeech(rawText: string, isEnglishMode: boolean = false): SpeechCorrectionResult {
  if (!rawText) return { corrected: '', raw: '' };
  
  const text = rawText.trim();
  const normalized = normalizeAmharicPhonetics(text);
  const isPureEnglish = /^[a-zA-Z\s0-9?,.!'":;@#$%\^&*()_\-+=\[\]{}]+$/.test(text);
  const isEnglishEffective = isEnglishMode || isPureEnglish;

  // 0. Language Switch Commands
  if (
    /በእንግሊዘኛ\s*ተናገሪ|በእንግሊዘኛ\s*አውሪ|በእንግሊዘኛ|እንግሊዘኛ\s*ቀይሪ|ወደ\s*እንግሊዘኛ/i.test(normalized) ||
    /speak in english|switch to english|talk in english|english please|change to english/i.test(text)
  ) {
    return {
      corrected: 'Switch to English',
      raw: text,
      detectedIntent: 'switch_to_english',
      isEnglishLanguageDetected: true
    };
  }

  if (
    /በአማርኛ\s*ተናገሪ|በአማርኛ\s*አውሪ|በአማርኛ|አማርኛ\s*ቀይሪ|ወደ\s*አማርኛ/i.test(normalized) ||
    /speak in amharic|switch to amharic|talk in amharic|amharic please|change to amharic/i.test(text)
  ) {
    return {
      corrected: 'ወደ አማርኛ ቋንቋ ቀይሪ',
      raw: text,
      detectedIntent: 'switch_to_amharic',
      isEnglishLanguageDetected: false
    };
  }

  // 1. Common Greetings & Small Talk
  if (
    /^(ሰላም|ሰላም\s*ነው|እንዴት\s*ነሽ|እንዴት\s*ነህ|ደህና\s*ነሽ|ደህና\s*ነህ|ጤና\s*ይስጥልኝ|እንደምን\s*አለሽ|ሰላም\s*ጸ|ሰላም\s*ፀ|ሄይ\s*ጸ|ሄይ\s*ፀ|ጸሀይ|ፀሐይ)$/i.test(normalized) ||
    /^(hi|hello|hey|hey there|how are you|how do you do|good morning|good afternoon|good evening)$/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Hello, how are you?' : 'ሰላም፣ እንዴት ነሽ?',
      raw: text,
      detectedIntent: 'greeting',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 2. Gratitude
  if (
    /^(አመሰግናለሁ|እናመሰግናለን|እግዚአብሔር\s*ይስጥልኝ|ቴንክ\s*ዩ)$/i.test(normalized) ||
    /^(thank you|thanks|thank you very much|thanks a lot)$/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Thank you!' : 'አመሰግናለሁ!',
      raw: text,
      detectedIntent: 'gratitude',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 3. Identity
  if (
    /^(ማን\s*ነሽ|ስለ\s*ራስሽ\s*ንገሪኝ|ምን\s*ታደርጊያለሽ|ፀሐይ\s*ማን\s*ናት)$/i.test(normalized) ||
    /^(who are you|what can you do|tell me about yourself)$/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Who are you?' : 'ማን ነሽ?',
      raw: text,
      detectedIntent: 'identity',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 4. Navigation: Home Page
  if (
    /ሄብ\s*ሄጅ|ሄብ\s*ፔጅ|ሂብ\s*ፔጅ|ሄም\s*ፔጅ|ሂም\s*ፔጅ|ሆም\s*ፔጅ|ሆምፔጅ|ወደ\s*ሆም|ወደ\s*ዋናው\s*ገጽ|ወደ\s*መነሻ/i.test(normalized) ||
    /go to home|home page|take me to home|go home/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Go to Home Page' : 'ወደ ሆም ፔጅ ውሰደኝ',
      raw: text,
      detectedIntent: 'home',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 5. Navigation: All Courses
  if (
    /ወደ\s*ኮርሶች|ኮርሶች\s*ዝርዝር|ሁሉንም\s*ኮርሶች|የኮርሶች\s*ካታሎግ/i.test(normalized) ||
    /show courses|all courses|course catalog|view courses|take me to courses/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Show All Courses' : 'ወደ ኮርሶች ዝርዝር ውሰደኝ',
      raw: text,
      detectedIntent: 'courses',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 6. Shein Course Explicit Query
  if (
    /ስለ\s*ሼን|ስለ\s*ሸን|ስለ\s*ሺን|የሼን\s*ስልጠና|የሼን\s*ኮርስ|የሼን\s*ዋጋ|የሺን\s*ስልጠና|ሼን\s*ኢምፖርት/i.test(normalized) ||
    /shein course|shein import|about shein/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Tell me about Shein Import Course' : 'ስለ ሼን ኢምፖርት ስልጠና ንገሪኝ',
      raw: text,
      detectedIntent: 'shein',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 7. YouTube Course Explicit Query
  if (
    /ስለ\s*ዩቲዩብ|ስለ\s*ዩቱብ|የዩቲዩብ\s*ስልጠና|የዩቲዩብ\s*ኮርስ|የዩቲዩብ\s*ዋጋ|ዩቲዩብ\s*ስኬት/i.test(normalized) ||
    /youtube course|youtube mastery|about youtube/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Tell me about YouTube Course' : 'ስለ ዩቲዩብ ስልጠና ንገሪኝ',
      raw: text,
      detectedIntent: 'youtube',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 8. Payment & Checkout Explicit Query
  if (
    /ክፍያ\s*እንዴት\s*ነው|ክፍያ\s*መፈጸም|በቴሌብር\s*መክፈል|ክፍያ\s*አማራጮች|ዋጋው\s*ስንት\s*ነው|መክፈል\s*እፈልጋለሁ/i.test(normalized) ||
    /how to pay|payment options|how much is the course|pricing/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Payment Options & Course Pricing' : 'የክፍያ አማራጮችና ዋጋ',
      raw: text,
      detectedIntent: 'payment',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 9. Login / Signup Explicit Query
  if (
    /መግባት\s*እፈልጋለሁ|ሎጊን\s*አድርግ|ሎጊን\s*ላድርግ|መለያ\s*ክፈት|መመዝገብ\s*እፈልጋለሁ/i.test(normalized) ||
    /i want to login|open login|open signup|register account/i.test(text)
  ) {
    const isSignup = /መመዝገብ|ምዝገባ|register|signup/i.test(normalized) || /register|sign up/i.test(text);
    return {
      corrected: isSignup ? (isEnglishEffective ? 'Student Registration' : 'ተመዝገብ (Register)') : (isEnglishEffective ? 'Login' : 'ግባ (Login)'),
      raw: text,
      detectedIntent: isSignup ? 'signup' : 'login',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 10. Location & Address
  if (
    /አድራሻችሁ\s*የት\s*ነው|የካምፓሱ\s*አድራሻ|ቦሌ\s*የት\s*ጋ|ቢሮአችሁ\s*የት\s*ነው|አድራሻ\s*የት\s*ነው/i.test(normalized) ||
    /where is your office|where are you located|what is your address|campus address/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'What is Tsehay Campus address?' : 'የፀሐይ ካምፓስ አድራሻ የት ነው?',
      raw: text,
      detectedIntent: 'address',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 11. Phone & Contact
  if (
    /ስልክ\s*ቁጥር|እንዴት\s*ልደውል|የስልክ\s*ቁጥር\s*ስንት\s*ነው|እንዴት\s*ላግኛችሁ/i.test(normalized) ||
    /phone number|contact number|how can i contact you|call number/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'What is your phone number?' : 'የስልክ ቁጥርና የግንኙነት መረጃ',
      raw: text,
      detectedIntent: 'phone',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  // 12. Founder & Instructor
  if (
    /መስራች\s*ማን\s*ነው|ማን\s*ነው\s*የከፈተው|አስተማሪው\s*ማን\s*ነው|ስለ\s*ኢዮብ\s*ሳህሌ/i.test(normalized) ||
    /who is the founder|who created tsehay campus|who is eyoub sahle/i.test(text)
  ) {
    return {
      corrected: isEnglishEffective ? 'Who is the founder of Tsehay Campus?' : 'የፀሐይ ካምፓስ መስራች ማን ነው?',
      raw: text,
      detectedIntent: 'founder',
      isEnglishLanguageDetected: isPureEnglish
    };
  }

  return { corrected: text, raw: text, isEnglishLanguageDetected: isPureEnglish };
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
  const captionDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTranscriptRef = useRef<string>('');
  const wasInterruptedRef = useRef<boolean>(false);
  const isOpenRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const selectedLangRef = useRef<'am' | 'en'>('am');
  
  isOpenRef.current = isOpen;
  isSpeakingRef.current = isSpeaking;
  selectedLangRef.current = selectedLang;

  // 🔊 Futuristic Sci-Fi Chimes Synthesis (Web Audio API)
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

  // 🛑 Instant Voice Output Termination (Gemini Live Barge-In Cutoff)
  const stopVoiceOutput = useCallback(() => {
    if (captionDismissTimerRef.current) {
      clearTimeout(captionDismissTimerRef.current);
      captionDismissTimerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
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
    if (captionDismissTimerRef.current) {
      clearTimeout(captionDismissTimerRef.current);
      captionDismissTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    stopAudioAnalyser();
    stopVoiceOutput();
    setIsOpen(false);
    isOpenRef.current = false;
    wasInterruptedRef.current = false;
  }, [playSciFiSound, stopVoiceOutput]);

  // 🗣️ Voice Output (Native Amharic 'am' or English 'en')
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

      const currentLang = selectedLangRef.current;
      const ttsUrl = `/api/ai/tts?text=${encodedText}&lang=${currentLang}`;
      const audio = new Audio(ttsUrl);
      currentAudioRef.current = audio;

      // 🎙️ FULL-DUPLEX PARALLEL LISTENING:
      if (isOpenRef.current && !recognitionRef.current) {
        startSpeechRecognition();
      }

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
  }, [stopVoiceOutput]);

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

  // 🎙️ Setup Microphone Volume Analyser (Live Wave + 0ms Barge-In Trigger)
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
        const normalizedVol = Math.min(average / 50, 2.5);
        setMicVolume(normalizedVol);

        // 🛑 GEMINI LIVE BARGE-IN: If speech detected while AI speaks, stop audio immediately
        if (isSpeakingRef.current && normalizedVol > 0.16) {
          stopVoiceOutput();
          wasInterruptedRef.current = true;
          setStatusMessage(selectedLangRef.current === 'en' ? 'Understood! Listening...' : 'እሺ፣ እያዳመጥኩ ነው...');
        }

        if (isListening || isSpeakingRef.current) {
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

  // 🧠 High-Accuracy Semantic Voice Router (Gemini-Live Conversational Resolution)
  const handleVoiceCommand = useCallback(async (spokenText: string, forcedIntent?: string) => {
    if (!spokenText.trim()) return;

    // Immediately stop any active speech output
    stopVoiceOutput();
    setIsListening(false);
    stopSpeechRecognition();
    stopAudioAnalyser();

    const correctionResult = autoCorrectAmharicSpeech(spokenText, selectedLangRef.current === 'en');
    
    // Auto-switch to English if pure English was spoken
    if (correctionResult.isEnglishLanguageDetected && selectedLangRef.current !== 'en') {
      setSelectedLang('en');
      selectedLangRef.current = 'en';
    }

    const isInterrupted = wasInterruptedRef.current;
    wasInterruptedRef.current = false;

    const intent = forcedIntent || correctionResult.detectedIntent;
    const cleanText = correctionResult.corrected;

    // Update UI transcript to show the clean, auto-corrected text
    setTranscript(cleanText);
    setInterimTranscript('');

    // Conversational Interruption Bridge (like Gemini: "እሺ፣ ተረድቻለሁ! ..." or "Understood! ...")
    const isEng = selectedLangRef.current === 'en';
    const interruptPrefix = isInterrupted 
      ? (isEng ? 'Understood! ' : 'እሺ፣ ተረድቻለሁ! ') 
      : '';

    // Handle Voice-Triggered Language Switch Commands
    if (intent === 'switch_to_english') {
      setSelectedLang('en');
      selectedLangRef.current = 'en';
      const msg = 'Switched to English language! How can I assist you today?';
      setAiResponse(msg);
      setStatusMessage('Switched to English');
      playSciFiSound('success');
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    if (intent === 'switch_to_amharic') {
      setSelectedLang('am');
      selectedLangRef.current = 'am';
      const msg = 'ወደ አማርኛ ቋንቋ ተቀይሯል! ምን ልርዳዎት?';
      setAiResponse(msg);
      setStatusMessage('ወደ አማርኛ ተቀይሯል');
      playSciFiSound('success');
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // Handle Contextual Greetings
    if (intent === 'greeting') {
      const msg = interruptPrefix + (isEng 
        ? "Hello! I'm Tsehay AI, doing great! How can I assist you today?"
        : "ሰላም! እኔ ፀሐይ ነኝ፤ በጣም ደህና ነኝ፣ እርስዎስ እንዴት ኖት? ዛሬ በምን ልርዳዎት?");
      setAiResponse(msg);
      setStatusMessage(isEng ? 'Hello!' : 'ሰላም!');
      playSciFiSound('success');
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // Handle Gratitude
    if (intent === 'gratitude') {
      const msg = interruptPrefix + (isEng 
        ? "You're very welcome! Always here to assist you. Is there anything else you need?"
        : "ምንም አይደል! ሁሌም እርስዎን ለመርዳት በደስታ ዝግጁ ነኝ። ሌላ ልርዳዎት የምችለው ነገር አለ?");
      setAiResponse(msg);
      playSciFiSound('success');
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // Handle Identity
    if (intent === 'identity') {
      const msg = interruptPrefix + (isEng 
        ? "I am Tsehay AI, your voice assistant for Tsehay Campus. I can guide you through our courses, payments, certificates, and learning tools."
        : "እኔ ፀሐይ AI እባላለሁ፤ የፀሐይ ካምፓስ ብልህ የድምፅ ረዳት ነኝ። ስለ ኮርሶቻችን፣ ክፍያ፣ እና የትምህርት አጠቃቀም ማንኛውንም ጥያቄ መመለስ እችላለሁ።");
      setAiResponse(msg);
      playSciFiSound('success');
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    setStatusMessage(isEng ? 'Processing...' : 'ትእዛዝዎን በማከናወን ላይ...');
    playSciFiSound('success');

    // 1. Navigation: Home Page (ወደ ዋናው ገጽ / መነሻ / ወደ ሆም ፔጅ)
    if (intent === 'home') {
      const msg = interruptPrefix + (isEng 
        ? 'Taking you to the home page.' 
        : 'ወደ ዋናው መነሻ ገጽ (Home Page) እየወሰድኩዎት ነው።');
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

    // 2. Navigation: All Courses (ኮርሶች / ስልጠናዎች)
    if (intent === 'courses') {
      const msg = interruptPrefix + (isEng 
        ? 'Taking you to our complete course catalog.' 
        : 'ወደ ኮርሶች ዝርዝር እየወሰድኩዎት ነው። የሼን ኢምፖርት፣ የዩቲዩብ ስኬት እና የዲጂታል ማርኬቲንግ ስልጠናዎችን ይመልከቱ።');
      setAiResponse(msg);
      speakVoice(msg, () => {
        router.push('/courses');
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 3. Navigation: Payments & Checkout Modal (ክፍያ / ቴሌብር / ባንክ)
    if (intent === 'payment') {
      const msg = interruptPrefix + (isEng 
        ? 'Opening payment options. You can pay with Telebirr, CBE Birr, LakiPay, PayPal, or Cards.' 
        : 'የክፍያ አማራጮችን ከፍቼልዎታለሁ። በቴሌብር፣ በሲቢኢ ብር (CBE Birr)፣ በLakiPay ወይም በካርድ መክፈል ይችላሉ።');
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-payment-modal'));
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 4. Navigation: Login / Register Modal (ግባ / ተመዝገብ / አካውንት)
    if (intent === 'login' || intent === 'signup') {
      const isSignup = intent === 'signup';
      const msg = interruptPrefix + (isEng 
        ? (isSignup ? 'Opening the student registration window.' : 'Opening the login window.') 
        : (isSignup ? 'የመመዝገቢያ መስኮት ከፍቼልዎታለሁ።' : 'የመግቢያ መስኮት ከፍቼልዎታለሁ።'));
      setAiResponse(msg);
      speakVoice(msg, () => {
        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { isSignupMode: isSignup, isSignUp: isSignup } }));
        setTimeout(() => closeAssistant(), 500);
      });
      return;
    }

    // 5. Info Q&A: Address & Location (አድራሻ / የት ነው ያላችሁት?)
    if (intent === 'address') {
      const msg = interruptPrefix + (isEng 
        ? 'Our address is Bole, Addis Ababa, Ethiopia. We provide both online AI-assisted courses and practical training.' 
        : 'አድራሻችን ቦሌ፣ አዲስ አበባ፣ ኢትዮጵያ ነው። በአካልም ሆነ በኦንላይን ስልጠናዎችን እንሰጣለን።');
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 6. Info Q&A: Phone Numbers & Contact (ስልክ ቁጥር / እንዴት ላግኛችሁ?)
    if (intent === 'phone') {
      const msg = interruptPrefix + (isEng 
        ? 'You can reach us by phone at 0980209090 (+251980209090), via WhatsApp, or on Telegram @TsehayTeam.' 
        : 'በስልክ ቁጥር 0980209090፣ በዋትስአፕ ወይም በቴሌግራም @TsehayTeam በቀጥታ ሊያገኙን ይችላሉ።');
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 7. Info Q&A: Founder & Instructor Eyoub Sahle (መስራች / ኢዮብ ሳህሌ)
    if (intent === 'founder') {
      const msg = interruptPrefix + (isEng 
        ? 'The founder and lead instructor of Tsehay Campus is Eyoub Sahle, founder of Tsehay Digital and professional digital marketer.' 
        : 'የፀሐይ ካምፓስ መስራችና ዋና አሰልጣኝ ኢዮብ ሳህሌ (Eyoub Sahle) ነው። እሱ በዲጂታል ማርኬቲንግና በዩቲዩብ በርካታ ተማሪዎችን ያፈራ የTsehay Digital መስራች ነው።');
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 8. Info Q&A: Shein Import Business Course (የሼን ስልጠና)
    if (intent === 'shein') {
      const msg = interruptPrefix + (isEng 
        ? 'The Shein Import Business course teaches you how to order profitable products directly from Shein to Ethiopia. Price is 4,500 ETB.' 
        : 'የሼን ኢምፖርት ቢዝነስ ስልጠና በአነስተኛ ካፒታል እቃዎችን ከሼን አዘው በኢትዮጵያ የሚሸጡበትን መንገድ ያስተምራል። ዋጋው 4,500 ብር ነው።');
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 9. Info Q&A: YouTube Success Course (የዩቲዩብ ስልጠና)
    if (intent === 'youtube') {
      const msg = interruptPrefix + (isEng 
        ? 'Our YouTube Mastery course teaches you how to launch channels from scratch and earn in USD. Price is 5,500 ETB.' 
        : 'የዩቲዩብ ስልጠናችን የዩቲዩብ ቻናል ከዜሮ ከፍተው በዶላር ገቢ የሚያገኙበትን የተሟላ መንገድ ያስተምራል። ዋጋው 5,500 ብር ነው።');
      setAiResponse(msg);
      speakVoice(msg, () => resumeListeningForNextTurn());
      return;
    }

    // 10. Intelligent Conversational AI Query (High Precision with Contextual Grounding)
    setIsAiProcessing(true);
    setStatusMessage(isEng ? 'Tsehay AI is thinking...' : 'ፀሐይ AI መልስ በማዘጋጀት ላይ...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User voice query: "${cleanText}". Target language: ${isEng ? 'ENGLISH' : 'AMHARIC'}. Respond naturally, concisely (1-2 sentences), directly addressing what the user asked. Verified Facts: Platform: Tsehay Campus. Address: Bole, Addis Ababa, Ethiopia. Phone: 0980209090. Telegram: @TsehayTeam. Founder: Eyoub Sahle. Shein: 4,500 ETB. YouTube: 5,500 ETB. Digital Marketing: Free. Digital Certificates: Included. Do NOT return address unless asked for address. Do NOT repeat robotic greetings.`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let rawReply = (data.reply || data.text || (isEng ? 'Your question was received! Feel free to ask anything else.' : 'ጥያቄዎ ደርሶኛል! ተጨማሪ ማንኛውንም ጥያቄ መጠየቅ ይችላሉ።')).replace(/[*_#]/g, '').trim();
        let reply = interruptPrefix + rawReply;
        setAiResponse(reply);
        speakVoice(reply, () => resumeListeningForNextTurn());
      } else {
        const defaultReply = interruptPrefix + (isEng 
          ? 'Got it! Explore our courses catalog or contact us at 0980209090.' 
          : 'ጥያቄዎ ደርሶኛል! ስለ ፀሐይ ካምፓስ ስልጠናዎች፣ ክፍያና ምዝገባ በዝርዝር የኮርሶች ገጻችንን ይመልከቱ።');
        setAiResponse(defaultReply);
        speakVoice(defaultReply, () => resumeListeningForNextTurn());
      }
    } catch (e) {
      const fallbackReply = interruptPrefix + (isEng 
        ? 'Thank you! For more details, browse our courses or call 0980209090.' 
        : 'ጥያቄዎ ደርሶኛል! ለተጨማሪ ዝርዝር የኮርሶች ገጻችንን መመልከት ወይም በ 0980209090 መደወል ይችላሉ።');
      setAiResponse(fallbackReply);
      speakVoice(fallbackReply, () => resumeListeningForNextTurn());
    } finally {
      setIsAiProcessing(false);
    }
  }, [pathname, router, speakVoice, playSciFiSound, stopVoiceOutput, closeAssistant]);

  // 🔄 Continuous Multi-Turn Listening Loop with Auto-Dismiss of Old Spoken Caption
  const resumeListeningForNextTurn = useCallback(() => {
    if (!isOpenRef.current) return;
    const isEng = selectedLangRef.current === 'en';

    if (captionDismissTimerRef.current) clearTimeout(captionDismissTimerRef.current);
    captionDismissTimerRef.current = setTimeout(() => {
      if (isOpenRef.current && !isSpeakingRef.current) {
        setAiResponse('');
        setTranscript('');
        setInterimTranscript('');
        activeTranscriptRef.current = '';
        setStatusMessage(isEng ? 'Listening... Ask your next question' : 'እየሰማሁ ነው... ቀጣይ ጥያቄዎን ይናገሩ');
        startSpeechRecognition();
      }
    }, 1400);
  }, []);

  // 🎙️ High-Sensitivity Speech Recognition Engine with Multi-Alternative Phonetic Capture & Auto-Correction
  const startSpeechRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage(selectedLangRef.current === 'en' ? 'Voice recognition not supported in this browser. Use Chrome/Edge.' : 'ይቅርታ፣ የእርስዎ ብራውዘር የድምፅ ማወቂያ አይደግፍም። Chrome ወይም Edge ይጠቀሙ።');
      playSciFiSound('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLangRef.current === 'en' ? 'en-US' : 'am-ET';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        if (!isSpeakingRef.current) {
          setStatusMessage(selectedLangRef.current === 'en' ? 'Listening...' : 'እየሰማሁ ነው...');
        }
        setupAudioAnalyser();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // 🛑 IMMEDIATE GEMINI LIVE BARGE-IN: If speech is heard while AI is speaking, interrupt AI audio instantly!
        if (isSpeakingRef.current) {
          stopVoiceOutput();
          wasInterruptedRef.current = true;
          setStatusMessage(selectedLangRef.current === 'en' ? 'Understood! Listening...' : 'እሺ፣ እያዳመጥኩ ነው...');
        }

        let rawFinalStr = '';
        let rawInterimStr = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            rawFinalStr += event.results[i][0].transcript + ' ';
          } else {
            rawInterimStr += event.results[i][0].transcript;
          }
        }

        rawFinalStr = rawFinalStr.trim();
        const isEng = selectedLangRef.current === 'en';

        // Auto-correct live phonetics on the fly
        const autoCorrected = autoCorrectAmharicSpeech(rawFinalStr || rawInterimStr, isEng);

        setTranscript(rawFinalStr ? autoCorrected.corrected : rawFinalStr);
        setInterimTranscript(rawInterimStr);

        const fullSpeech = (rawFinalStr + ' ' + rawInterimStr).trim();
        activeTranscriptRef.current = fullSpeech;

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (fullSpeech.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (activeTranscriptRef.current.trim()) {
              const finalCorrected = autoCorrectAmharicSpeech(activeTranscriptRef.current.trim(), selectedLangRef.current === 'en');
              handleVoiceCommand(finalCorrected.corrected, finalCorrected.detectedIntent);
            }
          }, 1100);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          setStatusMessage(selectedLangRef.current === 'en' ? 'Microphone permission denied.' : 'የማይክሮፎን ፈቃድ አልተሰጠም።');
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
  }, [handleVoiceCommand, playSciFiSound, stopVoiceOutput]);

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

  // 🎙️ Handle Mic Tap (Instant Manual Toggle / Immediate Interruption)
  const handleMicToggle = () => {
    // If AI is speaking, tapping immediately interrupts AI voice
    if (isSpeaking) {
      stopVoiceOutput();
      wasInterruptedRef.current = true;
    }

    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      const spoken = (activeTranscriptRef.current || transcript || interimTranscript).trim();
      if (spoken) {
        const isEng = selectedLang === 'en';
        const finalCorrected = autoCorrectAmharicSpeech(spoken, isEng);
        handleVoiceCommand(finalCorrected.corrected, finalCorrected.detectedIntent);
      } else {
        setStatusMessage(selectedLang === 'en' ? 'Listening paused' : 'ማዳመጥ ቆሟል');
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
  const openAssistant = useCallback((initialLang?: 'am' | 'en') => {
    if (initialLang) {
      setSelectedLang(initialLang);
      selectedLangRef.current = initialLang;
    }
    setIsOpen(true);
    isOpenRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    activeTranscriptRef.current = '';
    setAiResponse('');
    const isEng = selectedLangRef.current === 'en';
    setStatusMessage(isEng ? 'Hello! How can I help you today?' : 'ሰላም! ምን ልርዳዎት?');
    playSciFiSound('activate');

    const greeting = isEng ? 'Hello! How can I help you today?' : 'ሰላም! ምን ልርዳዎት?';
    speakVoice(greeting, () => {
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

  // 👂 Ultra-Resilient Background Standby Wake Word Listener ("ፀሐይ", "Hey Tsehay", etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || !isStandbyActive) {
      if (standbyRecognitionRef.current) {
        try { standbyRecognitionRef.current.abort(); } catch (e) {}
        standbyRecognitionRef.current = null;
      }
      return;
    }

    // If modal is open, standby is paused in favor of active modal listener
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
    let retryTimer: NodeJS.Timeout | null = null;

    const startStandby = () => {
      if (isOpenRef.current || !isStandbyActive) return;
      try {
        if (standbyRecognitionRef.current) {
          try { standbyRecognitionRef.current.abort(); } catch (e) {}
        }

        const standby = new SpeechRecognition();
        standby.lang = selectedLangRef.current === 'en' ? 'en-US' : 'am-ET';
        standby.continuous = true;
        standby.interimResults = true;
        standby.maxAlternatives = 2;

        standby.onresult = (event: SpeechRecognitionEvent) => {
          let heard = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            heard += event.results[i][0].transcript.toLowerCase() + ' ';
          }
          heard = heard.trim();

          const normHeard = normalizeAmharicPhonetics(heard);

          // 1. Check for English Wake Word
          const isEngWake = /hey\s*tsehay|hello\s*tsehay|hi\s*tsehay|tsehay\s*ai|hey\s*tsahay|hello\s*tsahay/i.test(heard);

          // 2. Check for Amharic or General "ፀሐይ" Wake Word
          const isAmWake = 
            /ጸሀይ|ጸሐይ|ፀሀይ|ፀሐይ|ፀሀዬ|ፀሐዬ|ጸሃዬ|ሰላም\s*ጸ|ሰላም\s*ፀ|ሄይ\s*ጸ|ሄይ\s*ፀ|tsehay|tsahay/i.test(normHeard) ||
            /tsehay|tsahay/i.test(heard);

          if (isEngWake || isAmWake) {
            try { standby.abort(); } catch(e) {}
            standbyRecognitionRef.current = null;
            openAssistant(isEngWake ? 'en' : 'am');
          }
        };

        standby.onerror = () => {};

        standby.onend = () => {
          if (isStandbyActive && !isOpenRef.current && !isRestarting) {
            isRestarting = true;
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              isRestarting = false;
              if (isStandbyActive && !isOpenRef.current) {
                startStandby();
              }
            }, 300);
          }
        };

        standbyRecognitionRef.current = standby;
        standby.start();
      } catch (e) {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (isStandbyActive && !isOpenRef.current) startStandby();
        }, 600);
      }
    };

    startStandby();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (standbyRecognitionRef.current) {
        try { standbyRecognitionRef.current.abort(); } catch (e) {}
        standbyRecognitionRef.current = null;
      }
    };
  }, [isStandbyActive, isOpen, openAssistant]);

  // ⌨️ Keyboard Shortcut Listener
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

  // 🌊 🎨 Authentic Apple Siri Fluid Multi-Ribbon Waveform Visualizer
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

      // Energy factor based on voice activity
      const energy = isListening 
        ? Math.max(0.4, micVolume * 1.6) 
        : isSpeaking && !isAudioPaused 
        ? 1.1 + Math.sin(step * 0.15) * 0.35
        : 0.25;

      // Siri's 4 Iconic Chromatic Ribbons:
      // 1. Electric Cyan (#00F0FF)
      // 2. Neon Magenta (#FF2D55)
      // 3. Electric Purple (#A855F7)
      // 4. Solar Gold (#F59E0B)
      const ribbons = [
        { color: 'rgba(0, 240, 255, 0.75)', freq: 0.022, amp: 18 * energy, speed: 0.06, phase: 0 },
        { color: 'rgba(255, 45, 85, 0.7)', freq: 0.018, amp: 22 * energy, speed: -0.05, phase: Math.PI / 3 },
        { color: 'rgba(168, 85, 247, 0.8)', freq: 0.025, amp: 16 * energy, speed: 0.045, phase: Math.PI / 1.5 },
        { color: 'rgba(245, 158, 11, 0.75)', freq: 0.015, amp: 14 * energy, speed: -0.04, phase: Math.PI }
      ];

      // Draw each smooth flowing sine wave ribbon
      ribbons.forEach((ribbon) => {
        ctx.beginPath();
        ctx.lineWidth = 3.0;
        ctx.strokeStyle = ribbon.color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = ribbon.color;
        ctx.lineCap = 'round';

        for (let x = 0; x <= width; x += 3) {
          // Windowing envelope (attenuate at left and right edges for fluid floating wave look)
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * ribbon.freq + step * ribbon.speed + ribbon.phase) * (ribbon.amp * envelope);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Central glowing particle nodes
      const glowGrad = ctx.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, 40 * energy);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      glowGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
      glowGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.beginPath();
      ctx.arc(width / 2, centerY, 40 * energy, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
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
      {/* 🌟 1. APPLE SIRI GLOWING LUMINESCENT WAVE ORB (Floating Button) */}
      <div 
        className="fixed bottom-8 right-6 sm:bottom-10 sm:right-8 z-[9985] flex flex-col items-end gap-2 select-none"
        style={{ willChange: 'transform' }}
      >
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="ፀሐይ Siri Voice AI"
          className={`relative group flex items-center justify-center w-14 h-14 sm:w-15 sm:h-15 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 cursor-pointer ${
            isOpen 
              ? 'scale-105 shadow-[0_0_35px_rgba(255,45,85,0.7)]'
              : 'hover:scale-110 shadow-[0_0_30px_rgba(0,240,255,0.45),0_0_20px_rgba(168,85,247,0.35)]'
          }`}
          title="Tsehay Siri Voice AI"
        >
          {/* Animated Multi-Color Apple Siri Halo Ring */}
          <span 
            className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#00f0ff] via-[#a855f7] via-[#ff2d55] to-[#f59e0b] opacity-75 blur-md group-hover:opacity-100 transition-opacity animate-spin-slow" 
            style={{ animationDuration: '6s' }}
          />

          {/* Siri Glass Inner Sphere */}
          <div className="relative z-10 w-full h-full rounded-full bg-black/90 backdrop-blur-xl border border-white/25 flex items-center justify-center overflow-hidden shadow-inner">
            
            {/* Dynamic Swirling Siri Waveform Core */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/30 via-fuchsia-500/20 to-amber-500/20 animate-pulse" />

            {isOpen ? (
              <i className="fa-solid fa-xmark text-lg text-white relative z-20"></i>
            ) : (
              <div className="relative z-20 flex items-center justify-center gap-0.5">
                {/* Modern Siri 5-Bar Dynamic Frequency Wave */}
                <span className="w-1 h-3 rounded-full bg-[#00f0ff] animate-pulse"></span>
                <span className="w-1 h-5 rounded-full bg-[#a855f7] animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-1 h-7 rounded-full bg-[#ff2d55] animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1 h-5 rounded-full bg-[#f59e0b] animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                <span className="w-1 h-3 rounded-full bg-[#00f0ff] animate-pulse" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* 🔮 2. SLEEK APPLE SIRI DYNAMIC BOTTOM HUD CAPSULE & FLUID WAVEFORM */}
      {isOpen && (
        <div 
          className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 w-[92vw] sm:w-[390px] max-w-md z-[9990] flex flex-col items-center animate-in slide-in-from-bottom-8 duration-300 pointer-events-auto"
        >
          {/* iOS 18 Siri Glassmorphic Capsule */}
          <div 
            className="w-full rounded-[28px] p-4 bg-black/85 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(0,240,255,0.25),0_0_30px_rgba(255,45,85,0.2)] flex flex-col relative overflow-hidden backdrop-blur-3xl"
          >
            {/* Top Bar: Siri Status, Language Switcher & Auto-Wake */}
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                
                {/* Siri Dynamic Pill Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>{selectedLang === 'en' ? 'Tsehay Siri' : 'ፀሐይ Siri'}</span>
                </span>

                {/* Language Switcher Pill */}
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedLang === 'am' ? 'en' : 'am';
                    setSelectedLang(next);
                    selectedLangRef.current = next;
                    setStatusMessage(next === 'en' ? 'Switched to English. Ask me anything!' : 'ወደ አማርኛ ተቀይሯል። ጥያቄዎን ይናገሩ!');
                    if (isListening) {
                      stopSpeechRecognition();
                      setTimeout(() => startSpeechRecognition(), 200);
                    }
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 transition cursor-pointer flex items-center gap-1"
                  title="Switch Language (አማርኛ / English)"
                >
                  <i className="fa-solid fa-globe text-cyan-400 text-[10px]"></i>
                  <span>{selectedLang === 'am' ? 'አማርኛ' : 'English'}</span>
                </button>

                {/* Standby Auto-Wake badge */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStandbyActive;
                    setIsStandbyActive(next);
                    try { localStorage.setItem('tsehay_voice_standby', next ? 'true' : 'false'); } catch (e) {}
                  }}
                  className={`px-2 py-1 rounded-full text-[9px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                    isStandbyActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 text-gray-400 border-white/10'
                  }`}
                  title='Auto Wake ("ፀሐይ" / "Hey Tsehay")'
                >
                  <span className={`w-1 h-1 rounded-full ${isStandbyActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isStandbyActive ? 'Auto Wake' : 'Off'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={closeAssistant}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            {/* 🌊 Authentic Apple Siri Multi-Ribbon Sine Waveform Visualizer Canvas */}
            <div className="w-full h-16 flex items-center justify-center relative my-1 overflow-hidden rounded-2xl bg-black/40 border border-white/5">
              <canvas
                ref={canvasRef}
                width={360}
                height={70}
                className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]"
              />
            </div>

            {/* Live Subtitle Transcription & Spoken Response Bubble */}
            <div className="w-full min-h-[38px] flex flex-col justify-center my-1.5 px-1">
              {transcript || interimTranscript ? (
                <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-2.5 mb-1.5 transition-all duration-300">
                  <p className="text-xs font-bold text-white leading-relaxed">
                    <span className="text-cyan-400 font-black mr-1">{selectedLang === 'en' ? 'You:' : 'እርስዎ:'}</span>
                    "{transcript} <span className="text-pink-400 animate-pulse">{interimTranscript}</span>"
                  </p>
                </div>
              ) : (
                <div className="text-center py-0.5">
                  <p className="text-[11px] font-bold text-gray-300">
                    {statusMessage}
                  </p>
                </div>
              )}

              {/* AI Spoken Answer Subtitle Bubble */}
              {aiResponse && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-cyan-950/80 border border-cyan-500/40 text-cyan-100 text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-300 shadow-lg">
                  <div className="w-5 h-5 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                    <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-volume-high animate-bounce' : isAudioPaused ? 'fa-pause' : 'fa-check'} text-[10px]`}></i>
                  </div>
                  <span className="text-left flex-1 leading-relaxed">{aiResponse}</span>
                </div>
              )}
            </div>

            {/* 🛸 3. APPLE SIRI HUD CONTROLS (Wave Toggle Deck & Mic Deck) */}
            <div className="w-full flex items-center justify-between gap-2.5 mt-1 pt-2.5 border-t border-white/10">
              
              {/* ⏯️ Siri Audio Playback Deck */}
              <button
                type="button"
                onClick={togglePlayPauseAudio}
                className={`relative group flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-[11px] font-black transition-all duration-300 cursor-pointer overflow-hidden border ${
                  isSpeaking && !isAudioPaused
                    ? 'bg-gradient-to-r from-purple-950/90 to-pink-950/90 border-pink-500/60 text-pink-300 shadow-[0_0_15px_rgba(255,45,85,0.4)]'
                    : isAudioPaused
                    ? 'bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'bg-white/[0.05] hover:bg-white/15 text-gray-300 border-white/15'
                }`}
                title={isSpeaking && !isAudioPaused ? 'Pause Voice Playback' : 'Resume Voice Playback'}
              >
                {/* Live Siri Equalizer Bars */}
                <div className="flex items-center gap-0.5">
                  <span className={`w-0.5 rounded-full bg-current transition-all ${isSpeaking && !isAudioPaused ? 'h-3 animate-pulse' : 'h-1.5'}`}></span>
                  <span className={`w-0.5 rounded-full bg-current transition-all ${isSpeaking && !isAudioPaused ? 'h-4.5 animate-bounce' : 'h-2'}`} style={{ animationDelay: '0.15s' }}></span>
                  <span className={`w-0.5 rounded-full bg-current transition-all ${isSpeaking && !isAudioPaused ? 'h-2.5 animate-pulse' : 'h-1'}`} style={{ animationDelay: '0.3s' }}></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <i className={`fa-solid ${isSpeaking && !isAudioPaused ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                  <span>{isSpeaking && !isAudioPaused ? (selectedLang === 'en' ? 'Pause' : 'አቁም') : isAudioPaused ? (selectedLang === 'en' ? 'Resume' : 'አስቀጥል') : (selectedLang === 'en' ? 'Play' : 'አጫውት')}</span>
                </div>
              </button>

              {/* 🎙️ Apple Siri Dynamic Mic Deck */}
              <button
                type="button"
                onClick={handleMicToggle}
                className={`relative group flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-[11px] font-black transition-all duration-300 cursor-pointer overflow-hidden shadow-lg active:scale-95 border ${
                  isListening
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white border-pink-400 shadow-[0_0_25px_rgba(255,45,85,0.7)] animate-pulse'
                    : 'bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ff2d55] text-white border-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.5)] hover:brightness-110 hover:scale-[1.02]'
                }`}
                title={isListening ? 'Stop Listening & Get Answer' : 'Tap to Speak'}
              >
                <div className="flex items-center gap-1.5">
                  <i className={`fa-solid ${isListening ? 'fa-wave-square text-xs animate-bounce' : 'fa-microphone text-xs'}`}></i>
                  <span>{isListening ? (selectedLang === 'en' ? 'Listening...' : 'እየሰማሁ ነው') : (selectedLang === 'en' ? 'Speak' : 'ተናገር')}</span>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
