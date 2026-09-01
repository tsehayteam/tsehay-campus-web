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
  summary: string;
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
    summary: 'የካርጎ ወጪን በ 50% የሚቀንሱ፣ በ Flash Sale ቅናሾች የመግዛትና ያለ ካፒታል በ Pre-Order የመስራት ስልቶች።',
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
    question: 'የዩቲዩብ ቪዲዮ እይታዎችን እንዴት ላሳድግ?',
    summary: 'ቫይራል የመነሻ 3 ሰከንዶች (The 3-Second Hook)፣ ማራኪ ከፍተኛ CTR ተምኔል እና የተመልካች ቆይታ ማሳደጊያ ስልቶች።',
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
    summary: 'ለአካባቢ ቢዝነሶች ነፃ ማስታወቂያ በመስራት፣ በ Facebook & TikTok Ads ትክክለኛውን ገዢ በማነጣጠር እና ወደ ወርሃዊ ውል የመቀየር ዘዴዎች።',
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
  const [phase, setPhase] = useState<'idle' | 'typing_q' | 'thinking' | 'typing_r'>('idle');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [isSectionVisible, setIsSectionVisible] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
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

  // 🚀 Scrollytelling Visibility & Typing Trigger Sequence
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let typingTriggerTimer: NodeJS.Timeout;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsSectionVisible(true);
          // Auto-start typing only AFTER the entire section container and elements animate in (~650ms)
          typingTriggerTimer = setTimeout(() => {
            setPhase((currentPhase) => {
              if (currentPhase === 'idle') return 'typing_q';
              return currentPhase;
            });
          }, 650);
        } else {
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight;
          if (rect.top > vh + 50 || rect.bottom < -50) {
            setIsSectionVisible(false);
          }
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(typingTriggerTimer);
    };
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
        }, 28);
      } else {
        timer = setTimeout(() => {
          setIsThinking(true);
          setPhase('thinking');
        }, 300);
      }
    } else if (phase === 'thinking') {
      timer = setTimeout(() => {
        setIsThinking(false);
        setPhase('typing_r');
      }, 550);
    } else if (phase === 'typing_r') {
      if (displayedResponse.length < targetR.length) {
        const nextChunk = targetR.slice(0, displayedResponse.length + 3);
        timer = setTimeout(() => {
          setDisplayedResponse(nextChunk);
        }, 16);
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
  const handleSelectScenario = (idx: number, scrollIntoTerminal: boolean = false) => {
    if (idx === activeScenarioIdx && phase !== 'idle' && !scrollIntoTerminal) return;
    if (isSpeaking && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setDisplayedQuestion('');
    setDisplayedResponse('');
    setActiveScenarioIdx(idx);
    setPhase('typing_q');

    if (scrollIntoTerminal && terminalRef.current) {
      terminalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Copy response
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(displayedResponse || activeScenario.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Voice TTS (Live Speech Synthesis)
  const handleToggleTTS = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = displayedResponse || activeScenario.response;
    const cleanText = textToSpeak.replace(/[📦🎬📈💡⚡•\-*#]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const amVoice = voices.find(v => v.lang.includes('am') || v.lang.includes('AM'));
    if (amVoice) utterance.voice = amVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
    }, 750);
  };

  return (
    <section 
      id="ai-feature" 
      ref={sectionRef}
      className={`terafab-ai-box relative py-20 lg:py-28 overflow-hidden bg-[#030509] border-y border-white/10 select-none ${isSectionVisible ? 'is-visible' : ''}`}
    >
      
      {/* 🌟 1. Visual Atmosphere & Layered 3D Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40"></div>
      
      {/* Golden Orange Glow (#f9b03c / 15%) */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none"></div>
      
      {/* Cobalt Blue Glow (#3268ba / 20%) */}
      <div className="absolute bottom-1/4 -right-32 w-[550px] h-[550px] bg-[#3268ba]/20 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* ===================== TOP ROW: 2-COLUMN HERO SHOWCASE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ===================== LEFT COLUMN: VALUE PROPOSITION (STAGGERED DELAYS) ===================== */}
          <div className="lg:col-span-6 flex flex-col text-left space-y-6">
            
            {/* Modern Top Badge (Delay 1: 0.10s) */}
            <div className="terafab-ai-item delay-1 inline-flex items-center gap-2.5 bg-gradient-to-r from-[#f9b03c]/15 via-amber-500/10 to-transparent border border-[#f9b03c]/30 px-4 py-1.5 rounded-full w-fit shadow-[0_0_25px_rgba(249,176,60,0.2)] backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
              </span>
              <span className="text-xs font-black tracking-wide text-[#f9b03c] font-heading">
                ✨ 24/7 የግል AI መምህርህ (Next-Gen AI Tutor)
              </span>
            </div>

            {/* Bold Gradient Headline (Delay 2: 0.20s) */}
            <h2 className="terafab-ai-item delay-2 text-3xl sm:text-4xl lg:text-[2.75rem] font-black font-heading text-white leading-[1.18] tracking-tight">
              ጥያቄዎችህን በቅጽበት የሚመልስ፣{' '}
              <span className="bg-gradient-to-r from-white via-amber-200 to-[#f9b03c] bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(249,176,60,0.3)]">
                አብሮህ የሚማር የግል AI መምህርህ
              </span>
            </h2>

            {/* Subtitle (Delay 3: 0.30s) */}
            <p className="terafab-ai-item delay-3 text-sm sm:text-base text-slate-300 font-body leading-relaxed max-w-xl">
              በኮርሶችህ ውስጥ ለሚገጥምህ ማንኛውም ጥያቄ በሰከንዶች ውስጥ ተግባራዊ መፍትሄ፣ የቢዝነስ ስትራቴጂ እና ደረጃ በደረጃ መመሪያ የሚሰጥህ የኪስህ AI መምህር።
            </p>

            {/* 3 Sleek Benefit Cards (Staggered Delays 4, 5, 6: 0.40s, 0.50s, 0.60s) */}
            <div className="space-y-3 pt-1">
              
              {/* Benefit 1 */}
              <div className="terafab-ai-item delay-4 flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#f9b03c]/40 transition-all duration-300 shadow-sm group">
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
              <div className="terafab-ai-item delay-5 flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#3268ba]/40 transition-all duration-300 shadow-sm group">
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
              <div className="terafab-ai-item delay-6 flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 shadow-sm group">
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

            {/* Glowing CTA Button (Delay 7: 0.70s) */}
            <div className="terafab-ai-item delay-7 pt-2">
              <Link 
                href="/courses"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(249,176,60,0.4)] hover:shadow-[0_0_50px_rgba(249,176,60,0.65)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>ኮርሶችን ይዩ እና ይማሩ →</span>
              </Link>
            </div>

          </div>

          {/* ===================== RIGHT COLUMN: 3D INTERACTIVE LIVE DEMO TERMINAL ===================== */}
          <div ref={terminalRef} className="terafab-ai-item delay-4 lg:col-span-6 flex justify-center relative">
            
            {/* 3D Tilt Wrapper */}
            <Tilt3DCard maxTilt={5} scale={1.01} perspective={1200} className="w-full max-w-xl">
              
              <div className="w-full bg-[#070b14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85)] group">
                
                {/* Specular Edge Gradient Highlighting */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#f9b03c]/15 rounded-full blur-[90px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#3268ba]/20 rounded-full blur-[90px] pointer-events-none"></div>

                {/* 1. Terminal Window Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4 relative z-10">
                  
                  {/* macOS Window Dots */}
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
                    <span>የተዘጋጁ ጥያቄዎችን ይምረጡ (Quick Chips):</span>
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  className="space-y-3.5 min-h-[250px] max-h-[280px] overflow-y-auto pr-1 flex flex-col justify-start relative z-10 custom-scrollbar"
                >
                  
                  {/* User Prompt Message */}
                  {displayedQuestion && (
                    <div className="flex justify-end items-start gap-2.5 animate-in fade-in duration-200 min-w-0">
                      <div 
                        className="bg-gradient-to-r from-[#3268ba] to-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-xs max-w-[88%] shadow-lg border border-white/15 min-w-0"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                      >
                        <div className="text-[10px] text-blue-200 font-mono mb-1 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-[9px]"></i>
                          <span>የተማሪ ጥያቄ</span>
                        </div>
                        <p 
                          className="text-xs sm:text-sm font-bold leading-relaxed terafab-typing-text"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                        >
                          <span>{displayedQuestion}</span>
                          {phase === 'typing_q' && (
                            <span className="inline-block w-1.5 h-3.5 bg-white animate-pulse ml-1 align-middle shadow-[0_0_6px_#ffffff] rounded-xs"></span>
                          )}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-[#3268ba] text-white flex items-center justify-center text-xs font-black shrink-0 border border-white/20 shadow-sm">
                        <i className="fa-solid fa-user"></i>
                      </div>
                    </div>
                  )}

                  {/* AI Neural Thinking Animation */}
                  {isThinking && (
                    <div className="flex items-start gap-2.5 animate-in fade-in duration-200 min-w-0">
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
                    <div className="flex items-start gap-2.5 animate-in fade-in duration-200 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                        <i className="fa-solid fa-robot"></i>
                      </div>

                      <div 
                        className="bg-white/[0.04] border border-white/15 backdrop-blur-2xl p-4 rounded-2xl rounded-tl-xs max-w-[92%] shadow-2xl relative w-full min-w-0 overflow-hidden"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        
                        {/* Response Top Toolbar */}
                        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1.5 font-heading shrink-0">
                              <i className="fa-solid fa-wand-magic-sparkles text-[11px]"></i> Tsehay AI
                            </span>
                            <span className="text-[10px] bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 px-2 py-0.5 rounded-full font-bold truncate">
                              {activeScenario.badge}
                            </span>
                          </div>

                          {/* Action Icons (Voice TTS & Copy) */}
                          <div className="flex items-center gap-2 shrink-0">
                            
                            {/* Live Sound Wave Equalizer animation when speaking */}
                            {isSpeaking && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-[#f9b03c]/40 animate-pulse">
                                <span className="w-1 h-3 bg-[#f9b03c] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1 h-4 bg-amber-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1 h-2 bg-[#f9b03c] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                <span className="w-1 h-4.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></span>
                                <span className="text-[10px] text-[#f9b03c] font-mono font-black ml-1 hidden sm:inline">LIVE AUDIO</span>
                              </div>
                            )}

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

                        {/* Streaming Text Body with Multi-line Wrapping & Inline Cursor */}
                        <div 
                          className="terafab-typing-text text-xs sm:text-[13px] text-slate-200 font-medium leading-relaxed font-body"
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                        >
                          <span>{displayedResponse}</span>
                          {phase === 'typing_r' && (
                            <span className="inline-block w-1.5 h-3.5 sm:h-4 bg-[#f9b03c] animate-pulse ml-1 align-middle shadow-[0_0_8px_#f9b03c] rounded-xs"></span>
                          )}
                        </div>

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

        {/* ===================== 🌟 2. 3-COLUMN FAQ QUESTION GRID (STAGGERED DELAYS) ===================== */}
        <div className="pt-6 border-t border-white/10">
          
          <div className="terafab-ai-item delay-5 text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#f9b03c] font-heading">
              💡 በብዛት የሚጠየቁ ጥያቄዎች • AI FAQ Knowledge Base
            </span>
            <h3 className="text-2xl sm:text-3xl font-black font-heading text-white">
              ተማሪዎቻችን Tsehay AI ን በብዛት የሚጠይቋቸው ርዕሶች
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              ከስር ከቀረቡት ጥያቄዎች አንዱን በመጫን የቀጥታ ስትራቴጂውን በ AI አስመስክረው ይመልከቱ
            </p>
          </div>

          <div className="terafab-ai-item delay-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROMPT_SCENARIOS.map((sc, idx) => (
              <div
                key={`faq-${sc.id}`}
                onClick={() => handleSelectScenario(idx, true)}
                className={`group p-5 rounded-3xl border transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-xl flex flex-col justify-between ${
                  activeScenarioIdx === idx
                    ? 'bg-[#f9b03c]/10 border-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.25)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-[#f9b03c]/50 shadow-lg'
                }`}
              >
                {/* Subtle Ambient Glow */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#f9b03c]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#f9b03c]/20 transition-colors" />

                <div>
                  {/* Top Badge & Category */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1.5">
                      <i className={sc.icon}></i>
                      <span>{sc.category}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300">
                      {sc.badge}
                    </span>
                  </div>

                  {/* Question */}
                  <h4 className="text-base font-black text-white font-heading mb-2 group-hover:text-[#f9b03c] transition-colors leading-snug">
                    "{sc.question}"
                  </h4>

                  {/* Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed font-body">
                    {sc.summary}
                  </p>
                </div>

                {/* Bottom Action Trigger */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                  <span className="text-[#f9b03c] group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                    <span>በ AI አስመስክር (Ask AI)</span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {sc.courseTag}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
