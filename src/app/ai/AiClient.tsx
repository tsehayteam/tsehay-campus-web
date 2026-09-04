'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import FormattedAiText from '@/components/FormattedAiText';
import { getCachedCourses, subscribeToCourses } from '@/lib/courseCache';
import { speakWithLanguageDetection, stopSpeech } from '@/lib/ttsHelper';
import Footer from '@/components/Footer';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string;
  audioUrl?: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    icon: 'fa-youtube',
    category: 'YouTube Mastery',
    title: 'የዩቲዩብ ቻናል ገቢ ማግኛ መንገዶች',
    prompt: 'የዩቲዩብ ቻናል በኢትዮጵያ ከፍቼ በምን በምን መንገዶች ገቢ ማግኘት እችላለሁ? ደረጃ በደረጃ አስረዳኝ።',
    color: '#FF0000'
  },
  {
    icon: 'fa-bag-shopping',
    category: 'Shein & E-commerce',
    title: 'የሼን እቃዎችን ወደ ኢትዮጵያ ማስመጣት',
    prompt: 'የሼን (Shein) እቃዎችን ከውጭ ሀገር ወደ ኢትዮጵያ በትንሽ ካፒታል አስመጥቼ እንዴት መሸጥ እችላለሁ?',
    color: '#f9b03c'
  },
  {
    icon: 'fa-bullhorn',
    category: 'Digital Marketing',
    title: 'በቴሌግራም እና ቲክቶክ ማርኬቲንግ',
    prompt: 'በቴሌግራም እና በቲክቶክ ላይ ውጤታማ የማርኬቲንግ ስትራቴጂ እንዴት መስራት እችላለሁ?',
    color: '#3268ba'
  },
  {
    icon: 'fa-graduation-cap',
    category: 'Course Advisory',
    title: 'ለእኔ የሚስማማኝን ስልጠና ምረጥልኝ',
    prompt: 'ጀማሪ ነኝ፣ ኦንላይን ሰርቼ ገቢ ለማግኘት ለእኔ የሚስማማኝ የመጀመሪያ ስልጠና የትኛው ነው?',
    color: '#5a93e8'
  }
];

