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
  mentor: string;
  icon: string;
  question: string;
  response: string;
  courseTag: string;
  courseId: string;
}

export const SCENARIOS: QuestionScenario[] = [
  {
    id: 'youtube',
    category: '🎬 YouTube Mastery',
    badge: 'MrBeast Hook System',
    mentor: 'Viral Hook & Retention Blueprint',
    icon: 'fa-brands fa-youtube',
    question: 'የዩቲዩብ ቪዲዮዎቼን ሰዎች እንዳያቋርጡ (High Retention) ምን ላድርግ?',
    response: `የ ሚስተር ቢስት (MrBeast) ሚስጥር ልንገርዎት፦ የመጀመሪያዎቹ 3 ሰከንዶች (Hook) ወሳኝ ናቸው! ቪዲዮዎን በከፍተኛ ጉጉት ወይም ያልተጠበቀ ድርጊት ይጀምሩ። ከዚያም በየ 5 ሰከንዱ የስክሪኑን አንግል ወይም ጽሑፍ በመቀየር የተመልካቹን አይን 'Reset' ያድርጉ። ዝርዝሩን በ'ዩቲዩብ ስኬት ሚስጥሮች' ኮርሳችን ውስጥ በተግባር እናሳያለን!`,
    courseTag: 'የዩቲዩብ ስኬት ሚስጥሮች (YouTube Secrets)',
    courseId: 'youtube'
  },
  {
    id: 'marketing',
    category: '📈 Digital Marketing',
    badge: 'Neil Patel Retargeting',
    mentor: '70% Ad Cost Optimization',
    icon: 'fa-solid fa-chart-line',
    question: 'በፌስቡክ ማስታወቂያ (FB Ads) አነስተኛ ወጪ አውጥቼ ብዙ ሽያጭ እንዴት ላግኝ?',
    response: `እንደ ኔሊ ፓተል (Neil Patel) ስትራቴጂ፣ ሚስጥሩ ያለው ማስታወቂያው ላይ ሳይሆን 'Retargeting' ላይ ነው። ብዙዎች ለመጀመሪያ ጊዜ ላዩት ሰው ይሸጣሉ፤ እርስዎ ግን ቪዲዮዎን ላዩ እና ሊንክዎን ለተጫኑ (Warm Audience) ብቻ ማስታወቂያዎን በድጋሚ ያሳዩ። ይህ ወጪዎን በ 70% ይቀንሰዋል! 'ክፍል 4' ላይ በተግባር እንየው።`,
    courseTag: 'የዲጂታል ማርኬቲንግ እና ሶሻል ሚዲያ ቢዝነስ',
    courseId: 'marketing'
  },
  {
    id: 'shein',
    category: '📦 Shein Import',
    badge: 'Ethiopian Context',
    mentor: 'Top Importers Blueprint',
    icon: 'fa-solid fa-boxes-packing',
    question: 'ከሼን (Shein) ሳስመጣ የጉምሩክ እና የካርጎ ወጪ እንዳይበዛብኝ ምን ላድርግ?',
    response: `በኢትዮጵያ ካሉ ታላላቅ አስመጪዎች የምንማረው አንድ ህግ አለ፦ 'ክብደት ሳይሆን መጠን (Volume) ይግዙ'። ከባድ ጫማዎችን ከመግዛት ይልቅ፣ ቀላል ግን ውድ የሆኑ የሴቶች ጌጣጌጦችን (Accessories) እና ስስ ልብሶችን በብዛት ያምጡ። ይህ የካርጎ ወጪዎን በግማሽ ይቀንሰዋል። በኮርሱ 'ሴክሽን 2' ላይ ትክክለኛውን የወጪ ስሌት እንማራለን።`,
    courseTag: 'የሺን ኢምፖርት ቢዝነስ ስልጠና',
    courseId: 'shein'
  }
];

