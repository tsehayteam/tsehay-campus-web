'use client';

/**
 * ═════════════════════════════════════════════════════════════════════
 *  TSEHAY AI DYNAMIC BILINGUAL TEXT-TO-SPEECH (TTS) ENGINE
 *  Seamless real-time language detection & voice switching (am-ET / en-US)
 * ═════════════════════════════════════════════════════════════════════
 */

export interface LanguageChunk {
  text: string;
  lang: 'am-ET' | 'en-US';
}

// Ge'ez / Ethiopic Unicode block: U+1200 to U+137F, U+1380 to U+139F, U+2D80 to U+2DDF, U+AB00 to U+AB2F
const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;
const LATIN_REGEX = /[a-zA-Z]/;

// Retain active utterance references to prevent Chromium garbage collection speech-cutoff bug
let activeUtterances: SpeechSynthesisUtterance[] = [];
let cachedVoices: SpeechSynthesisVoice[] = [];
let fallbackAudio: HTMLAudioElement | null = null;

// Pre-warm voices cache
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Cleans text for speech synthesis (strips markdown, code blocks, URLs, emojis, and formatting characters)
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#>[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    // Strip emojis so TTS does not speak emoji descriptors
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects whether a string is predominantly Ethiopic / Amharic or Latin / English.
 * Takes active siteLang into account as a preference or contextual hint.
 */
export function detectTextLanguage(text: string, siteLang?: 'am' | 'en' | string): 'am-ET' | 'en-US' {
  if (!text) {
    return siteLang === 'en' ? 'en-US' : 'am-ET';
  }

  const ethiopicMatches = text.match(/[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g);
  const ethiopicCount = ethiopicMatches ? ethiopicMatches.length : 0;

  const latinMatches = text.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // If text contains ANY Ethiopic character, it is definitely Amharic
  if (ethiopicCount > 0) {
    return 'am-ET';
  }

  // If site language is English and no Ethiopic characters exist, use English
  if (siteLang === 'en') {
    return 'en-US';
  }

  // If text has Latin characters, use English
  if (latinCount > 0) {
    return 'en-US';
  }

  // Fallback to site language or Amharic
  return siteLang === 'en' ? 'en-US' : 'am-ET';
}

/**
 * Detects whether a string is predominantly Ethiopic / Amharic.
 */
export function isPredominantlyAmharic(text: string): boolean {
  if (!text) return true;
  const ethiopicMatches = text.match(/[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g);
  const ethiopicCount = ethiopicMatches ? ethiopicMatches.length : 0;
  
  const latinMatches = text.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;
  
  return ethiopicCount >= latinCount;
}

/**
 * Strict Amharic voice detection in SpeechSynthesis.
 * Avoids false positive matches like Estonian ('et' / 'et-EE').
 */
export function filterAmharicVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => {
      const lang = v.lang.toLowerCase();
      const name = v.name.toLowerCase();
      return (
        lang === 'am' ||
        lang === 'am-et' ||
        lang.startsWith('am-') ||
        name.includes('amharic') ||
        name.includes('amhar')
      );
    }) || null
  );
}

/**
 * Filter for highest quality English voice (en-US or en-GB).
 */
export function filterEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // First priority: natural / pleasant English voices
  const naturalEn = voices.find(v => {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();
    return (
      (lang === 'en-us' || lang === 'en-gb' || lang.startsWith('en')) &&
      (name.includes('natural') ||
        name.includes('google') ||
        name.includes('online') ||
        name.includes('samantha') ||
        name.includes('aria') ||
        name.includes('jenny') ||
        name.includes('zira') ||
        name.includes('guy') ||
        name.includes('david'))
    );
  });
  if (naturalEn) return naturalEn;

  // Second priority: en-US or en-GB locale
  return (
    voices.find(v => v.lang.toLowerCase() === 'en-us') ||
    voices.find(v => v.lang.toLowerCase() === 'en-gb') ||
    voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
    null
  );
}