export default function AiClient() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [courses, setCourses] = useState<any[]>(() => getCachedCourses());
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'ai',
      text: 'ሰላም! እንኳን ወደ **Tsehay AI Workspace** በደህና መጡ! ☀️\n\nእኔ የፀሐይ ካምፓስ የ 24/7 የግል መምህር እና አማካሪ ነኝ። ስለ ስልጠናዎቻችን (የዩቲዩብ ስኬት፣ የሼን ቢዝነስ፣ ዲጂታል ማርኬቲንግ)፣ ተግባራዊ እርምጃዎች ወይም ስለ ምዝገባ ማንኛውንም ጥያቄ በጽሑፍ፣ በስክሪንሾት ወይም በድምፅ መጠየቅ ይችላሉ!',
      timestamp: 'አሁን'
    }
  ]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');

  // Subscribe to real-time courses
  useEffect(() => {
    const unsub = subscribeToCourses((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setCourses(list);
      }
    });
    return () => unsub();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('የፎቶው መጠን ከ 5MB ማነስ አለበት።');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        sendMessage('', audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'am-ET';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            voiceTranscriptRef.current = transcript.trim();
          }
        };

        recognition.onend = () => {
          const spoken = voiceTranscriptRef.current.trim();
          if (spoken) {
            stopVoiceRecording();
            sendMessage(spoken);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.warn('Microphone access error:', err);
      alert('የማይክሮፎን ፍቃድ አልተገኘም። እባክዎ በማይክሮፎን ለመጠቀም ፍቃድ ይስጡ።');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const toggleSpeech = (id: string, text: string) => {
    if (typeof window === 'undefined') return;

    if (speakingMessageId === id) {
      stopSpeech();
      setSpeakingMessageId(null);
      return;
    }

    speakWithLanguageDetection({
      text,
      siteLang: lang,
      onStart: () => setSpeakingMessageId(id),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const sendMessage = async (overrideText?: string, audioUrl?: string) => {
    const userText = overrideText !== undefined ? overrideText : input.trim();
    if (!userText && !attachedImage && !audioUrl) return;

    stopSpeech();
    setSpeakingMessageId(null);

    const currentImage = attachedImage;
    setInput('');
    setAttachedImage(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
      image: currentImage || undefined,
      audioUrl: audioUrl,
      timestamp: 'አሁን'
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const courseContext = selectedCourse
        ? {
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title,
            whatYouWillLearn: selectedCourse.whatYouWillLearn,
            instructor: selectedCourse.instructor
          }
        : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userText }
          ],
          courseContext,
          hasImage: Boolean(currentImage),
          hasAudio: Boolean(audioUrl),
          preferredLanguage: lang
        })
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        data.content ||
        'ይቅርታ፣ አሁን ላይ መልስ ለመስጠት አልቻልኩም። እባክዎ ጥያቄዎን በድጋሚ ይሞክሩ።';

      const newAiId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: newAiId,
          role: 'ai',
          text: replyText,
          timestamp: 'አሁን'
        }
      ]);
      toggleSpeech(newAiId, replyText);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'ai',
          text: 'ይቅርታ፣ የኔትወርክ ችግር አጋጥሟል። እባክዎ የኢንተርኔት ግንኙነትዎን ያረጋግጡና በድጋሚ ይሞክሩ።',
          timestamp: 'አሁን'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'ai',
        text: 'ውይይቱ ጸድቷል! አዲስ ጥያቄዎን መጠየቅ ይችላሉ። ✨',
        timestamp: 'አሁን'
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col pt-24 sm:pt-28 selection:bg-[#f9b03c] selection:text-black">
      <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#3268ba]/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-500 flex items-center justify-center text-slate-950 text-xl font-black shadow-[0_0_25px_rgba(249,176,60,0.4)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Tsehay <span className="text-[#f9b03c]">AI Workspace</span>
                </h1>
                <span className="inline-flex items-center gap-1 bg-[#3268ba]/20 text-[#5a93e8] border border-[#3268ba]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5a93e8] animate-pulse"></span>
                  24/7 ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                የፀሐይ ካምፓስ ፕሪሚየም የ 24/7 የግል መምህር እና አማካሪ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-white/5 border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#f9b03c] transition cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                🌐 አጠቃላይ ጥያቄዎች (General)
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id} className="bg-slate-900 text-white">
                  📚 {course.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearChat}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="ውይይቱን አጽዳ"
            >
              <i className="fa-solid fa-rotate-left text-[11px]"></i>
              <span className="hidden sm:inline">አጽዳ</span>
            </button>
          </div>
        </div>

        {messages.length <= 1 && (
          <div className="mb-6 animate-in fade-in duration-500">
            <div className="text-xs text-[#f9b03c] font-black uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span>💡 ፈጣን ጥያቄዎች (Quick Starters)</span>
            </div>
            <div 
              className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2"
              style={{ display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}
            >
              {STARTER_PROMPTS.map((starter, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(starter.prompt)}
                  className="p-4 rounded-2xl bg-slate-900/80 hover:bg-[#0b1324] border border-white/10 hover:border-[#f9b03c]/60 text-left transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(249,176,60,0.25)] hover:scale-[1.02] active:scale-[0.98] backdrop-blur-xl shrink-0 min-w-[240px] max-w-[280px]"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs shadow-sm transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${starter.color}25`, color: starter.color, border: `1px solid ${starter.color}40` }}
                    >
                      <i className={`fa-solid ${starter.icon}`}></i>
                    </div>
                    <span className="text-[11px] font-black text-slate-400 group-hover:text-slate-300 uppercase tracking-wide">
                      {starter.category}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#f9b03c] transition-colors leading-snug whitespace-normal line-clamp-2">
                    {starter.title}
                  </h4>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 overflow-y-auto mb-4 space-y-4 min-h-[380px] max-h-[58vh] shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)]">
          {messages.map((m) => {
            const isAi = m.role === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-3 sm:gap-4 ${isAi ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {isAi && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shrink-0 shadow-md">
                    <i className="fa-solid fa-robot"></i>
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 ${
                    isAi
                      ? 'bg-slate-900/90 border border-white/10 text-slate-200'
                      : 'bg-gradient-to-r from-[#3268ba] to-[#25549c] text-white border border-blue-400/30'
                  } shadow-lg`}
                >
                  {m.image && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                      <img src={m.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                    </div>
                  )}

                  {m.audioUrl && (
                    <div className="mb-2 flex items-center gap-2 bg-black/30 p-2.5 rounded-xl">
                      <i className="fa-solid fa-microphone text-[#f9b03c]"></i>
                      <audio controls src={m.audioUrl} className="h-8 w-full max-w-[240px]" />
                    </div>
                  )}

                  <div className="text-xs sm:text-[13.5px] leading-relaxed">
                    {isAi ? (
                      <FormattedAiText text={m.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>{m.timestamp}</span>
                      {isAi && (
                        <button
                          type="button"
                          onClick={() => toggleSpeech(m.id, m.text)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            speakingMessageId === m.id
                              ? 'bg-amber-400/20 text-[#f9b03c] border border-amber-400/50 shadow-[0_0_15px_rgba(249,176,60,0.4)] animate-pulse'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                          }`}
                          title={speakingMessageId === m.id ? "ድምፁን አቁም (Stop Speech)" : "በድምፅ አዳምጥ (Listen via Voice)"}
                        >
                          {speakingMessageId === m.id ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                              <span>ድምፅ አቁም</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-volume-high text-[#f9b03c] text-xs"></i>
                              <span>አዳምጥ</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isAi && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.id, m.text)}
                        className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="ጽሑፉን ኮፒ አድርግ"
                      >
                        <i
                          className={`fa-solid ${
                            copiedId === m.id ? 'fa-check text-green-400' : 'fa-copy'
                          }`}
                        ></i>
                        <span>{copiedId === m.id ? 'ተገልብጧል!' : 'ኮፒ'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isAi && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-md">
                    <i className="fa-solid fa-user"></i>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                <span>Tsehay AI እያሰበ ነው...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 sm:p-4 mb-8 shadow-2xl">
          {/* Horizontally Scrollable AI Quick Starters / FAQ chips */}
          <div 
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2.5 mb-2 border-b border-white/5"
            style={{ display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none' }}
          >
            {STARTER_PROMPTS.map((starter, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(starter.prompt)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#f9b03c]/20 hover:text-[#f9b03c] border border-white/10 hover:border-[#f9b03c]/40 text-slate-300 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <i className={`fa-solid ${starter.icon} text-[10px] text-[#f9b03c]`}></i>
                <span>{starter.title}</span>
              </button>
            ))}
          </div>

          {attachedImage && (
            <div className="mb-2 inline-flex items-center gap-2 bg-white/10 border border-[#f9b03c]/50 px-3 py-1.5 rounded-xl text-xs">
              <i className="fa-solid fa-image text-[#f9b03c]"></i>
              <span>ፎቶ ተያይዟል</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-red-400 hover:text-red-300 ml-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center justify-between gap-3 p-2.5 bg-red-500/15 border border-red-500/30 rounded-2xl animate-pulse">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span>ድምፅ በመቅዳት ላይ ({recordingDuration}s)...</span>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs cursor-pointer"
              >
                አቁም & ላክ
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#f9b03c] border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0"
                title="ፎቶ ወይም ስክሪንሾት አያይዝ"
              >
                <i className="fa-solid fa-paperclip"></i>
              </button>

              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0"
                title="በድምፅ ጠይቅ"
              >
                <i className="fa-solid fa-microphone"></i>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ስለ ዩቲዩብ፣ ስለ ሼን፣ ስለ ማርኬቲንግ ወይም ስለ ስልጠናዎች ይጠይቁ..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#f9b03c] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition font-medium"
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !attachedImage)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:brightness-110 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,176,60,0.4)] transition cursor-pointer shrink-0"
              >
                <span>ላክ</span>
                <i className="fa-solid fa-paper-plane text-xs"></i>
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
