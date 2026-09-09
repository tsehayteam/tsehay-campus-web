'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import FormattedAiText from '@/components/FormattedAiText';
import { getCachedCourses, subscribeToCourses } from '@/lib/courseCache';
import { speakWithLanguageDetection, stopSpeech } from '@/lib/ttsHelper';
import Footer from '@/components/Footer';
import LanguageToggleSwitch from '@/components/LanguageToggleSwitch';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string;
  audioUrl?: string;
  timestamp: string;
}

const STARTER_PROMPTS_AM = [
  {
    icon: 'fa-youtube',
    category: 'YouTube',
    title: 'የዩቲዩብ ቻናል ገቢ ማግኛ መንገዶች',
    prompt: 'የዩቲዩብ ቻናል በኢትዮጵያ ከፍቼ በምን በምን መንገዶች ገቢ ማግኘት እችላለሁ? ደረጃ በደረጃ አስረዳኝ።',
    color: '#FF0000'
  },
  {
    icon: 'fa-video',
    category: 'YouTube',
    title: 'ፊት ሳያሳዩ በ AI ቪዲዮ ማዘጋጀት (Faceless)',
    prompt: 'ፊት ሳያሳዩ በ AI እና በእውነተኛ ምስሎች ከፍተኛ እይታ የሚስቡ የዩቲዩብ ቪዲዮዎችን እንዴት ማዘጋጀት ይቻላል?',
    color: '#ef4444'
  },
  {
    icon: 'fa-bag-shopping',
    category: 'Shein & E-commerce',
    title: 'የሼን እቃዎችን ወደ ኢትዮጵያ ማስመጣት',
    prompt: 'የሼን (Shein) እቃዎችን ከውጭ ሀገር ወደ ኢትዮጵያ በትንሽ ካፒታል አስመጥቼ እንዴት መሸጥ እችላለሁ?',
    color: '#f9b03c'
  },
  {
    icon: 'fa-credit-card',
    category: 'Shein & E-commerce',
    title: 'በኢትዮጵያ ሆነው በዶላር የመክፈያ መንገዶች',
    prompt: 'ከኢትዮጵያ ሆነን ለሼን እና ለኦንላይን ግዢዎች በዶላር ወይም በኦንላይን ካርድ እንዴት መክፈል እንችላለን?',
    color: '#f59e0b'
  },
  {
    icon: 'fa-bullhorn',
    category: 'Digital Marketing',
    title: 'በቴሌግራም እና ቲክቶክ ማርኬቲንግ',
    prompt: 'በቴሌግራም እና በቲክቶክ ላይ ውጤታማ የማርኬቲንግ ስትራቴጂ እንዴት መስራት እችላለሁ?',
    color: '#3268ba'
  },
  {
    icon: 'fa-gift',
    category: 'Digital Marketing',
    title: 'ነፃ የዲጂታል ማርኬቲንግ ስልጠና',
    prompt: 'የ 100% ነፃ የዲጂታል ማርኬቲንግ ስልጠናውን እንዴት መጀመር እችላለሁ? ምን ምን ትምህርቶች ተካትተዋል?',
    color: '#06b6d4'
  },
  {
    icon: 'fa-film',
    category: 'Video Editing',
    title: 'የቪዲዮ ኤዲቲንግ በሞባይልና ኮምፒተር',
    prompt: 'የቪዲዮ ኤዲቲንግን በ CapCut እና በ Premiere Pro ከዜሮ ተምሬ እንዴት በቪዲዮ ስራ ገቢ ማግኘት እችላለሁ?',
    color: '#8b5cf6'
  },
  {
    icon: 'fa-laptop-code',
    category: 'Coding & Tech',
    title: 'የዌብሳይት እና ኮዲንግ ስልጠናዎች',
    prompt: 'የዌብ ዴቨሎፕመንት እና የኮዲንግ ስልጠናዎችን ከዜሮ እንዴት መጀመር እችላለሁ? በምን ያህል ጊዜ ውስጥ ገቢ ፈጣሪ መሆን ይቻላል?',
    color: '#10b981'
  },
  {
    icon: 'fa-handshake',
    category: 'Mentorship',
    title: 'ከኢዮብ ሳህሌ ጋር የ 1-ለ-1 ማማከር',
    prompt: 'ከኢዮብ ሳህሌ ጋር የ 1-ለ-1 የቀጥታ የማማከር ክፍለ-ጊዜ (Mentorship) እንዴት ማስያዝ እችላለሁ?',
    color: '#ec4899'
  },
  {
    icon: 'fa-money-bill-wave',
    category: 'Payments',
    title: 'የስልጠናዎች ክፍያ በቴሌብር እና ባንክ',
    prompt: 'በቴሌብር ወይም በባንክ ለስልጠናዎቹ እንዴት መክፈል እችላለሁ? ክፍያ እንደፈጸምኩ ትምህርቱ ወዲያውኑ ይከፈትልኛል?',
    color: '#a855f7'
  },
  {
    icon: 'fa-certificate',
    category: 'Certificate',
    title: 'የሰርተፊኬት አሰጣጥ እና ማረጋገጫ',
    prompt: 'ስልጠናውን ካጠናቀቅኩ በኋላ ሰርተፊኬቴን እንዴት አገኛለሁ? ሰርተፊኬቱ በኦንላይን ይረጋገጣል?',
    color: '#14b8a6'
  },
  {
    icon: 'fa-chart-line',
    category: 'Crypto',
    title: 'የክሪፕቶ ግብይት እና Binance አጠቃቀም',
    prompt: 'የክሪፕቶ ከረንሲ ግብይትን (Crypto Trading) ከዜሮ በ Binance ተጠቅሜ እንዴት መጀመር እችላለሁ?',
    color: '#f97316'
  }
];

