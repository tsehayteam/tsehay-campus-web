'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface QuestionScenario {
  id: string;
  category: string;
  badge: string;
  mentor: string;
  icon: string;
  question: string;
  response: string;
  courseTag: string;
}

export const SCENARIOS: QuestionScenario[] = [
  {
    id: 'youtube',
    category: '🎬 YouTube Mastery',
    badge: 'Inspired by MrBeast',
    mentor: 'MrBeast Viral Hook & Retention System',
    icon: 'fa-brands fa-youtube',
    question: 'የዩቲዩብ ቪዲዮዎቼን ሰዎች እንዳያቋርጡ (High Retention) ምን ላድርግ?',
    response: `የ ሚስተር ቢስት (MrBeast) ሚስጥር ልንገርዎት፦ የመጀመሪያዎቹ 3 ሰከንዶች (Hook) ወሳኝ ናቸው! ቪዲዮዎን በከፍተኛ ጉጉት ወይም ያልተጠበቀ ድርጊት ይጀምሩ። ከዚያም በየ 5 ሰከንዱ የስክሪኑን አንግል (Angle) ወይም ጽሑፍ በመቀየር የተመልካቹን አይን 'Reset' ያድርጉ። ዝርዝሩን በ'ዩቲዩብ ስኬት ሚስጥሮች' ኮርሳችን ውስጥ በተግባር እናሳያለን!`,
    courseTag: 'YouTube Secrets Masterclass'
  },
  {
    id: 'marketing',
    category: '📈 Digital Marketing',
    badge: 'Inspired by Neil Patel',
    mentor: 'Neil Patel 70% Ad Cost Optimization',
    icon: 'fa-solid fa-chart-line',
    question: 'በፌስቡክ ማስታወቂያ (FB Ads) አነስተኛ ወጪ አውጥቼ ብዙ ሽያጭ እንዴት ላግኝ?',
    response: `እንደ ኔሊ ፓተል (Neil Patel) ስትራቴጂ፣ ሚስጥሩ ያለው ማስታወቂያው ላይ ሳይሆን 'Retargeting' ላይ ነው። ብዙዎች ለመጀመሪያ ጊዜ ላዩት ሰው ይሸጣሉ፤ እርስዎ ግን ቪዲዮዎን ላዩ እና ሊንክዎን ለተጫኑ (Warm Audience) ብቻ ማስታወቂያዎን በድጋሚ ያሳዩ። ይህ ወጪዎን በ 70% ይቀንሰዋል! 'ክፍል 4' ላይ በተግባር እንየው።`,
    courseTag: 'Pro Digital Marketing Class'
  },
  {
    id: 'shein',
    category: '📦 Shein Import',
    badge: 'Ethiopian Context',
    mentor: 'Top Ethiopian Importers Blueprint',
    icon: 'fa-solid fa-boxes-packing',
    question: 'ከሼን (Shein) ሳስመጣ የጉምሩክ እና የካርጎ ወጪ እንዳይበዛብኝ ምን ላድርግ?',
    response: `በኢትዮጵያ ካሉ ታላላቅ አስመጪዎች የምንማረው አንድ ህግ አለ፦ 'ክብደት ሳይሆን መጠን (Volume) ይግዙ'። ከባድ ጫማዎችን ከመግዛት ይልቅ፣ ቀላል ግን ውድ የሆኑ የሴቶች ጌጣጌጦችን (Accessories) እና ስስ ልብሶችን በብዛት ያምጡ። ይህ የካርጎ ወጪዎን በግማሽ ይቀንሰዋል። በኮርሱ 'ሴክሽን 2' ላይ ትክክለኛውን የወጪ ስሌት እንማራለን።`,
    courseTag: 'Shein Import Masterclass'
  }
];

