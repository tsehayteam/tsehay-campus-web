'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCachedCourses } from '@/lib/courseCache';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query } from 'firebase/firestore';

export interface QuestionScenario {
  id: string;
  category: string;
  badge: string;
  icon: string;
  question: string;
  response: string;
  courseTag: string;
  courseId: string;
}

export const SCENARIOS: QuestionScenario[] = [
  {
    id: 'youtube',
    category: '🎬 ዩቲዩብ (YouTube)',
    badge: 'Viral Hook Strategy',
    icon: 'fa-brands fa-youtube',
    question: 'የዩቲዩብ ቪዲዮዎቼን ሰዎች እስከመጨረሻው እንዲያዩት ምን ላድርግ?',
    response: `የመጀመሪያዎቹ 3 ሰከንዶች ወሳኝ ናቸው! ተመልካቹን በከፍተኛ ጉጉት (Hook) ይጀምሩ፤ ከዚያም በየ 5 ሰከንዱ የስክሪኑን አንግል ወይም ጽሑፍ በመቀየር የተመልካቹን ትኩረት ያድሱ። ዝርዝሩን በ'ዩቲዩብ ስኬት ሚስጥሮች' ኮርሳችን ውስጥ በተግባር እንሰራለን!`,
    courseTag: 'የዩቲዩብ ስኬት ሚስጥሮች',
    courseId: 'youtube'
  },
  {
    id: 'shein',
    category: '📦 ሺን ኢምፖርት (Shein)',
    badge: 'Low Cost Cargo Secret',
    icon: 'fa-solid fa-boxes-packing',
    question: 'ከሼን (Shein) ሳስመጣ የካርጎ ወጪ እንዳይበዛብኝ ምን ላድርግ?',
    response: `ዋናው መርህ 'ክብደት ሳይሆን ዋጋ እና መጠን (Volume)' መምረጥ ነው። ከባድ እቃዎችን ከመግዛት ይልቅ፣ ቀላል ግን ተፈላጊ የሆኑ የፋሽን እቃዎችን በብዛት ያምጡ። ይህ የካርጎ ወጪዎን በግማሽ ይቀንሳል!`,
    courseTag: 'የሺን ኢምፖርት ቢዝነስ',
    courseId: 'shein'
  },
  {
    id: 'marketing',
    category: '📈 ዲጂታል ማርኬቲንግ (Ads)',
    badge: '70% Cost Reduction',
    icon: 'fa-solid fa-chart-line',
    question: 'በፌስቡክ ማስታወቂያ (FB Ads) አነስተኛ ወጪ አውጥቼ ብዙ ሽያጭ እንዴት ላግኝ?',
    response: `ሚስጥሩ ያለው ማስታወቂያው ላይ ሳይሆን 'Retargeting' ላይ ነው። ቪዲዮዎን ላዩ እና ሊንክዎን ለነኩ (Warm Audience) ብቻ ማስታወቂያዎን በድጋሚ ያሳዩ። ይህ ወጪዎን በ 70% ይቀንሰዋል! ክፍል 4 ላይ በዝርዝር እንሰራዋለን።`,
    courseTag: 'ዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ',
    courseId: 'marketing'
  }
];

interface SynthesiaAiChatDemoProps {
  isActive?: boolean;
}