/**
 * High-performance word-by-word language segmentation.
 * Automatically classifies consecutive words into seamless Amharic (am-ET)
 * and English (en-US) phrases.
 */
export function segmentTextByLanguage(rawText: string): LanguageChunk[] {
  const clean = cleanTextForSpeech(rawText);
  if (!clean) return [];

  const words = clean.split(/\s+/).filter(w => w.trim().length > 0);
  if (words.length === 0) return [];

  const defaultLang: 'am-ET' | 'en-US' = isPredominantlyAmharic(clean) ? 'am-ET' : 'en-US';

  const chunks: LanguageChunk[] = [];
  let currentLang: 'am-ET' | 'en-US' = defaultLang;
  let currentWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hasEthiopic = ETHIOPIC_REGEX.test(word);
    const hasLatin = LATIN_REGEX.test(word);

    let wordLang: 'am-ET' | 'en-US';

    if (hasEthiopic && !hasLatin) {
      wordLang = 'am-ET';
    } else if (hasLatin && !hasEthiopic) {
      wordLang = 'en-US';
    } else if (hasEthiopic && hasLatin) {
      // Mixed hybrid word (e.g., "YouTube-ላይ" or "Webሳይት")
      const ethCount = (word.match(/[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g) || []).length;
      const latCount = (word.match(/[a-zA-Z]/g) || []).length;
      wordLang = ethCount >= latCount ? 'am-ET' : 'en-US';
    } else {
      // Neutral token (numbers, punctuation, symbols: e.g. "100%", "2025", "...", "—", "፦")
      wordLang = currentWords.length > 0 ? currentLang : defaultLang;
    }

    if (currentWords.length === 0) {
      currentLang = wordLang;
      currentWords.push(word);
    } else if (wordLang === currentLang) {
      currentWords.push(word);
    } else {
      chunks.push({
        text: currentWords.join(' '),
        lang: currentLang
      });
      currentLang = wordLang;
      currentWords = [word];
    }
  }

  if (currentWords.length > 0) {
    chunks.push({
      text: currentWords.join(' '),
      lang: currentLang
    });
  }

  return chunks;
}

/**
 * Returns best available voices for Amharic and English.
 */
export function getAvailableVoices(): {
  amVoice: SpeechSynthesisVoice | null;
  enVoice: SpeechSynthesisVoice | null;
  allVoices: SpeechSynthesisVoice[];
} {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { amVoice: null, enVoice: null, allVoices: [] };
  }

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;

  const amVoice = filterAmharicVoice(voices);
  const enVoice = filterEnglishVoice(voices);

  return { amVoice, enVoice, allVoices: voices };
}

/**
 * Stops any active speech synthesis and clears utterance & audio buffers.
 */
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch (e) {}
    fallbackAudio = null;
  }
  activeUtterances = [];
}

/**
 * Plays authentic native Amharic or English speech via the server TTS streaming endpoint.
 * This guarantees native Ethiopian accent without relying on browser speech engine.
 */
function playServerTTS(
  cleanText: string,
  lang: 'am' | 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err?: any) => void
) {
  try {
    // Immediate UI feedback so button shows active / reading state right away
    if (onStart) onStart();

    const encoded = encodeURIComponent(cleanText.slice(0, 750));
    const audioUrl = `/api/ai/tts?text=${encoded}&lang=${lang}`;
    const audio = new Audio(audioUrl);
    fallbackAudio = audio;

    let hasEnded = false;
    const handleEnd = () => {
      if (!hasEnded) {
        hasEnded = true;
        fallbackAudio = null;
        if (onEnd) onEnd();
      }
    };

    audio.onended = handleEnd;
    audio.onerror = (e) => {
      console.warn('Server TTS audio playback error, falling back to speech synthesis:', e);
      fallbackAudio = null;
      // Secondary fallback to window.speechSynthesis so user is never left with silence
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
        u.lang = lang === 'am' ? 'am-ET' : 'en-US';
        u.rate = 0.92;
        u.onend = handleEnd;
        u.onerror = () => {
          hasEnded = true;
          if (onError) onError(e);
        };
        activeUtterances = [u];
        window.speechSynthesis.speak(u);
      } else {
        hasEnded = true;
        if (onError) onError(e);
      }
    };

    audio.play().catch(err => {
      console.warn('Audio play promise rejected:', err);
      // If play fails (e.g. autoplay restriction), fallback to speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(cleanText.slice(0, 300));
        u.lang = lang === 'am' ? 'am-ET' : 'en-US';
        u.onend = handleEnd;
        u.onerror = () => {
          hasEnded = true;
          if (onError) onError(err);
        };
        activeUtterances = [u];
        window.speechSynthesis.speak(u);
      } else {
        fallbackAudio = null;
        if (onError) onError(err);
      }
    });
  } catch (err) {
    fallbackAudio = null;
    if (onError) onError(err);
  }
}