export default function SynthesiaAiChatDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [phase, setPhase] = useState<'typing_question' | 'thinking' | 'typing_response' | 'done'>('typing_question');
  const [copied, setCopied] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const currentScenario = SCENARIOS[scenarioIndex];

  // Scrollytelling Automated Typing Engine
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentQ = currentScenario.question;
    const currentR = currentScenario.response;

    if (phase === 'typing_question') {
      if (displayedQuestion.length < currentQ.length) {
        timeout = setTimeout(() => {
          setDisplayedQuestion(currentQ.slice(0, displayedQuestion.length + 1));
        }, 32);
      } else {
        timeout = setTimeout(() => {
          setIsAiThinking(true);
          setPhase('thinking');
        }, 450);
      }
    } else if (phase === 'thinking') {
      timeout = setTimeout(() => {
        setIsAiThinking(false);
        setPhase('typing_response');
      }, 750);
    } else if (phase === 'typing_response') {
      if (displayedResponse.length < currentR.length) {
        timeout = setTimeout(() => {
          // Dynamic humanized typing cadence (1-2 characters per tick)
          const nextLength = Math.min(currentR.length, displayedResponse.length + 2);
          setDisplayedResponse(currentR.slice(0, nextLength));
        }, 18);
      } else {
        setPhase('done');
      }
    } else if (phase === 'done') {
      // 5-second reading pause before transitioning to the next scenario
      timeout = setTimeout(() => {
        setDisplayedQuestion('');
        setDisplayedResponse('');
        setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
        setPhase('typing_question');
      }, 5000);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayedQuestion, displayedResponse, currentScenario]);

  // Auto scroll within container
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

  return (
    <div className="w-full terafab-ai-sandbox p-5 sm:p-7 relative overflow-hidden group select-none transition-all duration-500">
      
      {/* Cinematic Ambient Glow Gradients */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f9b03c]/15 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#3268ba]/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

      {/* Top Window Header (Mac / x.ai Terminal Style) */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]/90 border border-[#e0443e] inline-block shadow-[0_0_8px_rgba(255,95,86,0.5)]"></span>
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/90 border border-[#dea123] inline-block shadow-[0_0_8px_rgba(255,189,46,0.5)]"></span>
            <span className="w-3 h-3 rounded-full bg-[#27c93f]/90 border border-[#1aab29] inline-block shadow-[0_0_8px_rgba(39,201,63,0.5)]"></span>
          </div>
          <span className="ml-2 text-xs font-bold text-gray-300 font-mono flex items-center gap-1.5">
            <i className="fa-solid fa-terminal text-[10px] text-[#f9b03c]"></i>
            <span className="hidden xs:inline">Tsehay AI</span> Interactive Sandbox
          </span>
        </div>

        {/* 24/7 ONLINE Badge: Green Pulsing Dot with Golden Yellow Outline & Text */}
        <div className="flex items-center gap-2 bg-[#f9b03c]/10 border border-[#f9b03c]/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(249,176,60,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </span>
          <span className="text-[11px] font-black text-[#f9b03c] uppercase tracking-wider font-mono">
            24/7 ONLINE
          </span>
        </div>
      </div>

      {/* Interactive Scenario Switcher Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5 relative z-10">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <i className="fa-solid fa-layer-group text-[10px] text-[#f9b03c]"></i>
          <span>Scenario:</span>
        </span>
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => handleSelectScenario(i)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              scenarioIndex === i
                ? 'bg-gradient-to-r from-[#f9b03c] to-[#ffc66e] text-black shadow-[0_0_20px_rgba(249,176,60,0.45)] scale-102 font-black border border-[#f9b03c]'
                : 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.07]'
            }`}
          >
            <span>{sc.category}</span>
          </button>
        ))}
      </div>

      {/* Live Chat Messages Feed */}
      <div 
        ref={chatScrollRef}
        className="space-y-4 min-h-[310px] max-h-[380px] overflow-y-auto pr-1 flex flex-col justify-start relative z-10 scrollbar-thin scrollbar-thumb-white/10"
      >
        {/* User Question Bubble */}
        {displayedQuestion && (
          <div className="flex justify-end items-start gap-3 ai-bubble-animate">
            <div className="bg-gradient-to-br from-[#3268ba] to-[#254f8e] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-xs max-w-[90%] sm:max-w-[82%] shadow-lg border border-white/15 relative">
              <div className="flex items-center gap-1.5 text-[10px] text-blue-200 font-mono mb-1 font-bold">
                <i className="fa-solid fa-user text-[9px]"></i>
                <span>ተማሪ (Student Query)</span>
              </div>
              <p className="text-xs sm:text-[13.5px] font-semibold leading-relaxed font-body">
                {displayedQuestion}
                {phase === 'typing_question' && <span className="cursor-pulse-blue" />}
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#3268ba]/80 text-white flex items-center justify-center text-xs font-black shrink-0 border border-white/20 shadow-[0_0_12px_rgba(50,104,186,0.4)]">
              <i className="fa-solid fa-user"></i>
            </div>
          </div>
        )}

        {/* AI Neural Thinking State */}
        {isAiThinking && (
          <div className="flex items-start gap-3 ai-bubble-animate">
            <div className="w-9 h-9 rounded-xl bg-[#f9b03c] text-black flex items-center justify-center text-sm font-black shrink-0 shadow-[0_0_20px_rgba(249,176,60,0.6)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.04] border border-[#f9b03c]/30 backdrop-blur-xl p-3.5 rounded-2xl rounded-tl-xs flex items-center gap-3 shadow-[0_0_15px_rgba(249,176,60,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#f9b03c] font-mono tracking-wide">Tsehay AI እያሰላሰለ ነው</span>
                <span className="text-[10px] text-gray-400">({currentScenario.badge})</span>
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
          <div className="flex items-start gap-3 ai-bubble-animate">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-[#ffc66e] text-black flex items-center justify-center text-sm font-black shrink-0 shadow-[0_0_20px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.1] backdrop-blur-2xl p-4 sm:p-5 rounded-2xl rounded-tl-xs max-w-[92%] sm:max-w-[88%] shadow-2xl relative">
              
              {/* Badge & Verified Mentor Strategy Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1.5 font-heading">
                    <i className="fa-solid fa-wand-magic-sparkles text-[11px]"></i> Tsehay AI Tutor
                  </span>
                  <span className="text-[10px] bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 px-2 py-0.5 rounded-md font-black">
                    {currentScenario.badge}
                  </span>
                </div>
                
                <button
                  onClick={handleCopyResponse}
                  className="text-[11px] text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer bg-white/[0.05] hover:bg-white/[0.1] px-2 py-0.5 rounded-md border border-white/10"
                  title="መልሱን ኮፒ አድርግ"
                >
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  <span>{copied ? 'ተገልብጧል' : 'Copy'}</span>
                </button>
              </div>

              {/* Streaming AI Text Body */}
              <p className="text-xs sm:text-[13.5px] text-slate-100 font-normal leading-relaxed whitespace-pre-line font-body select-text">
                {displayedResponse}
                {phase === 'typing_response' && <span className="cursor-pulse-gold" />}
              </p>

              {/* Course Context Link */}
              {phase === 'done' && (
                <div className="mt-3.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-1">
                    <i className="fa-solid fa-graduation-cap text-[#f9b03c]"></i>
                    <span>ይህ ስትራቴጂ የሚገኘው፦ <strong className="text-white">{currentScenario.courseTag}</strong></span>
                  </span>
                  <span className="text-[#f9b03c] font-black hover:underline cursor-pointer">
                    ተማር →
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Mockup Status & 5-Second Countdown Indicator */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs text-gray-400 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
          <span className="text-gray-300 font-medium text-[11px] sm:text-xs">
            በካምፓሳችን ውስጥ ላሉ ሁሉም ተማሪዎች በነፃ የቀረበ
          </span>
        </div>

        {/* Phase Indicator */}
        <div className="text-[11px] font-mono text-[#f9b03c] font-bold">
          {phase === 'typing_question' && '✍️ የተማሪ ጥያቄ በመፃፍ ላይ...'}
          {phase === 'thinking' && '🧠 AI ስትራቴጂዎችን እያሰላሰለ ነው...'}
          {phase === 'typing_response' && '⚡ Tsehay AI መልስ በመስጠት ላይ...'}
          {phase === 'done' && '⏱️ የሚቀጥለው ስትራቴጂ በ 5 ሰከንድ ውስጥ...'}
        </div>
      </div>
    </div>
  );
}