export default function SynthesiaAiChatDemo({ isActive = true }: SynthesiaAiChatDemoProps) {
  const router = useRouter();
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [phase, setPhase] = useState<'typing_question' | 'thinking' | 'typing_response' | 'done'>('typing_question');
  const [copied, setCopied] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currentScenario = SCENARIOS[scenarioIndex];

  // Fetch cached or live courses to resolve dynamic IDs
  useEffect(() => {
    try {
      const cached = getCachedCourses();
      if (cached && cached.length > 0) {
        setCoursesList(cached);
      }
    } catch(e) {}

    const fetchLiveCourses = async () => {
      try {
        const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCoursesList(list);
        }
      } catch (err) {
        console.warn("Courses fetch for AI demo:", err);
      }
    };
    fetchLiveCourses();
  }, []);

  // Reset or pause when inactive
  useEffect(() => {
    if (!isActive) {
      setDisplayedQuestion('');
      setDisplayedResponse('');
      setIsAiThinking(false);
      setPhase('typing_question');
    }
  }, [isActive]);

  // ✍️ Engaging and readable typing animation cadence (only starts when section is active in viewport)
  useEffect(() => {
    if (!isActive) return;

    let timeout: NodeJS.Timeout;
    const currentQ = currentScenario.question;
    const currentR = currentScenario.response;

    if (phase === 'typing_question') {
      if (displayedQuestion.length < currentQ.length) {
        timeout = setTimeout(() => {
          setDisplayedQuestion(currentQ.slice(0, displayedQuestion.length + 1));
        }, 40);
      } else {
        timeout = setTimeout(() => {
          setIsAiThinking(true);
          setPhase('thinking');
        }, 500);
      }
    } else if (phase === 'thinking') {
      timeout = setTimeout(() => {
        setIsAiThinking(false);
        setPhase('typing_response');
      }, 900);
    } else if (phase === 'typing_response') {
      if (displayedResponse.length < currentR.length) {
        timeout = setTimeout(() => {
          setDisplayedResponse(currentR.slice(0, displayedResponse.length + 1));
        }, 28);
      } else {
        setPhase('done');
      }
    } else if (phase === 'done') {
      // 7.5 second pause before gracefully transitioning to next scenario
      timeout = setTimeout(() => {
        setDisplayedQuestion('');
        setDisplayedResponse('');
        setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
        setPhase('typing_question');
      }, 7500);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayedQuestion, displayedResponse, currentScenario]);

  // Smooth scroll within container
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [displayedQuestion, displayedResponse, isAiThinking]);

  const handleSelectScenario = (index: number) => {
    if (index === scenarioIndex) return;
    setDisplayedQuestion('');
    setDisplayedResponse('');
    setIsAiThinking(false);
    setScenarioIndex(index);
    setPhase('typing_question');
  };

  const handleCopyResponse = () => {
    if (!displayedResponse) return;
    navigator.clipboard.writeText(displayedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getResolvedCourseId = (scenario: QuestionScenario): string => {
    if (!coursesList || coursesList.length === 0) return scenario.id;

    const direct = coursesList.find(c => c.id === scenario.courseId || c.id === scenario.id);
    if (direct) return direct.id;

    if (scenario.id === 'shein') {
      const sheinCourse = coursesList.find(c => 
        (c.title && /shein|ኢምፖርት|import|sheen/i.test(c.title)) ||
        (c.category && /shein|import|ecommerce/i.test(c.category))
      );
      if (sheinCourse) return sheinCourse.id;
    }

    if (scenario.id === 'marketing') {
      const marketingCourse = coursesList.find(c => 
        (c.title && /marketing|ማርኬቲንግ|ዲጂታል|social media|facebook/i.test(c.title)) ||
        (c.category && /marketing|ማርኬቲንግ/i.test(c.category))
      );
      if (marketingCourse) return marketingCourse.id;
    }

    if (scenario.id === 'youtube') {
      const ytCourse = coursesList.find(c => 
        (c.title && /youtube|ዩቲዩብ|ቪዲዮ/i.test(c.title)) ||
        (c.category && /youtube|ዩቲዩብ/i.test(c.category))
      );
      if (ytCourse) return ytCourse.id;
    }

    const tagMatch = coursesList.find(c => c.title && (c.title.includes(scenario.courseTag) || scenario.courseTag.includes(c.title)));
    if (tagMatch) return tagMatch.id;

    return coursesList[0]?.id || scenario.id;
  };

  return (
    <div className="w-full max-w-[560px] bg-[#070b14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-6 relative overflow-hidden group select-none shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-300">
      
      {/* Ambient Mesh Glows */}
      <div className="absolute -top-20 -right-20 w-52 h-52 bg-[#f9b03c]/15 rounded-full blur-[80px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-[#3268ba]/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

      {/* 1. Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]">
            <i className="fa-solid fa-robot text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-heading font-black text-white tracking-wide">
                Tsehay AI Tutor
              </span>
              <span className="text-[9px] bg-[#f9b03c]/20 text-[#f9b03c] font-black px-2 py-0.5 rounded-full border border-[#f9b03c]/30">
                CLASSROOM LIVE
              </span>
            </div>
          </div>
        </div>

        {/* 24/7 Live Wave Status */}
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

      {/* 2. Interactive Topic Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4 relative z-10">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => handleSelectScenario(i)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              scenarioIndex === i
                ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_18px_rgba(249,176,60,0.4)] font-black border border-[#f9b03c]'
                : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
            }`}
          >
            <span>{sc.category}</span>
          </button>
        ))}
      </div>

      {/* 3. Live Chat Simulation Container */}
      <div 
        ref={chatScrollRef}
        className="space-y-3 min-h-[220px] max-h-[260px] overflow-y-auto pr-1 flex flex-col justify-start relative z-10 no-scrollbar"
      >
        {/* User Question */}
        {displayedQuestion && (
          <div className="flex justify-end items-start gap-2 animate-in fade-in duration-200">
            <div className="bg-[#3268ba] text-white px-3.5 py-2.5 rounded-2xl rounded-tr-xs max-w-[88%] shadow-md border border-white/15">
              <div className="text-[9px] text-blue-200 font-mono mb-0.5 font-bold flex items-center gap-1">
                <i className="fa-solid fa-user text-[8px]"></i>
                <span>የተማሪ ጥያቄ</span>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold leading-relaxed">
                {displayedQuestion}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#3268ba] text-white flex items-center justify-center text-[10px] font-black shrink-0 border border-white/20">
              <i className="fa-solid fa-user"></i>
            </div>
          </div>
        )}

        {/* AI Neural Thinking State */}
        {isAiThinking && (
          <div className="flex items-start gap-2 animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-lg bg-[#f9b03c] text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.05] border border-[#f9b03c]/40 backdrop-blur-xl px-3 py-2 rounded-2xl rounded-tl-xs flex items-center gap-2">
              <span className="text-xs font-bold text-[#f9b03c]">Tsehay AI እያሰላሰለ ነው</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        {/* AI Typing Response */}
        {displayedResponse && (
          <div className="flex items-start gap-2 animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl p-3.5 rounded-2xl rounded-tl-xs max-w-[92%] shadow-xl relative">
              
              <div className="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1 font-heading">
                    <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Tsehay AI
                  </span>
                  <span className="text-[9px] bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 px-1.5 py-0.2 rounded-md font-bold">
                    {currentScenario.badge}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="text-[10px] text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer bg-white/[0.05] hover:bg-white/[0.1] px-2 py-0.5 rounded-md"
                  title="መልሱን ኮፒ አድርግ"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  <span>{copied ? 'ተገልብጧል' : 'Copy'}</span>
                </button>
              </div>

              {/* Streaming Text Body */}
              <p className="text-xs sm:text-[13px] text-slate-200 font-medium leading-relaxed whitespace-pre-line font-body">
                {displayedResponse}
              </p>

              {/* Course Tag & Action Button */}
              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-300 font-semibold truncate flex items-center gap-1.5">
                  <i className="fa-solid fa-graduation-cap text-[#f9b03c] text-xs shrink-0"></i>
                  <span className="truncate">{currentScenario.courseTag}</span>
                </span>
                
                <button
                  type="button"
                  onClick={() => router.push(`/courses/${getResolvedCourseId(currentScenario)}`)}
                  className="px-2.5 py-1 rounded-xl bg-[#f9b03c] hover:bg-amber-400 text-slate-950 font-black text-[11px] transition shadow-[0_0_12px_rgba(249,176,60,0.3)] hover:scale-105 active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>ይህንን ኮርስ ተማር</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Footer Status */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping"></span>
          <span className="text-gray-300 font-semibold text-[10px] sm:text-[11px]">
            በክፍል ውስጥ ለተማሪዎች 24/7 ዝግጁ
          </span>
        </div>

        <div className="text-[10px] sm:text-[11px] font-mono text-[#f9b03c] font-bold">
          {phase === 'typing_question' && '✍️ የተማሪ ጥያቄ...'}
          {phase === 'thinking' && '🧠 AI እያሰላሰለ ነው...'}
          {phase === 'typing_response' && '⚡ Tsehay AI ምላሽ...'}
          {phase === 'done' && '⏱️ የሚቀጥለው ስትራቴጂ...'}
        </div>
      </div>
    </div>
  );
}