const STARTER_PROMPTS_EN = [
  {
    icon: 'fa-youtube',
    category: 'YouTube',
    title: 'How to Monetize a YouTube Channel',
    prompt: 'How can I launch a profitable YouTube channel from Ethiopia and earn in USD? Explain step-by-step.',
    color: '#FF0000'
  },
  {
    icon: 'fa-video',
    category: 'YouTube',
    title: 'Faceless AI YouTube Videos',
    prompt: 'How can I create high-view viral YouTube videos using AI without showing my face or real identity?',
    color: '#ef4444'
  },
  {
    icon: 'fa-bag-shopping',
    category: 'Shein & E-commerce',
    title: 'Importing Shein Products to Ethiopia',
    prompt: 'How can I import products from Shein to Ethiopia with small capital and resell them with high profit margins?',
    color: '#f9b03c'
  },
  {
    icon: 'fa-credit-card',
    category: 'Shein & E-commerce',
    title: 'International Card & Dollar Payments',
    prompt: 'How can I make foreign dollar card payments from Ethiopia for Shein and international tools?',
    color: '#f59e0b'
  },
  {
    icon: 'fa-bullhorn',
    category: 'Digital Marketing',
    title: 'Telegram & TikTok Marketing',
    prompt: 'How do I build an effective marketing and sales strategy on Telegram and TikTok for local businesses?',
    color: '#3268ba'
  },
  {
    icon: 'fa-gift',
    category: 'Digital Marketing',
    title: 'Free Digital Marketing Masterclass',
    prompt: 'How can I enroll in the 100% Free Digital Marketing course, and what topics are covered?',
    color: '#06b6d4'
  },
  {
    icon: 'fa-film',
    category: 'Video Editing',
    title: 'Mobile & Desktop Video Editing',
    prompt: 'How can I learn CapCut and Premiere Pro video editing from scratch to land paid client work?',
    color: '#8b5cf6'
  },
  {
    icon: 'fa-laptop-code',
    category: 'Coding & Tech',
    title: 'Web Development & Coding Roadmap',
    prompt: 'How do I start learning web development from zero, and how long until I can earn as a developer?',
    color: '#10b981'
  },
  {
    icon: 'fa-handshake',
    category: 'Mentorship',
    title: '1-on-1 Mentorship with Eyoub Sahle',
    prompt: 'How can I book a 45-minute private 1-on-1 strategy mentorship consultation with Eyoub Sahle?',
    color: '#ec4899'
  },
  {
    icon: 'fa-money-bill-wave',
    category: 'Payments',
    title: 'Course Tuition & Instant Access',
    prompt: 'How can I pay via Telebirr or Bank transfer, and do lessons unlock immediately after payment?',
    color: '#a855f7'
  },
  {
    icon: 'fa-certificate',
    category: 'Certificate',
    title: 'Accredited Digital Certificate',
    prompt: 'How do I earn my accredited certificate upon graduation, and how can employers verify it online?',
    color: '#14b8a6'
  },
  {
    icon: 'fa-chart-line',
    category: 'Crypto',
    title: 'Crypto Trading & Binance Setup',
    prompt: 'How can I start crypto trading with proper risk management and technical analysis in Ethiopia?',
    color: '#f97316'
  }
];

