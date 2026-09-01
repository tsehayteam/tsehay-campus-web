'use client';

/**
 * Detects whether a string is predominantly Ethiopic / Amharic or Latin / English.
 */
export function isPredominantlyAmharic(text: string): boolean {
  if (!text) return true;
  // Ge'ez / Ethiopic Unicode block: U+1200 to U+137F, U+1380 to U+139F, U+2D80 to U+2DDF, U+AB00 to U+AB2F
  const ethiopicRegex = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g;
  const ethiopicMatches = text.match(ethiopicRegex);
  const ethiopicCount = ethiopicMatches ? ethiopicMatches.length : 0;
  
  const latinRegex = /[a-zA-Z]/g;
  const latinMatches = text.match(latinRegex);
  const latinCount = latinMatches ? latinMatches.length : 0;
  
  return ethiopicCount >= latinCount;
}

/**
 * Cleans text for speech synthesis (strips markdown, code blocks, URLs, and formatting characters)
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#>[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Speaks text using window.speechSynthesis with automatic language detection,
 * Amharic voice prioritization, and calm 0.88 speech rate for Amharic or 0.96 for English.
 */
export function speakWithLanguageDetection({
  text,
  onStart,
  onEnd,
  onError
}: {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onError) onError();
    return null;
  }

  try {
    window.speechSynthesis.cancel();
    const clean = cleanTextForSpeech(text);
    if (!clean) {
      if (onEnd) onEnd();
      return null;
    }

    const isAmharic = isPredominantlyAmharic(clean);
    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();

    if (isAmharic) {
      utterance.lang = 'am-ET';
      utterance.rate = 0.88; // Calm, fluid, natural cadence for Amharic
      utterance.pitch = 1.0;

      const amVoice = voices.find(v => 
        v.lang.toLowerCase().includes('am') || 
        v.lang.toLowerCase().includes('et') || 
        v.name.toLowerCase().includes('amharic') ||
        v.name.toLowerCase().includes('ethiopia')
      );
      if (amVoice) utterance.voice = amVoice;
    } else {
      utterance.lang = 'en-US';
      utterance.rate = 0.96; // Smooth, natural English cadence
      utterance.pitch = 1.0;

      const enVoice = voices.find(v => 
        v.lang === 'en-US' && 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Premium'))
      ) || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
      
      if (enVoice) utterance.voice = enVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    if (onError) utterance.onerror = onError;

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (e) {
    if (onError) onError();
    return null;
  }
}
