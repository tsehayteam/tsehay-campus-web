'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCachedCourses, getCourseSlug, getCourseBySlugOrId } from '@/lib/courseCache';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';
import Tilt3DCard from '@/components/3d/Tilt3DCard';

export interface PromptScenario {
  id: string;
  category: string;
  icon: string;
  badge: string;
  question: string;
  response: string;
  courseTag: string;
  courseSlug: string;
  accentColor: string;
}

export const PROMPT_SCENARIOS: PromptScenario[] = [
  {
    id: 'shein',
    category: '🛍️ የሼን ኢምፖርት',
    icon: 'fa-solid fa-boxes-packing',
    badge: '50% Cargo Saving',
    question: 'በሼን ኢምፖርት እንዴት ትርፋማ ልሁን?',
    response: `📦 የሼን ኢምፖርት 3ቱ የትርፋማነት ሚስጥሮች፦\n\n1. ከፍተኛ ዋጋ ያላቸውን ቀላል እቃዎች መምረጥ (High Value-to-Weight Ratio) — የካርጎ ወጪን በ 50% ይቀንሳል።\n2. በ Flash Sale እና በ Points ቅናሽ መጠቀም — የግዢ ወጪን በ 30-40% ዝቅ ያደርጋል።\n3. በቅድመ-ትዕዛዝ (Pre-Order) ሞዴል ያለ ካፒታል መስራት።\n\n💡 ዝርዝር የካርጎ ኤጀንት ግንኙነቶችንና የክፍያ መንገዶችን በኮርሱ ውስጥ እንሰራለን!`,
    courseTag: 'የሼን ኢምፖርት ቢዝነስ',
    courseSlug: 'shein-import-business',
    accentColor: '#f9b03c'
  },
  {
    id: 'youtube',
    category: '🎥 ዩቲዩብ እና ኮንተንት',
    icon: 'fa-brands fa-youtube',
    badge: 'Viral Hook Strategy',
    question: 'የዩቲዩብ ቪዲዮዎቼ ብዙ እይታ እንዲያገኙ ምን ላድርግ?',
    response: `🎬 የዩቲዩብ ቪዲዮዎችን ቫይራል የማድረጊያ 3 ቁልፍ ስልቶች፦\n\n1. ጠንካራ የመነሻ 3 ሰከንዶች (The 3-Second Hook) — ተመልካች ሳያሳልፍ ሙሉውን እንዲያይ ያደርጋል።\n2. ከፍተኛ CTR የሚያመጣ ማራኪ ተምኔል (High-Contrast Thumbnail + Mystery Text)።\n3. የተመልካች ቆይታ (Audience Retention) በየ 6 ሰከንዱ በስክሪን ቅንብር ማደስ።\n\n💡 በዩቲዩብ ማስተርክላሳችን የሞንታዥ እና የሞኒታይዜሽን ስትራቴጂዎችን ደረጃ በደረጃ ይማራሉ!`,
    courseTag: 'የዩቲዩብ ስኬት ሚስጥሮች',
    courseSlug: 'youtube-secrets-masterclass',
    accentColor: '#ef4444'
  },
  {
    id: 'marketing',
    category: '📈 ዲጂታል ማርኬቲንግ',
    icon: 'fa-solid fa-chart-line',
    badge: 'Client Acquisition',
    question: 'በዲጂታል ማርኬቲንግ የመጀመሪያ ደንበኛዬን እንዴት ላግኝ?',
    response: `📈 የመጀመሪያ ደንበኛን በፍጥነት የማግኛ 3 የድርጊት እርምጃዎች፦\n\n1. ለአካባቢዎ ላሉ 3 ትናንሽ ቢዝነሶች ነፃ አጭር የቪዲዮ ማስታወቂያ (Proof of Concept) መስራት።\n2. በ Facebook & TikTok Ads ትክክለኛውን ገዢ (Target Audience) ማነጣጠር።\n3. ውጤቱን በቁጥር በማሳየት (ROI Case Study) ወደ ወርሃዊ የክፍያ ውል መቀየር።\n\n💡 በዲጂታል ማርኬቲንግ ኮርሳችን ላይ የተረጋገጡ የማስታወቂያ ሴቲንጎችን በቀጥታ ተግባር እንሰራለን!`,
    courseTag: 'ዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ',
    courseSlug: 'digital-marketing',
    accentColor: '#3b82f6'
  }
];

