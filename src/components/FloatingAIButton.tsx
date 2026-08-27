'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import FormattedAiText from '@/components/FormattedAiText';

interface Message {
  role: 'user' | 'ai';
  text: string;
  image?: string;
  audioUrl?: string;
  timestamp?: string;
  copied?: boolean;
}

export default function FloatingAIButton() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'ሰላም! እንኳን ወደ ፀሐይ ካምፓስ በደህና መጡ! ዛሬ ስለ ስልጠናዎቻችን፣ ስለ ዩቲዩብ ስኬት፣ ስለ ምዝገባ ወይም ስለ ኮርሶች በምን ልርዳዎት? ማንኛውንም ጥያቄ በጽሑፍ፣ በድምፅ (Voice) ወይም በስክሪንሾት መጠየቅ ይችላሉ! ✨',
      timestamp: 'አሁን'
    }
  ]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [noteSavedIdx, setNoteSavedIdx] = useState<number | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // 🎙️ Voice Recording & Auto-Send States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch available courses to populate context selector
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const q = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses');
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCourses(list);
        }
      } catch (err) {
        console.warn("Floating AI courses fetch warning:", err);
      }
    };
    fetchCourses();
  }, []);

  // 2. Detect course context from current URL pathname
  useEffect(() => {
    if (pathname && pathname.includes('/courses/') && courses.length > 0) {
      const courseId = pathname.split('/courses/')[1]?.split('/')[0];
      const match = courses.find(c => c.id === courseId);
      if (match) setSelectedCourse(match);
    }
  }, [pathname, courses]);

  // 3. Load chat history from Firestore or LocalStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadHistory = async () => {
      try {
        const storageKey = user?.uid ? `tsehay_floating_ai_${user.uid}` : 'tsehay_floating_ai_guest';
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
          } catch (e) {}
        }

        if (user?.uid) {
          const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'floating_history');
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.messages) {
            setMessages(snap.data().messages);
          }
        }
      } catch (err) {
        console.warn("Could not load floating AI history:", err);
      }
    };

    loadHistory();
  }, [user]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Subtle web audio pop feedback
  const playSoundEffect = (type: 'send' | 'receive') => {
    try {
      if (typeof window === 'undefined' || !window.AudioContext) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(540, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(780, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {}
  };

  // 4. Send Message Handler
  const handleSendMessage = useCallback(async (textToSend?: string, imagePayload?: string, audioPayload?: string) => {
    const rawText = (textToSend !== undefined ? textToSend : input).trim();
    const imageToSend = imagePayload !== undefined ? imagePayload : attachedImage;
    const audioToSend = audioPayload;

    if (!rawText && !imageToSend && !audioToSend) return;
    if (isLoading) return;

    playSoundEffect('send');

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let userDisplayMessage = rawText;
    if (!userDisplayMessage) {
      if (audioToSend) userDisplayMessage = "🎙️ የድምፅ መልዕክት (Voice Note)";
      else if (imageToSend) userDisplayMessage = "📸 ፎቶ ተያይዟል";
    }

    const newMsgs: Message[] = [
      ...messages,
      { 
        role: 'user', 
        text: userDisplayMessage, 
        image: imageToSend || undefined,
        timestamp: nowTime 
      }
    ];

    setMessages(newMsgs);
    setInput('');
    voiceTranscriptRef.current = '';
    setAttachedImage(null);
    setIsLoading(true);

    const storageKey = user?.uid ? `tsehay_floating_ai_${user.uid}` : 'tsehay_floating_ai_guest';
    try { localStorage.setItem(storageKey, JSON.stringify(newMsgs)); } catch (e) {}

    const courseContext = selectedCourse ? {
      courseTitle: selectedCourse.title,
      courseId: selectedCourse.id,
      category: selectedCourse.category,
      courseAiPrompt: selectedCourse.aiPrompt || '',
      whatYouWillLearn: Array.isArray(selectedCourse.whatYouWillLearn) 
        ? selectedCourse.whatYouWillLearn.join(', ') 
        : (selectedCourse.whatYouWillLearn || '')
    } : undefined;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: rawText,
          image: imageToSend,
          audio: audioToSend,
          courseContext
        })
      });

      const data = await res.json();
      const reply = data.reply || "ይቅርታ፣ አሁን ላይ ማስተናገድ አልቻልኩም። እባክዎ እንደገና ይሞክሩ።";

      const finalMsgs: Message[] = [
        ...newMsgs,
        { role: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ];

      setMessages(finalMsgs);
      playSoundEffect('receive');

      try { localStorage.setItem(storageKey, JSON.stringify(finalMsgs)); } catch (e) {}

      if (user?.uid) {
        try {
          const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'floating_history');
          await setDoc(docRef, { messages: finalMsgs, updatedAt: serverTimestamp() }, { merge: true });
        } catch (dbErr) {}
      }
    } catch (err) {
      const errMsgs: Message[] = [
        ...newMsgs,
        { role: 'ai', text: "የኢንተርኔት ኮኔክሽን ችግር አጋጥሟል። እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።", timestamp: nowTime }
      ];
      setMessages(errMsgs);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedImage, isLoading, messages, selectedCourse, user]);

  // 🎙️ 5. Enhanced Native Voice Recording & Direct Multimodal Send Engine
  const startVoiceRecording = async () => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Request microphone access for high-quality audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecordingVoice(true);
        setRecordingDuration(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;

      // Also start speech recognition if available for visual text preview
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'am-ET';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript + ' ';
            }
            if (fullTranscript.trim()) {
              voiceTranscriptRef.current = fullTranscript.trim();
              setInput(fullTranscript.trim());
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not start voice media recorder:", err);
      alert('እባክዎ የማይክሮፎን ፈቃድ ይስጡ (Please allow microphone access in browser settings).');
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceRecordingWithoutSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
    setRecordingDuration(0);
  };

  // 🚀 Stop and Send Directly to Gemini Multimodal Audio
  const stopAndSendVoice = async () => {
    const textPrompt = (voiceTranscriptRef.current || input).trim();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        try {
          recorder.stream.getTracks().forEach(t => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size > 200) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64Audio = reader.result as string;
              handleSendMessage(textPrompt, undefined, base64Audio);
            };
          } else if (textPrompt) {
            handleSendMessage(textPrompt);
          }
        } catch (e) {
          if (textPrompt) handleSendMessage(textPrompt);
        }
      };
      stopVoiceRecordingWithoutSend();
      return;
    }

    stopVoiceRecordingWithoutSend();
    if (textPrompt) {
      handleSendMessage(textPrompt);
    }
  };

  // 🔊 6. Native Amharic TTS Voice Reader for AI responses
  const playAiVoiceResponse = (text: string, idx: number) => {
    if (typeof window === 'undefined') return;

    if (playingAudioIdx === idx && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioIdx(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      const cleanText = text.replace(/[*_~`#\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      const encodedText = encodeURIComponent(cleanText);
      const audioUrl = `/api/ai/tts?text=${encodedText}&lang=am`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingAudioIdx(idx);

      audio.onended = () => {
        setPlayingAudioIdx(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAudioIdx(null);
        currentAudioRef.current = null;
      };

      audio.play().catch(() => {
        setPlayingAudioIdx(null);
        currentAudioRef.current = null;
      });
    } catch (e) {
      setPlayingAudioIdx(null);
    }
  };

  // 7. Image Attachment Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('እባክዎ ትክክለኛ የፎቶ ፋይል (PNG, JPG, JPEG, WebP) ይምረጡ።');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('የፎቶው መጠን ከ 8MB በታች መሆን አለበት።');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyMessage = (text: string, idx: number) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {}
  };

  const handleSaveToNotes = async (text: string, idx: number) => {
    if (!user) {
      alert('ማስታወሻዎችን ለማስቀመጥ እባክዎ መጀመሪያ ይግቡ (Please login).');
      return;
    }
    try {
      const noteDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'notes', `ai_note_${Date.now()}`);
      await setDoc(noteDocRef, {
        text,
        lessonTitle: selectedCourse ? `Tsehay AI (${selectedCourse.title})` : 'Tsehay AI ማስታወሻ',
        source: 'ai',
        createdAt: new Date().toLocaleDateString('am-ET')
      });
      setNoteSavedIdx(idx);
      setTimeout(() => setNoteSavedIdx(null), 2500);
    } catch (e) {}
  };

  const handleClearChat = () => {
    setShowConfirmClear(true);
  };

  const performClearChat = async () => {
    const initialMsg: Message[] = [
      {
        role: 'ai',
        text: 'ሰላም! የውይይት ታሪክ ጸድቷል። ማንኛውንም ጥያቄ በድምፅ ወይም በጽሑፍ መጠየቅ ይችላሉ! ✨',
        timestamp: 'አሁን'
      }
    ];
    setMessages(initialMsg);
    setShowConfirmClear(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingAudioIdx(null);
    }
    const storageKey = user?.uid ? `tsehay_floating_ai_${user.uid}` : 'tsehay_floating_ai_guest';
    try { localStorage.removeItem(storageKey); } catch (e) {}
    if (user?.uid) {
      try {
        const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'floating_history');
        await setDoc(docRef, { messages: initialMsg, updatedAt: serverTimestamp() });
      } catch (e) {}
    }
  };

  const quickPrompts = [
    { label: '💡 ስለ ካምፓሱ ስልጠናዎች', prompt: 'ስለ ፀሐይ ካምፓስ ኮርሶች፣ የትምህርት አሰጣጥ እና ጥቅሞች አጠቃላይ ማብራሪያ ስጠኝ።' },
    { label: '🚀 ተግባራዊ አተገባበር', prompt: selectedCourse ? `በ"${selectedCourse.title}" ኮርስ የተማርነውን በኢትዮጵያ ውስጥ በተግባር እንዴት ልተግብረው?` : 'ከኮርሶቹ የምናገኘውን እውቀት በተግባር ወደ ገቢ እንዴት እንቀይረዋለን?' },
    { label: '💳 የክፍያ እና ምዝገባ ሁኔታ', prompt: 'ለኮርሶቹ እንዴት በቴሌብር ወይም በባንክ እከፍላለሁ? የምዝገባው ሂደት እንዴት ነው?' },
    { label: '📜 ሰርተፊኬት አሰጣጥ', prompt: 'ኮርስ ሳጠናቅቅ ሰርተፊኬት እንዴት ነው የማገኘው?' }
  ];

  // 🚫 Completely remove Tsehay AI and its floating launcher icon from the Admin Dashboard
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9980] font-body select-none">
      
      {/* Hidden File Input for Image Upload */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* 🌟 1. EXPANDABLE CHAT MODAL */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[420px] md:w-[450px] bg-[#070b14]/95 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 relative h-[600px] sm:h-[640px] max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Subtle Glowing Background Mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,176,60,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(50,104,186,0.15),transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Confirmation Modal */}
          {showConfirmClear && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="relative bg-[#0b1222] border border-white/20 rounded-3xl p-5 w-full max-w-[290px] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center space-y-3.5 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 text-xl flex items-center justify-center mx-auto border border-red-500/30 shadow-inner">
                  <i className="fa-solid fa-trash-can"></i>
                </div>
                <div>
                  <h4 className="font-heading font-black text-white text-sm">ታሪክ ማጽዳት ይፈልጋሉ?</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">የ Tsehay AI የውይይት ታሪክ ሙሉ በሙሉ ይሰረዛል።</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs transition cursor-pointer active:scale-95"
                  >
                    ተመለስ
                  </button>
                  <button
                    type="button"
                    onClick={performClearChat}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-black text-xs transition shadow-lg shadow-red-500/30 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can text-[11px]"></i>
                    <span>አጥፋ</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header Bar */}
          <div className="relative px-5 py-3.5 bg-gradient-to-r from-[#0b1329]/90 via-[#0f1b38]/90 to-[#0b1329]/90 border-b border-white/10 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(249,176,60,0.5)] border border-white/30">
                  <i className="fa-solid fa-robot text-lg"></i>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0b1329] rounded-full animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                    Tsehay AI Tutor
                  </h3>
                  <span className="text-[9px] bg-[#f9b03c]/20 text-[#f9b03c] font-black px-2 py-0.5 rounded-full border border-[#f9b03c]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>24/7 LIVE</span>
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 truncate max-w-[170px] sm:max-w-[200px]">
                  <span>{selectedCourse ? `📚 ${selectedCourse.title}` : 'የፀሐይ ካምፓስ AI ረዳት'}</span>
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={handleClearChat}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ታሪክ አፅዳ (Clear Chat)"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>

              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="አሳንስ (Minimize)"
              >
                <i className="fa-solid fa-minus text-xs"></i>
              </button>

              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          {/* Course Context Switcher Pill */}
          <div className="relative px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar z-10">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <i className="fa-solid fa-sliders text-[#f9b03c]"></i>
              <span>የትኩረት አቅጣጫ፦</span>
            </span>
            
            <select 
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const cId = e.target.value;
                const found = courses.find(c => c.id === cId);
                setSelectedCourse(found || null);
              }}
              className="bg-[#0f172a] text-xs font-bold text-[#f9b03c] border border-white/15 rounded-xl px-2.5 py-1 outline-none focus:border-[#f9b03c] transition shrink-0 cursor-pointer max-w-[220px] truncate"
            >
              <option value="" className="bg-slate-900 text-white">🌐 አጠቃላይ (General Campus AI)</option>
              {courses.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  📚 {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div className="relative flex-1 overflow-y-auto p-4 space-y-4 text-xs z-10">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[86%]">
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0 mb-1">
                        <i className="fa-solid fa-robot text-xs"></i>
                      </div>
                    )}

                    <div 
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm break-words ${
                        isUser
                          ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-bold rounded-br-none shadow-[0_4px_25px_rgba(249,176,60,0.28)]'
                          : 'bg-[#0f1629]/95 text-slate-100 border border-white/15 rounded-bl-none font-medium'
                      }`}
                    >
                      {/* Render Attached Image if Present */}
                      {m.image && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-black/20 dark:border-white/20 shadow-md">
                          <img src={m.image} alt="User Attachment" className="w-full max-h-48 object-cover cursor-pointer hover:scale-105 transition-transform" />
                        </div>
                      )}

                      {/* Rich Formatted AI / User Message */}
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-body">
                          {m.text}
                        </div>
                      ) : (
                        <FormattedAiText text={m.text} isUser={false} />
                      )}

                      <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${isUser ? 'text-slate-900/80 font-bold' : 'text-gray-400'}`}>
                        <span>{m.timestamp || 'አሁን'}</span>
                        {isUser && <i className="fa-solid fa-check-double text-[10px] text-slate-900"></i>}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons under AI response */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1.5 ml-9">
                      {/* 🔊 Voice Audio Player Button */}
                      <button 
                        onClick={() => playAiVoiceResponse(m.text, idx)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                          playingAudioIdx === idx
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border-white/10'
                        }`}
                        title={playingAudioIdx === idx ? 'ድምፁን አቁም (Stop Voice)' : 'በድምፅ አዳምጥ (Listen via Voice)'}
                      >
                        <i className={`fa-solid ${playingAudioIdx === idx ? 'fa-pause text-amber-400' : 'fa-volume-high'}`}></i>
                        <span>{playingAudioIdx === idx ? 'አቁም' : 'አዳምጥ'}</span>
                      </button>

                      <button 
                        onClick={() => handleCopyMessage(m.text, idx)}
                        className="text-[10px] bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition cursor-pointer"
                      >
                        <i className={`fa-solid ${copiedIdx === idx ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                        <span>{copiedIdx === idx ? '✓ ተገልብጧል' : 'ኮፒ'}</span>
                      </button>

                      <button 
                        onClick={() => handleSaveToNotes(m.text, idx)}
                        className="text-[10px] bg-[#f9b03c]/10 hover:bg-[#f9b03c]/20 text-[#f9b03c] px-2.5 py-1 rounded-lg border border-[#f9b03c]/20 flex items-center gap-1 transition cursor-pointer active:scale-95"
                      >
                        <i className={`fa-solid ${noteSavedIdx === idx ? 'fa-circle-check text-emerald-400' : 'fa-bookmark'}`}></i>
                        <span>{noteSavedIdx === idx ? '✓ ተመዝግቧል' : 'ወደ ማስታወሻ አድ'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Typing Wave Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 ml-2 animate-pulse">
                <div className="w-7 h-7 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-robot text-xs animate-spin"></i>
                </div>
                <div className="bg-[#0f1629] p-3 rounded-2xl border border-white/10 rounded-bl-none flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-[11px] font-bold text-[#f9b03c] ml-1">Tsehay AI እየጻፈ ነው...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Live Attached Image Thumbnail Preview */}
          {attachedImage && (
            <div className="relative px-4 py-2 bg-[#0c1326] border-t border-white/10 flex items-center justify-between z-10 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2.5">
                <img src={attachedImage} alt="Attachment Preview" className="w-12 h-12 object-cover rounded-xl border border-[#f9b03c]/50 shadow-sm" />
                <div className="text-xs">
                  <span className="font-bold text-white block">ፎቶ ተያይዟል (Attached Photo)</span>
                  <span className="text-[10px] text-emerald-400">✓ ለ AIው ትንታኔ ተዘጋጅቷል</span>
                </div>
              </div>
              <button 
                onClick={() => setAttachedImage(null)}
                className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ፎቶውን አስወግድ"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {/* Quick Action Suggestion Pills (Hidden when recording voice to keep clean) */}
          {!isRecordingVoice && (
            <div className="relative px-3 py-2 bg-black/40 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-10">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="text-[11px] font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-[#f9b03c]/20 hover:border-[#f9b03c]/40 px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* 🌟 UNIFIED SINGLE BOTTOM CONTROLS DOCK (No duplicates) */}
          {isRecordingVoice ? (
            /* 🎙️ Single Sleek Voice Recording Capsule */
            <div className="relative p-3 bg-gradient-to-r from-red-950 via-[#180a22] to-amber-950/90 border-t border-red-500/40 flex items-center justify-between gap-3 z-10 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>ድምፅዎን እያዳመጥኩ ነው...</span>
                    <span className="text-[11px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/40 font-mono">
                      {recordingDuration}s
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-300 truncate">
                    {input || voiceTranscriptRef.current || 'እየተናገሩ... ሲጨርሱ "ላክ" የሚለውን ይጫኑ'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={stopVoiceRecordingWithoutSend}
                  className="h-10 px-3.5 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 text-xs font-bold transition active:scale-95 cursor-pointer border border-white/10"
                  title="ድምፁን ሰርዝ"
                >
                  <i className="fa-solid fa-xmark mr-1"></i>
                  <span>ሰርዝ</span>
                </button>
                
                <button 
                  type="button"
                  onClick={stopAndSendVoice}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 hover:brightness-110 text-slate-950 text-xs font-black transition cursor-pointer shadow-[0_0_20px_rgba(249,176,60,0.6)] flex items-center gap-1.5 active:scale-95"
                  title="ድምፁን ላክ"
                >
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                  <span>ላክ</span>
                </button>
              </div>
            </div>
          ) : (
            /* ✍️ Clean Single Input Bar (Photo, Text Input, Microphone / Send) */
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="relative p-3 bg-gradient-to-t from-[#060a14] to-[#0c1222] border-t border-white/10 flex items-center gap-2 z-10"
            >
              {/* Photo Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-[#f9b03c] border border-white/15 flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0"
                title="ፎቶ / ስክሪንሾት አያይዝ"
              >
                <i className="fa-solid fa-paperclip text-sm"></i>
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedCourse ? `ስለ ${selectedCourse.title} ይጠይቁ...` : "ጥያቄዎን በጽሑፍ ወይም በድምፅ ይላኩ..."}
                className="flex-1 bg-white/5 border border-white/15 focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c]/30 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 outline-none transition"
              />

              {/* Dynamic Action: Send button if text/image exists, else Microphone Voice button */}
              {input.trim() || attachedImage ? (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-90 shrink-0 bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.5)] hover:brightness-110"
                  title="መልዕክት ላክ"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                      <span className="hidden sm:inline">ላክ</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c]/20 to-amber-500/30 hover:from-[#f9b03c] hover:to-amber-400 text-[#f9b03c] hover:text-slate-950 border border-[#f9b03c]/40 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.2)]"
                  title="በድምፅ ተናገር (Speak via Voice)"
                >
                  <i className="fa-solid fa-microphone text-sm"></i>
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* 🌟 2. FLOATING LAUNCHER BUTTON WITH GLOWING RADIAL PULSE */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-[#0d1527] via-[#13203f] to-[#0d1527] border border-[#f9b03c]/40 hover:border-[#f9b03c] p-2.5 sm:px-4 sm:py-3 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(249,176,60,0.45)] transition-all duration-300 active:scale-90 hover:-translate-y-1 cursor-pointer"
          title="Tsehay AI Tutor ን ክፈት"
        >
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3268ba] via-[#f9b03c] to-[#3268ba] opacity-40 group-hover:opacity-100 blur-sm transition duration-500 animate-pulse pointer-events-none"></span>

          <div className="relative flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-robot"></i>
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d1527] rounded-full animate-ping"></span>
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d1527] rounded-full"></span>
            </div>

            <div className="hidden sm:flex flex-col text-left pr-2">
              <span className="font-heading font-black text-xs text-white tracking-wide group-hover:text-[#f9b03c] transition-colors flex items-center gap-1.5">
                <span>Tsehay AI</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-black">LIVE</span>
              </span>
              <span className="text-[10px] text-gray-300 font-medium">የመማሪያ AI ረዳት</span>
            </div>
          </div>
        </button>
      )}

    </div>
  );
}