export default function AiClient() {
  const { user } = useAuth();
  const { lang, setLanguage, toggleLanguage, t } = useLanguage();

  const starterPrompts = lang === 'en' ? STARTER_PROMPTS_EN : STARTER_PROMPTS_AM;

  const [courses, setCourses] = useState<any[]>(() => getCachedCourses());
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'ai',
      text: lang === 'en'
        ? 'Hello! Welcome to **Tsehay AI Workspace**! \n\nI am your 24/7 personal tutor and business advisor for Tsehay Campus. Feel free to ask any question regarding our masterclasses (YouTube Secrets, Shein Import, Digital Marketing, Coding), practical action roadmaps, or enrollment via text, screenshot, or voice! '
        : 'ሰላም! እንኳን ወደ **Tsehay AI Workspace** በደህና መጡ!\n\nእኔ የፀሐይ ካምፓስ የ 24/7 የግል መምህር እና አማካሪ ነኝ። ስለ ስልጠናዎቻችን (የዩቲዩብ ስኬት፣ የሼን ቢዝነስ፣ ዲጂታል ማርኬቲንግ፣ ኮዲንግ)፣ ተግባራዊ እርምጃዎች ወይም ስለ ምዝገባ ማንኛውንም ጥያቄ በጽሑፍ፣ በስክሪንሾት ወይም በድምፅ መጠየቅ ይችላሉ!',
      timestamp: lang === 'en' ? 'Just now' : 'አሁን'
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const starterCarouselRef = useRef<HTMLDivElement>(null);
  const chipsTrackRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);

  const handleScrollMessages = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 50);
    setShowScrollUp(scrollTop > 50);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');

  // Automatically sync initial welcome message with language toggle
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && (prev[0].id === 'welcome-1' || prev[0].id === 'welcome-reset')) {
        return [{
          id: 'welcome-1',
          role: 'ai',
          text: lang === 'en'
            ? 'Hello! Welcome to **Tsehay AI Workspace**!\n\nI am your 24/7 personal tutor and business advisor for Tsehay Campus. Feel free to ask any question regarding our masterclasses (YouTube Secrets, Shein Import, Digital Marketing, Coding), practical action roadmaps, or enrollment via text, screenshot, or voice!'
            : 'ሰላም! እንኳን ወደ **Tsehay AI Workspace** በደህና መጡ!\n\nእኔ የፀሐይ ካምፓስ የ 24/7 የግል መምህር እና አማካሪ ነኝ። ስለ ስልጠናዎቻችን (የዩቲዩብ ስኬት፣ የሼን ቢዝነስ፣ ዲጂታል ማርኬቲንግ፣ ኮዲንግ)፣ ተግባራዊ እርምጃዎች ወይም ስለ ምዝገባ ማንኛውንም ጥያቄ በጽሑፍ፣ በስክሪንሾት ወይም በድምፅ መጠየቅ ይችላሉ!',
          timestamp: lang === 'en' ? 'Just now' : 'አሁን'
        }];
      }
      return prev;
    });
  }, [lang]);

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
      alert(lang === 'en' ? 'Image size must be under 5MB.' : 'የፎቶው መጠን ከ 5MB ማነስ አለበት።');
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
        recognition.lang = lang === 'en' ? 'en-US' : 'am-ET';
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
      alert(
        lang === 'en'
          ? 'Microphone access is required. Please check your browser mic permissions.'
          : 'የማይክሮፎን ፍቃድ አልተገኘም። እባክዎ በማይክሮፎን ለመጠቀም ፍቃድ ይስጡ።'
      );
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

    // Set immediate visual feedback
    setSpeakingMessageId(id);

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
      text: userText || (audioUrl ? (lang === 'en' ? 'Voice message' : 'የድምፅ መልእክት') : ''),
      image: currentImage || undefined,
      audioUrl: audioUrl,
      timestamp: lang === 'en' ? 'Just now' : 'አሁን'
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
          prompt: userText,
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
        (lang === 'en'
          ? 'Sorry, I am unable to reply at the moment. Please try again.'
          : 'ይቅርታ፣ አሁን ላይ መልስ ለመስጠት አልቻልኩም። እባክዎ ጥያቄዎን በድጋሚ ይሞክሩ።');

      const newAiId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: newAiId,
          role: 'ai',
          text: replyText,
          timestamp: lang === 'en' ? 'Just now' : 'አሁን'
        }
      ]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'ai',
          text:
            lang === 'en'
              ? 'Sorry, a network connection error occurred. Please check your internet connection and try again.'
              : 'ይቅርታ፣ የኔትወርክ ችግር አጋጥሟል። እባክዎ የኢንተርኔት ግንኙነትዎን ያረጋግጡና በድጋሚ ይሞክሩ።',
          timestamp: lang === 'en' ? 'Just now' : 'አሁን'
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
    stopSpeech();
    setSpeakingMessageId(null);
    setMessages([
      {
        id: 'welcome-reset',
        role: 'ai',
        text:
          lang === 'en'
            ? 'Conversation cleared! You can ask a new question.'
            : 'ውይይቱ ጸድቷል! አዲስ ጥያቄዎን መጠየቅ ይችላሉ።',
        timestamp: lang === 'en' ? 'Just now' : 'አሁን'
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col pt-20 sm:pt-24 selection:bg-[#f9b03c] selection:text-black relative overflow-hidden">
      {/*  Ambient Atmospheric Glows */}
      <div className="fixed top-12 left-1/4 w-[550px] h-[550px] bg-[#f9b03c]/12 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="fixed bottom-10 right-1/4 w-[600px] h-[600px] bg-[#3268ba]/15 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-amber-500/5 rounded-full blur-[200px] pointer-events-none -z-10" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pb-4">
        {/*  Top Futuristic Command Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-[#090f1d]/80 border border-white/10 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_25px_rgba(249,176,60,0.5)] border border-white/20">
                <i className="fa-solid fa-robot"></i>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#030509] rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black text-white font-heading tracking-tight">
                  Tsehay <span className="text-[#f9b03c]">AI Workspace</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(249,176,60,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping"></span>
                  24/7 LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{lang === 'en' ? 'Tsehay Campus 24/7 Advanced AI Tutor & Advisor' : 'የፀሐይ ካምፓስ የላቀ የ 24/7 የግል መምህር እና አማካሪ'}</span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[11px] text-emerald-400 font-bold">Multimodal AI</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Sliding Language Switcher Toggle */}
            <LanguageToggleSwitch compact />

            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full sm:w-auto bg-[#0d162b] border border-white/15 text-slate-200 text-xs rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/20 transition cursor-pointer shadow-inner pr-8"
              >
                <option value="all" className="bg-[#090f1d] text-white">
                  {lang === 'en' ? 'All Topics & Inquiries' : 'አጠቃላይ ጥያቄዎች (All Topics)'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} className="bg-[#090f1d] text-white">
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearChat}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={lang === 'en' ? 'Start New Chat' : 'ውይይቱን አጽዳ'}
            >
              <i className="fa-solid fa-rotate-left text-[11px] text-[#f9b03c]"></i>
              <span className="hidden sm:inline">{lang === 'en' ? 'New Chat' : 'አዲስ ቻት'}</span>
            </button>
          </div>
        </div>

        {/*  Prompts Carousel / Deck */}
        {messages.length <= 1 && (
          <div className="mb-4 sm:mb-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="text-xs text-[#f9b03c] font-black uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                <span>{lang === 'en' ? 'Quick Starters & FAQs' : 'ፈጣን ጥያቄዎች እና FAQs'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="blink-indicator text-[#f9b03c] text-[11px] font-black flex items-center gap-1.5">
                  <i className="fa-solid fa-arrows-left-right text-[10px]"></i>
                  <span>{lang === 'en' ? 'Swipe Horizontally' : 'ወደ ጎን ያንሸራትቱ'}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => starterCarouselRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-[#f9b03c] hover:text-slate-950 text-white text-xs flex items-center justify-center transition cursor-pointer"
                    title="ወደ ግራ"
                  >
                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => starterCarouselRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
                    className="w-6 h-6 rounded-lg bg-white/10 hover:bg-[#f9b03c] hover:text-slate-950 text-white text-xs flex items-center justify-center transition cursor-pointer"
                    title="ወደ ቀኝ"
                  >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>
            </div>

            <div 
              ref={starterCarouselRef}
              className="flex items-center gap-3 overflow-x-auto tsehay-ai-scrollbar pb-2.5 pt-1"
              style={{ scrollBehavior: 'smooth' }}
            >
              {starterPrompts.map((starter, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(starter.prompt)}
                  className="p-4 rounded-2xl bg-[#090f1d]/85 hover:bg-[#0f1a35] border border-white/10 hover:border-[#f9b03c]/60 text-left transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(249,176,60,0.25)] hover:scale-[1.02] active:scale-[0.98] backdrop-blur-2xl shrink-0 min-w-[250px] max-w-[290px]"
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

        {/*  Chat Messages Feed with Glowing Scrollbar & Indicators */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScrollMessages}
          className="relative flex-1 bg-[#070b16]/75 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 overflow-y-auto mb-4 space-y-4 min-h-[480px] max-h-[75vh] shadow-[inset_0_2px_25px_rgba(0,0,0,0.6)] tsehay-ai-scrollbar"
        >
          {/* Scroll Up Blink Indicator */}
          {showScrollUp && (
            <button
              type="button"
              onClick={scrollToTop}
              className="sticky top-2 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-[#0b1224]/95 border border-[#f9b03c]/70 text-[#f9b03c] text-[11px] font-black shadow-[0_0_15px_rgba(249,176,60,0.5)] flex items-center gap-1.5 blink-indicator cursor-pointer backdrop-blur-md mx-auto"
            >
              <i className="fa-solid fa-arrow-up text-[10px]"></i>
              <span>{lang === 'en' ? 'Scroll Up' : 'ወደ ላይ ይሸብልሉ'}</span>
            </button>
          )}

          {messages.map((m) => {
            const isAi = m.role === 'ai';
            const isSpeakingThis = speakingMessageId === m.id;

            return (
              <div
                key={m.id}
                className={`flex gap-3 sm:gap-4 ${isAi ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300 w-full`}
              >
                {isAi && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.35)] mt-1">
                    <i className="fa-solid fa-robot"></i>
                  </div>
                )}

                <div
                  className={`max-w-[94%] sm:max-w-[88%] rounded-2xl p-4 sm:p-5 overflow-visible break-words ${
                    isAi
                      ? 'bg-[#0c1427]/95 border border-white/10 hover:border-[#f9b03c]/30 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all'
                      : 'bg-gradient-to-r from-[#f9b03c] via-amber-500 to-amber-600 text-slate-950 font-bold shadow-[0_4px_20px_rgba(249,176,60,0.25)] border border-amber-300/40 rounded-tr-xs'
                  }`}
                >
                  {m.image && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-white/20 shadow-md">
                      <img src={m.image} alt="User upload" className="max-h-64 w-auto object-cover rounded-xl" />
                    </div>
                  )}

                  {m.audioUrl && (
                    <div className="mb-2.5 flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <i className="fa-solid fa-microphone text-[#f9b03c]"></i>
                      <audio controls src={m.audioUrl} className="h-8 w-full max-w-[250px]" />
                    </div>
                  )}

                  <div className={`text-xs sm:text-[14px] leading-relaxed break-words overflow-visible ${isAi ? 'text-slate-100' : 'text-slate-950 font-medium'}`}>
                    {isAi ? (
                      <FormattedAiText text={m.text} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                  </div>

                  {/* Message Bottom Action Bar */}
                  <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isAi ? 'border-white/10 text-slate-400' : 'border-black/10 text-slate-900 font-semibold'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span>{m.timestamp}</span>

                      {/*  Voice Audio Reader Button */}
                      {isAi && (
                        <button
                          type="button"
                          onClick={() => toggleSpeech(m.id, m.text)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                            isSpeakingThis
                              ? 'bg-amber-400/25 text-[#f9b03c] border border-amber-400/60 shadow-[0_0_20px_rgba(249,176,60,0.45)]'
                              : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10'
                          }`}
                          title={isSpeakingThis ? (lang === 'en' ? 'Stop Speech' : 'ድምፁን አቁም (Stop Speech)') : (lang === 'en' ? 'Listen via Voice' : 'በድምፅ አዳምጥ (Listen via Voice)')}
                        >
                          {isSpeakingThis ? (
                            <>
                              <div className="flex items-center gap-0.5 h-3">
                                <span className="w-1 h-3 bg-[#f9b03c] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-2 bg-[#f9b03c] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1 h-3.5 bg-[#f9b03c] rounded-full animate-bounce"></span>
                              </div>
                              <span className="text-[#f9b03c] font-black">{lang === 'en' ? 'Stop Voice' : 'ድምፅ አቁም'}</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-volume-high text-[#f9b03c] text-xs"></i>
                              <span>{lang === 'en' ? 'Listen' : 'አዳምጥ'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isAi && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.id, m.text)}
                        className="hover:text-white transition flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded-lg hover:bg-white/5"
                        title={lang === 'en' ? 'Copy text' : 'ጽሑፉን ኮፒ አድርግ'}
                      >
                        <i
                          className={`fa-solid ${
                            copiedId === m.id ? 'fa-check text-emerald-400' : 'fa-copy'
                          }`}
                        ></i>
                        <span className={copiedId === m.id ? 'text-emerald-400 font-bold' : ''}>
                          {copiedId === m.id ? (lang === 'en' ? 'Copied!' : 'ተገልብጧል!') : (lang === 'en' ? 'Copy' : 'ኮፒ')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {!isAi && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#3268ba] to-blue-500 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-md mt-1">
                    <i className="fa-solid fa-user"></i>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0c1427] border border-white/10 flex items-center gap-2.5 shadow-lg">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce"></span>
                </div>
                <span className="text-slate-300 font-bold text-xs">
                  {lang === 'en' ? 'Tsehay AI is thinking...' : 'Tsehay AI እያሰላሰለ ነው...'}
                </span>
              </div>
            </div>
          )}

          {/* Scroll Down Blink Indicator */}
          {showScrollDown && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black text-[11px] shadow-[0_0_20px_rgba(249,176,60,0.85)] flex items-center gap-1.5 blink-indicator cursor-pointer mx-auto"
            >
              <span>{lang === 'en' ? 'Scroll Down' : 'ወደ ታች ይሸብልሉ'}</span>
              <i className="fa-solid fa-angles-down text-[10px]"></i>
            </button>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/*  Futuristic Input Dock */}
        <div className="bg-[#090f1d]/90 backdrop-blur-3xl border border-[#f9b03c]/25 rounded-3xl p-3 sm:p-4 mb-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {/* Horizontally Scrollable AI Quick Starters / FAQ chips directly above input */}
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/5">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <i className="fa-solid fa-sparkles text-[#f9b03c]"></i>
              <span>{lang === 'en' ? 'Quick Topics' : 'ፈጣን ርዕሶች'}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => chipsTrackRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-[#f9b03c] hover:text-slate-950 text-white text-[9px] flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <button
                type="button"
                onClick={() => chipsTrackRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-[#f9b03c] hover:text-slate-950 text-white text-[9px] flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <div 
            ref={chipsTrackRef}
            className="flex items-center gap-2 overflow-x-auto tsehay-ai-scrollbar pb-2 mb-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {starterPrompts.map((starter, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(starter.prompt)}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#f9b03c]/20 hover:text-[#f9b03c] border border-white/10 hover:border-[#f9b03c]/40 text-slate-300 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95 shadow-sm"
              >
                <i className={`fa-solid ${starter.icon} text-[10px] text-[#f9b03c]`}></i>
                <span>{starter.title}</span>
              </button>
            ))}
          </div>

          {/* Attached Image Thumbnail */}
          {attachedImage && (
            <div className="mb-2.5 inline-flex items-center gap-2 bg-white/10 border border-[#f9b03c]/50 px-3 py-1.5 rounded-xl text-xs shadow-md">
              <i className="fa-solid fa-image text-[#f9b03c]"></i>
              <span className="font-bold">{lang === 'en' ? 'Image Attached' : 'ፎቶ ተያይዟል'}</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-red-400 hover:text-red-300 ml-1 cursor-pointer"
                title={lang === 'en' ? 'Remove Image' : 'ፎቶ አስወግድ'}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-red-500/15 border border-red-500/30 rounded-2xl animate-pulse">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span>{lang === 'en' ? `Recording Audio (${recordingDuration}s)...` : `ድምፅ በመቅዳት ላይ (${recordingDuration}s)...`}</span>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs cursor-pointer shadow-lg active:scale-95"
              >
                {lang === 'en' ? 'Stop & Send' : 'አቁም & ላክ'}
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
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-[#f9b03c] border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                title={lang === 'en' ? 'Attach photo or screenshot' : 'ፎቶ ወይም ስክሪንሾት አያይዝ'}
              >
                <i className="fa-solid fa-paperclip text-sm"></i>
              </button>

              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 hover:bg-red-500/20 active:scale-95 text-slate-300 hover:text-red-400 border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                title={lang === 'en' ? 'Ask with voice' : 'በድምፅ ጠይቅ'}
              >
                <i className="fa-solid fa-microphone text-sm"></i>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={lang === 'en' ? 'Ask anything about YouTube, Shein, Marketing, Coding, or Courses...' : 'ስለ ዩቲዩብ፣ ስለ ሼን፣ ስለ ማርኬቲንግ፣ ኮዲንግ ወይም ስልጠናዎች ማንኛውንም ጥያቄ ይጠይቁ...'}
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#f9b03c] focus:ring-2 focus:ring-[#f9b03c]/20 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition font-medium"
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !attachedImage)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-amber-500 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,176,60,0.4)] transition cursor-pointer shrink-0"
              >
                <span>{lang === 'en' ? 'Send' : 'ላክ'}</span>
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