/**
 * Speaks text using window.speechSynthesis with automatic language detection.
 * 
 * Rules:
 * 1. Detects the active language of the text.
 * 2. If it is Amharic, sets utterance.lang = 'am-ET'. Filters getVoices() for a native Amharic voice.
 *    DOES NOT read Amharic with an English phonetic engine. If no native Amharic voice is installed
 *    in the browser, it seamlessly plays authentic native Amharic audio from /api/ai/tts.
 * 3. If switched to English (EN), sets voice locale to en-US / en-GB with natural English cadence.
 */
export function speakWithLanguageDetection({
  text,
  siteLang,
  onStart,
  onEnd,
  onError
}: {
  text: string;
  siteLang?: 'am' | 'en' | string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined') {
    if (onError) onError();
    return null;
  }

  try {
    // 1. Cancel previous speech and clear buffers
    stopSpeech();

    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return null;
    }

    // 2. Unpause if engine was frozen
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // 3. Detect language
    const detectedLang = detectTextLanguage(clean, siteLang);
    const isAmharic = detectedLang === 'am-ET';

    const { amVoice, enVoice } = getAvailableVoices();

    // 4. Handle Amharic text
    if (isAmharic) {
      // If browser has a native Amharic voice, use window.speechSynthesis with 'am-ET'
      if (amVoice && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'am-ET';
        utterance.voice = amVoice;
        utterance.rate = 0.90; // Calm, natural cadence for Amharic
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          if (onStart) onStart();
        };
        utterance.onend = () => {
          activeUtterances = [];
          if (onEnd) onEnd();
        };
        utterance.onerror = (e: any) => {
          if (e && (e.error === 'canceled' || e.error === 'interrupted')) {
            activeUtterances = [];
            return;
          }
          activeUtterances = [];
          // Fallback to server Amharic TTS
          playServerTTS(clean, 'am', onStart, onEnd, onError);
        };

        activeUtterances = [utterance];
        window.speechSynthesis.speak(utterance);
        return utterance;
      } else {
        // No native Amharic voice found in browser getVoices().
        // CRITICAL: DO NOT read Amharic with an English phonetic engine.
        // Stream authentic native Amharic voice via /api/ai/tts.
        playServerTTS(clean, 'am', onStart, onEnd, onError);
        return null;
      }
    }

    // 5. Handle English text (or site switched to English)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = enVoice?.lang || 'en-US';
      if (enVoice) {
        utterance.voice = enVoice;
      }
      utterance.rate = 0.96; // Fluent, native cadence for English terms
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (onStart) onStart();
      };
      utterance.onend = () => {
        activeUtterances = [];
        if (onEnd) onEnd();
      };
      utterance.onerror = (e: any) => {
        if (e && (e.error === 'canceled' || e.error === 'interrupted')) {
          activeUtterances = [];
          return;
        }
        activeUtterances = [];
        playServerTTS(clean, 'en', onStart, onEnd, onError);
      };

      activeUtterances = [utterance];
      window.speechSynthesis.speak(utterance);
      return utterance;
    } else {
      playServerTTS(clean, 'en', onStart, onEnd, onError);
      return null;
    }
  } catch (e) {
    activeUtterances = [];
    if (onError) onError(e);
    return null;
  }
}