export default function SynthesiaAiChatDemo() {
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

  // Fetch live and cached courses to dynamically match course IDs
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
        console.warn("Live courses fetch for AI demo:", err);
      }
    };
    fetchLiveCourses();
  }, []);

  // ✍️ Scrollytelling Automated Typing Engine with Calm Readable Cadence
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentQ = currentScenario.question;
    const currentR = currentScenario.response;

    if (phase === 'typing_question') {
      if (displayedQuestion.length < currentQ.length) {
        timeout = setTimeout(() => {
          setDisplayedQuestion(currentQ.slice(0, displayedQuestion.length + 1));
        }, 55); // Calm humanized question typing pace
      } else {
        timeout = setTimeout(() => {
          setIsAiThinking(true);
          setPhase('thinking');
        }, 650);
      }
    } else if (phase === 'thinking') {
      timeout = setTimeout(() => {
        setIsAiThinking(false);
        setPhase('typing_response');
      }, 1100); // Realistic neural deliberation pause
    } else if (phase === 'typing_response') {
      if (displayedResponse.length < currentR.length) {
        timeout = setTimeout(() => {
          // Readable, comfortable streaming pace (1 character per tick)
          setDisplayedResponse(currentR.slice(0, displayedResponse.length + 1));
        }, 36);
      } else {
        setPhase('done');
      }
    } else if (phase === 'done') {
      // 8.5-second comfortable reading pause before transitioning to the next scenario
      timeout = setTimeout(() => {
        setDisplayedQuestion('');
        setDisplayedResponse('');
        setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
        setPhase('typing_question');
      }, 8500);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayedQuestion, displayedResponse, currentScenario]);

  // Auto scroll within container smoothly
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

    // 1. Direct ID match
    const direct = coursesList.find(c => c.id === scenario.courseId || c.id === scenario.id);
    if (direct) return direct.id;

    // 2. Shein / Import match
    if (scenario.id === 'shein') {
      const sheinCourse = coursesList.find(c => 
        (c.title && /shein|ኢምፖርት|import|sheen/i.test(c.title)) ||
        (c.category && /shein|import|ecommerce/i.test(c.category))
      );
      if (sheinCourse) return sheinCourse.id;
    }

    // 3. Digital Marketing match
    if (scenario.id === 'marketing') {
      const marketingCourse = coursesList.find(c => 
        (c.title && /marketing|ማርኬቲንግ|ዲጂታል|social media|facebook/i.test(c.title)) ||
        (c.category && /marketing|ማርኬቲንግ/i.test(c.category))
      );
      if (marketingCourse) return marketingCourse.id;
    }

    // 4. YouTube match
    if (scenario.id === 'youtube') {
      const ytCourse = coursesList.find(c => 
        (c.title && /youtube|ዩቲዩብ|ቪዲዮ/i.test(c.title)) ||
        (c.category && /youtube|ዩቲዩብ/i.test(c.category))
      );
      if (ytCourse) return ytCourse.id;
    }

    // 5. Fallback match by courseTag substring
    const tagMatch = coursesList.find(c => c.title && (c.title.includes(scenario.courseTag) || scenario.courseTag.includes(c.title)));
    if (tagMatch) return tagMatch.id;

    return coursesList[0]?.id || scenario.id;
  };

  const handleNavigateToCourse = (scenario: QuestionScenario) => {
    const targetId = getResolvedCourseId(scenario);
    router.push(`/courses/${targetId}`);
  };

  return (
    <div className="w-full max-w-[580px] terafab-ai-sandbox p-4 sm:p-6 relative overflow-hidden group select-none transition-all duration-500 shadow-2xl">
      
      {/* Ambient Radial Mesh Glows */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#f9b03c]/15 rounded-full blur-[90px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#3268ba]/20 rounded-full blur-[90px] pointer-events-none animate-pulse" />

      {/* 1. Top Window Header (Terafab / x.ai Mac Terminal Styling) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90 border border-[#e0443e] inline-block shadow-[0_0_6px_rgba(255,95,86,0.5)]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90 border border-[#dea123] inline-block shadow-[0_0_6px_rgba(255,189,46,0.5)]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90 border border-[#1aab29] inline-block shadow-[0_0_6px_rgba(39,201,63,0.5)]"></span>
          </div>
          <span className="ml-1.5 text-xs font-bold text-slate-700 dark:text-gray-300 font-mono flex items-center gap-1.5">
            <i className="fa-solid fa-terminal text-[10px] text-[#f9b03c]"></i>
            <span className="hidden xs:inline">Tsehay AI</span> Sandbox
          </span>
        </div>

        {/* 24/7 ONLINE Badge */}
        <div className="flex items-center gap-1.5 bg-[#f9b03c]/10 border border-[#f9b03c]/40 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(249,176,60,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </span>
          <span className="text-[10px] font-black text-amber-700 dark:text-[#f9b03c] uppercase tracking-wider font-mono">
            24/7 ONLINE
          </span>
        </div>
      </div>

      {/* 2. Interactive Scenario Switcher Chips (Click to switch preview or view course) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 relative z-10">
        <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mr-0.5 flex items-center gap-1">
          <i className="fa-solid fa-layer-group text-[9px] text-[#f9b03c]"></i>
          <span>Scenario:</span>
        </span>
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => handleSelectScenario(i)}
            className={`text-xs font-bold px-2.5 sm:px-3 py-1 rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              scenarioIndex === i
                ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-black shadow-[0_0_18px_rgba(249,176,60,0.4)] scale-102 font-black border border-[#f9b03c]'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-white border border-slate-200 dark:border-white/[0.07]'
            }`}
          >
            <span>{sc.category}</span>
          </button>
        ))}
      </div>

      {/* 3. Live Chat Messages Feed */}
      <div 
        ref={chatScrollRef}
        className="space-y-3.5 min-h-[250px] max-h-[320px] overflow-y-auto pr-1 flex flex-col justify-start relative z-10 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10"
      >
        {/* User Question Bubble */}
        {displayedQuestion && (
          <div className="flex justify-end items-start gap-2.5 ai-bubble-animate">
            <div className="bg-gradient-to-br from-[#3268ba] to-[#204a87] text-white p-3 sm:p-3.5 rounded-2xl rounded-tr-xs max-w-[92%] sm:max-w-[85%] shadow-md border border-white/15 relative">
              <div className="flex items-center gap-1.5 text-[9px] text-blue-200 font-mono mb-0.5 font-bold">
                <i className="fa-solid fa-user text-[8px]"></i>
                <span>ተማሪ (Student Query)</span>
              </div>
              <p className="text-xs sm:text-[13px] font-semibold leading-relaxed font-body">
                {displayedQuestion}
                {phase === 'typing_question' && <span className="cursor-pulse-blue" />}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#3268ba] text-white flex items-center justify-center text-[10px] font-black shrink-0 border border-white/20 shadow-xs">
              <i className="fa-solid fa-user"></i>
            </div>
          </div>
        )}

        {/* AI Neural Thinking State */}
        {isAiThinking && (
          <div className="flex items-start gap-2.5 ai-bubble-animate">
            <div className="w-7 h-7 rounded-lg bg-[#f9b03c] text-black flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/90 dark:bg-white/[0.04] border border-[#f9b03c]/40 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl rounded-tl-xs flex items-center gap-2.5 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-800 dark:text-[#f9b03c] font-mono tracking-wide">Tsehay AI እያሰላሰለ ነው</span>
                <span className="text-[9px] text-slate-500 dark:text-gray-400">({currentScenario.badge})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        {/* AI Typing Response Bubble */}
        {displayedResponse && (
          <div className="flex items-start gap-2.5 ai-bubble-animate">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-black flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/90 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] backdrop-blur-2xl p-3.5 sm:p-4 rounded-2xl rounded-tl-xs max-w-[94%] sm:max-w-[90%] shadow-lg dark:shadow-2xl relative">
              
              {/* Badge & Verified Mentor Strategy Tag */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-800 dark:text-[#f9b03c] flex items-center gap-1 font-heading">
                    <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Tsehay AI Tutor
                  </span>
                  <span className="text-[9px] bg-[#f9b03c]/20 text-amber-900 dark:text-[#f9b03c] border border-[#f9b03c]/40 px-1.5 py-0.2 rounded-md font-black">
                    {currentScenario.badge}
                  </span>
                </div>
                
                <button
                  onClick={handleCopyResponse}
                  className="text-[10px] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10"
                  title="መልሱን ኮፒ አድርግ"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                  <span>{copied ? 'ተገልብጧል' : 'Copy'}</span>
                </button>
              </div>

              {/* Streaming AI Text Body */}
              <p className="text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-line font-body select-text">
                {displayedResponse}
                {phase === 'typing_response' && <span className="cursor-pulse-gold" />}
              </p>

              {/* 🚀 CRITICAL INTERACTIVE CTA LINK (Direct to Course Details Page) */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-600 dark:text-gray-300 flex items-center gap-1.5 truncate max-w-[280px]">
                  <i className="fa-solid fa-graduation-cap text-[#f9b03c] text-xs shrink-0"></i>
                  <span className="truncate font-semibold">{currentScenario.courseTag}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleNavigateToCourse(currentScenario)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-black font-black text-[11px] shadow-[0_0_15px_rgba(249,176,60,0.35)] hover:shadow-[0_0_25px_rgba(249,176,60,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <span>ይህንን ኮርስ ተማር</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Mockup Status & Live Indicator */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping"></span>
          <span className="text-slate-700 dark:text-gray-300 font-semibold text-[10px] sm:text-[11px]">
            በካምፓሳችን ውስጥ ላሉ ተማሪዎች በነፃ የቀረበ
          </span>
        </div>

        {/* Phase Indicator */}
        <div className="text-[10px] sm:text-[11px] font-mono text-amber-800 dark:text-[#f9b03c] font-bold">
          {phase === 'typing_question' && '✍️ የተማሪ ጥያቄ በመፃፍ ላይ...'}
          {phase === 'thinking' && '🧠 AI ስትራቴጂ እያሰላሰለ ነው...'}
          {phase === 'typing_response' && '⚡ Tsehay AI መልስ በመስጠት ላይ...'}
          {phase === 'done' && '⏱️ የሚቀጥለው ስትራቴጂ በ 8 ሰከንድ...'}
        </div>
      </div>
    </div>
  );
}