export default function AITutorSection() {
  const router = useRouter();
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [phase, setPhase] = useState<'typing_q' | 'thinking' | 'typing_r' | 'idle'>('typing_q');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [coursesList, setCoursesList] = useState<any[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const activeScenario = PROMPT_SCENARIOS[activeScenarioIdx];

  // Fetch cached or live courses for navigation
  useEffect(() => {
    try {
      const cached = getCachedCourses();
      if (cached && cached.length > 0) {
        setCoursesList(cached);
      }
    } catch {}

    const fetchLive = async () => {
      try {
        const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCoursesList(list);
        }
      } catch (err) {
        console.warn("Course fetch in AITutorSection:", err);
      }
    };
    fetchLive();
  }, []);

  // Handle typing & streaming simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const targetQ = activeScenario.question;
    const targetR = activeScenario.response;

    if (phase === 'typing_q') {
      if (displayedQuestion.length < targetQ.length) {
        timer = setTimeout(() => {
          setDisplayedQuestion(targetQ.slice(0, displayedQuestion.length + 1));
        }, 32);
      } else {
        timer = setTimeout(() => {
          setIsThinking(true);
          setPhase('thinking');
        }, 350);
      }
    } else if (phase === 'thinking') {
      timer = setTimeout(() => {
        setIsThinking(false);
        setPhase('typing_r');
      }, 700);
    } else if (phase === 'typing_r') {
      if (displayedResponse.length < targetR.length) {
        // Stream text with natural cadence
        const nextChunk = targetR.slice(0, displayedResponse.length + 3);
        timer = setTimeout(() => {
          setDisplayedResponse(nextChunk);
        }, 20);
      } else {
        setPhase('idle');
      }
    }

    return () => clearTimeout(timer);
  }, [phase, displayedQuestion, displayedResponse, activeScenario]);

  // Keep scroll in view
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [displayedQuestion, displayedResponse, isThinking]);

  // Handle Chip Selection
  const handleSelectScenario = (idx: number) => {
    if (idx === activeScenarioIdx && phase !== 'idle') return;
    if (isSpeaking && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setDisplayedQuestion('');
    setDisplayedResponse('');
    setIsThinking(false);
    setActiveScenarioIdx(idx);
    setPhase('typing_q');
  };

  // Copy handler
  const handleCopy = () => {
    if (!displayedResponse) return;
    navigator.clipboard.writeText(displayedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-To-Speech (TTS) Voice handler
  const handleToggleTTS = () => {
    if (typeof window === 'undefined') return;

    if (isSpeaking) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = displayedResponse || activeScenario.response;
    if (!textToSpeak) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = textToSpeak.replace(/[#*`_💡🎬📈📦1-9.]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const amVoice = voices.find(v => v.lang.includes('am') || v.lang.includes('et'));
      if (amVoice) utterance.voice = amVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 4000);
    }
  };

  // Resolve target course route
  const getCourseHref = () => {
    if (!coursesList || coursesList.length === 0) {
      return `/courses/${activeScenario.courseSlug}`;
    }
    const match = getCourseBySlugOrId(activeScenario.courseSlug, coursesList) ||
                  getCourseBySlugOrId(activeScenario.courseTag, coursesList);
    if (match) {
      return `/courses/${getCourseSlug(match) || match.id}`;
    }
    return `/courses/${activeScenario.courseSlug}`;
  };

  // Custom User Input Submission
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const queryText = customInput.trim();
    setCustomInput('');
    setDisplayedQuestion(queryText);
    setDisplayedResponse('');
    setIsThinking(true);
    setPhase('thinking');

    setTimeout(() => {
      setIsThinking(false);
      const generatedResp = `⚡ ለ "${queryText}" የተሰጠ ፈጣን የስትራቴጂ ትንተና፦\n\n1. ግልጽ የደንበኛ ፍላጎት (Target Niche) ይለዩ።\n2. አነስተኛ ወጪ ባለው ዲጂታል ቻናል (Telegram / TikTok) ቀጥታ ይሞክሩ።\n3. የሽያጭ ሂደቱን በ AI አውቶሜሽን በማቀናጀት ስራዎን ያፋጥኑ።\n\n💡 ዝርዝር ተግባራዊ ትምህርቱን በእኛ ኮርሶች ውስጥ ያገኛሉ!`;
      setDisplayedResponse(generatedResp);
      setPhase('idle');
    }, 800);
  };

  return (
    <section id="ai-feature" className="relative py-24 lg:py-32 overflow-hidden bg-[#030509] border-y border-white/10 select-none">
      
      {/* 🌟 1. Visual Atmosphere & Layered 3D Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40"></div>
      
      {/* Golden Orange Glow (#f9b03c / 15%) */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}></div>
      
      {/* Cobalt Blue Glow (#3268ba / 20%) */}
      <div className="absolute bottom-1/4 -right-32 w-[550px] h-[550px] bg-[#3268ba]/20 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>

      {/* Floating Accent Background Grid Specular */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-gradient-to-r from-[#f9b03c]/5 via-transparent to-[#3268ba]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* ===================== LEFT COLUMN: VALUE PROPOSITION ===================== */}
          <div className="lg:col-span-6 flex flex-col text-left space-y-7">
            
            {/* Modern Top Badge */}
            <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#f9b03c]/15 via-amber-500/10 to-transparent border border-[#f9b03c]/30 px-4 py-1.5 rounded-full w-fit shadow-[0_0_25px_rgba(249,176,60,0.2)] backdrop-blur-xl group hover:border-[#f9b03c]/60 transition-colors">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
              </span>
              <span className="text-xs font-black tracking-wide text-[#f9b03c] font-heading">
                ✨ 24/7 የግል AI መምህርህ (Next-Gen AI Tutor)
              </span>
            </div>

            {/* Bold Gradient Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black font-heading text-white leading-[1.18] tracking-tight">
              ጥያቄዎችህን በቅጽበት የሚመልስ፣{' '}
              <span className="bg-gradient-to-r from-white via-amber-200 to-[#f9b03c] bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(249,176,60,0.3)]">
                አብሮህ የሚማር የግል AI መምህርህ
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 font-body leading-relaxed max-w-xl">
              በኮርሶችህ ውስጥ ለሚገጥምህ ማንኛውም ጥያቄ በሰከንዶች ውስጥ ተግባራዊ መፍትሄ፣ የቢዝነስ ስትራቴጂ እና ደረጃ በደረጃ መመሪያ የሚሰጥህ የኪስህ AI መምህር።
            </p>

            {/* 3 Sleek Benefit Cards */}
            <div className="space-y-3.5 pt-1">
              
              {/* Benefit 1 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#f9b03c]/40 transition-all duration-300 shadow-sm group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f9b03c]/20 to-amber-400/10 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-sm shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.2)] group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white font-heading flex items-center gap-2">
                    <span>ቅጽበታዊ ተግባራዊ መፍትሔ</span>
                    <span className="text-[10px] bg-[#f9b03c]/20 text-[#f9b03c] font-mono px-2 py-0.2 rounded-full border border-[#f9b03c]/30">0.2s</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    በእያንዳንዱ ኮርስ ላይ ያተኮሩ የደረጃ በደረጃ ስትራቴጂዎችና ፈጣን ማብራሪያዎች
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#3268ba]/40 transition-all duration-300 shadow-sm group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3268ba]/25 to-blue-400/10 text-[#5a93e8] border border-[#3268ba]/40 flex items-center justify-center text-sm shrink-0 shadow-[0_0_15px_rgba(50,104,186,0.25)] group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-microphone-lines"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white font-heading">
                    በድምፅ እና በጽሁፍ
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    በአማርኛ እና በእንግሊዝኛ ያለ ምንም መቆራረጥ አብሮህ ይሰራል
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-sm group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                  <span className="text-sm">🇪🇹</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white font-heading">
                    ለሀገር ውስጥ ገበያ የተመቻቸ
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    በኢትዮጵያ ነባራዊ ሁኔታ ላይ ያተኮሩ የቢዝነስ እቅዶችና የክፍያ ስልቶች
                  </p>
                </div>
              </div>

            </div>

            {/* Glowing CTA Button */}
            <div className="pt-2">
              <Link 
                href="/courses"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-sm shadow-[0_0_35px_rgba(249,176,60,0.4)] hover:shadow-[0_0_50px_rgba(249,176,60,0.65)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>ኮርሶችን ይዩ እና ይማሩ</span>
                <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform duration-300"></i>
                <span className="absolute -inset-1 rounded-2xl bg-white/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </Link>
            </div>

          </div>

          {/* ===================== RIGHT COLUMN: 3D INTERACTIVE LIVE DEMO TERMINAL ===================== */}
          <div className="lg:col-span-6 flex justify-center relative">
            
            {/* Floating Top Accent Badge ("⚡ 0.2s Instant Response") */}
            <div className="hidden sm:flex absolute -top-4 -right-2 z-20 items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#090e1a]/90 border border-amber-400/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-bounce" style={{ animationDuration: '4s' }}>
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
              <span className="text-xs font-black text-[#f9b03c] font-mono">
                ⚡ 0.2s Instant Response
              </span>
            </div>

            {/* Floating Bottom Accent Badge ("🎙️ Live Voice TTS") */}
            <div className="hidden sm:flex absolute -bottom-4 -left-2 z-20 items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#090e1a]/90 border border-blue-400/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <i className="fa-solid fa-waveform-lines text-[#5a93e8] animate-pulse"></i>
              <span className="text-xs font-black text-[#5a93e8] font-mono">
                🎙️ Live Voice TTS
              </span>
            </div>

            {/* 3D Tilt Wrapper */}
            <Tilt3DCard maxTilt={6} scale={1.01} perspective={1200} className="w-full max-w-xl">
              
              <div className="w-full bg-[#070b14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)] group">
                
                {/* Specular Edge Gradient Highlighting */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#f9b03c]/15 rounded-full blur-[90px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#3268ba]/20 rounded-full blur-[90px] pointer-events-none"></div>

                {/* 1. Terminal Window Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4 relative z-10">
                  
                  {/* macOS Acrylic Window Dots */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400/40"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/40"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40"></span>
                    <span className="ml-2 text-xs font-mono font-bold text-slate-400 hidden sm:inline">
                      Tsehay Neural Core v4.2
                    </span>
                  </div>

                  {/* 24/7 Online Pill */}
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider font-mono">
                      24/7 ONLINE
                    </span>
                  </div>

                </div>

                {/* 2. Interactive 3 Quick Prompt Chips */}
                <div className="mb-4 relative z-10">
                  <p className="text-[11px] text-gray-400 uppercase font-black tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-sparkles text-[#f9b03c]"></i>
                    <span>የተዘጋጁ ጥያቄዎችን ይምረጡ (Quick Prompt Chips):</span>
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    {PROMPT_SCENARIOS.map((sc, idx) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectScenario(idx)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-between sm:justify-center gap-1.5 active:scale-95 border ${
                          activeScenarioIdx === idx
                            ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.35)] font-black border-[#f9b03c]'
                            : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border-white/10'
                        }`}
                      >
                        <span className="truncate">{sc.category}</span>
                        {activeScenarioIdx === idx && (
                          <i className="fa-solid fa-check text-[10px]"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Live Chat Simulation Terminal Body */}
                <div 
                  ref={chatContainerRef}
                  className="space-y-3.5 min-h-[250px] max-h-[290px] overflow-y-auto pr-1 flex flex-col justify-start relative z-10 custom-scrollbar"
                >
                  
                  {/* User Prompt Message */}
                  {displayedQuestion && (
                    <div className="flex justify-end items-start gap-2.5 animate-in fade-in duration-200">
                      <div className="bg-gradient-to-r from-[#3268ba] to-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs max-w-[88%] shadow-lg border border-white/15">
                        <div className="text-[10px] text-blue-200 font-mono mb-1 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-[9px]"></i>
                          <span>የተማሪ ጥያቄ</span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold leading-relaxed">
                          {displayedQuestion}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-[#3268ba] text-white flex items-center justify-center text-xs font-black shrink-0 border border-white/20 shadow-sm">
                        <i className="fa-solid fa-user"></i>
                      </div>
                    </div>
                  )}

                  {/* AI Neural Thinking Animation */}
                  {isThinking && (
                    <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                      <div className="w-8 h-8 rounded-xl bg-[#f9b03c] text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                        <i className="fa-solid fa-robot"></i>
                      </div>
                      <div className="bg-white/[0.05] border border-[#f9b03c]/40 backdrop-blur-xl px-4 py-2.5 rounded-2xl rounded-tl-xs flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#f9b03c]">Tsehay AI ስትራቴጂውን እያዘጋጀ ነው</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Streaming Response Card */}
                  {displayedResponse && (
                    <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                        <i className="fa-solid fa-robot"></i>
                      </div>

                      <div className="bg-white/[0.04] border border-white/15 backdrop-blur-2xl p-4 rounded-2xl rounded-tl-xs max-w-[92%] shadow-2xl relative w-full">
                        
                        {/* Response Top Toolbar */}
                        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1.5 font-heading">
                              <i className="fa-solid fa-wand-magic-sparkles text-[11px]"></i> Tsehay AI
                            </span>
                            <span className="text-[10px] bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 px-2 py-0.5 rounded-full font-bold">
                              {activeScenario.badge}
                            </span>
                          </div>

                          {/* Action Icons (Voice TTS & Copy) */}
                          <div className="flex items-center gap-1.5">
                            
                            {/* Voice TTS Button */}
                            <button
                              type="button"
                              onClick={handleToggleTTS}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isSpeaking
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10'
                              }`}
                              title={isSpeaking ? "ድምፅ አቁም (Stop Voice)" : "በድምፅ አድምጥ (Listen to Voice TTS)"}
                            >
                              <i className={`fa-solid ${isSpeaking ? 'fa-volume-xmark text-red-400' : 'fa-volume-high text-[#f9b03c]'}`}></i>
                              <span>{isSpeaking ? 'አቁም' : 'አድምጥ'}</span>
                            </button>

                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition cursor-pointer"
                              title="መልሱን ቅዳ"
                            >
                              <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                            </button>
                          </div>
                        </div>

                        {/* Streaming Text Body */}
                        <p className="text-xs sm:text-[13px] text-slate-200 font-medium leading-relaxed whitespace-pre-line font-body">
                          {displayedResponse}
                        </p>

                        {/* Dynamic Course CTA Footer Badge */}
                        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-gray-300 font-semibold truncate flex items-center gap-1.5">
                            <i className="fa-solid fa-graduation-cap text-[#f9b03c] text-xs shrink-0"></i>
                            <span className="truncate">{activeScenario.courseTag}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => router.push(getCourseHref())}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:from-amber-400 hover:to-[#f9b03c] text-slate-950 font-black text-xs transition shadow-[0_0_15px_rgba(249,176,60,0.3)] hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto"
                          >
                            <span>ይህን ኮርስ ተማር</span>
                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                </div>

                {/* 4. Live Custom Question Input Bar */}
                <form onSubmit={handleCustomSubmit} className="mt-4 pt-3 border-t border-white/10 relative z-10 flex items-center gap-2">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-sparkles absolute left-3.5 top-1/2 -translate-y-1/2 text-[#f9b03c] text-xs"></i>
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="የራስዎን ጥያቄ እዚህ ይሞክሩ (Type any question)..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-400 outline-none focus:border-[#f9b03c] transition font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customInput.trim() || phase === 'thinking'}
                    className="px-4 py-2.5 rounded-xl bg-[#f9b03c] hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>ጠይቅ</span>
                    <i className="fa-solid fa-paper-plane text-[10px]"></i>
                  </button>
                </form>

              </div>
            </Tilt3DCard>

          </div>

        </div>
      </div>
    </section>
  );
}
