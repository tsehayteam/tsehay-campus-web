'use client';

import React, { useState, useEffect } from 'react';

interface QuestionScenario {
  question: string;
  response: string;
  category: string;
}

const SCENARIOS: QuestionScenario[] = [
  {
    category: 'ፌስቡክ ማስታወቂያ',
    question: 'የፌስቡክ ማስታወቂያ (Facebook Ads) እንዴት ልስራ?',
    response: `ሰላም! 🚀 በኢትዮጵያ ውስጥ ውጤታማ የፌስቡክ ማስታወቂያ ለመስራት የሚከተሉትን 3 ዋና ደረጃዎች ይከተሉ፡

1️⃣ ተስማሚ ታዳሚ (Target Audience)፡ እድሜያቸውን ከ 20-35 በማድረግ በአዲስ አበባ እና በዋና ዋና ከተሞች ላይ ያነጣጥሩ።
2️⃣ ማራኪ ቪዲዮ (Hook Video)፡ በመጀመሪያዎቹ 3 ሰከንዶች ውስጥ የደንበኛውን ችግር የሚፈታ ማራኪ ቪዲዮ ይጠቀሙ።
3️⃣ ግልጽ መልዕክት (Call-to-Action)፡ ዋጋ እና የቴሌግራም/ስልክ ሊንክ በማስቀመጥ ደንበኞች በቀላሉ እንዲያገኙዎት ያድርጉ።`
  },
  {
    category: 'የቻይና ዕቃ ማስመጣት',
    question: 'ከቻይና 1688 ዕቃዎችን እንዴት ማዘዝ እችላለሁ?',
    response: `ሰላም! 📦 ከ 1688 በቀጥታ ወደ ኢትዮጵያ ዕቃዎችን ለማስመጣት፡

1️⃣ አቅራቢ ይምረጡ (Supplier Vetting)፡ የ 5 ዓመት+ ልምድ ያላቸውን እና የ Bull ምልክት ያላቸውን ፋብሪካዎች ይምረጡ።
2️⃣ ካርጎ ኤጀንት (Forwarder)፡ በጓንግዡ ወይም ዪዉ የሚገኝ አስተማማኝ የአየር/የባህር ካርጎ አድራሻ ይጠቀሙ።
3️⃣ ክፍያ (Alipay/WeChat)፡ በታመኑ የክፍያ ወኪሎች በኩል በብር ከፍለው በዩዋን ይክፈሉ።`
  }
];

export default function SynthesiaAiChatDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [phase, setPhase] = useState<'typing_question' | 'thinking' | 'typing_response' | 'done'>('typing_question');

  const currentScenario = SCENARIOS[scenarioIndex];

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentQ = currentScenario.question;
    const currentR = currentScenario.response;

    if (phase === 'typing_question') {
      if (displayedQuestion.length < currentQ.length) {
        timeout = setTimeout(() => {
          setDisplayedQuestion(currentQ.slice(0, displayedQuestion.length + 1));
        }, 35);
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
          // Type chunks of 2-3 characters for natural ultra-smooth typing
          const nextLength = Math.min(currentR.length, displayedResponse.length + 2);
          setDisplayedResponse(currentR.slice(0, nextLength));
        }, 20);
      } else {
        setPhase('done');
      }
    } else if (phase === 'done') {
      timeout = setTimeout(() => {
        // Reset and loop to next scenario after 8 seconds of reading
        setDisplayedQuestion('');
        setDisplayedResponse('');
        setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
        setPhase('typing_question');
      }, 7500);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayedQuestion, displayedResponse, currentScenario]);

  const handleSelectScenario = (index: number) => {
    setDisplayedQuestion('');
    setDisplayedResponse('');
    setIsAiThinking(false);
    setScenarioIndex(index);
    setPhase('typing_question');
  };

  return (
    <div className="w-full bg-[#050811]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden group">
      {/* Ambient background glow behind mockup */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#f9b03c]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-[#3268ba]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Window Bar (Synthesia macOS Style) */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="ml-2 text-xs font-bold text-gray-400 font-mono">Tsehay AI Interactive Sandbox</span>
        </div>

        <div className="flex items-center gap-2 bg-[#f9b03c]/10 border border-[#f9b03c]/30 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
          <span className="text-[11px] font-black text-[#f9b03c] uppercase tracking-wider">24/7 ONLINE</span>
        </div>
      </div>

      {/* Interactive Scenario Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5 relative z-10">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">ጥያቄ ይምረጡ፡</span>
        {SCENARIOS.map((sc, i) => (
          <button
            key={i}
            onClick={() => handleSelectScenario(i)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              scenarioIndex === i
                ? 'bg-[#f9b03c] text-black shadow-[0_0_15px_rgba(249,176,60,0.4)] scale-102 font-black'
                : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] hover:text-white border border-white/[0.06]'
            }`}
          >
            {sc.category}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="space-y-4 min-h-[300px] flex flex-col justify-start relative z-10">
        {/* User Question Bubble */}
        {displayedQuestion && (
          <div className="flex justify-end items-start gap-3 animate-fadeIn">
            <div className="bg-[#3268ba] text-white p-3.5 sm:p-4 rounded-2xl rounded-tr-xs max-w-[88%] sm:max-w-[80%] shadow-md border border-white/10">
              <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                {displayedQuestion}
                {phase === 'typing_question' && <span className="inline-block w-1.5 h-3.5 bg-white ml-1 animate-pulse" />}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-white/20 shadow-sm">
              <i className="fa-solid fa-user"></i>
            </div>
          </div>
        )}

        {/* AI Thinking State */}
        {isAiThinking && (
          <div className="flex items-start gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-full bg-[#f9b03c] text-black flex items-center justify-center text-sm font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-3.5 rounded-2xl rounded-tl-xs flex items-center gap-2">
              <span className="text-xs font-bold text-[#f9b03c]">Tsehay AI እያሰበ ነው</span>
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
          <div className="flex items-start gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-full bg-[#f9b03c] text-black flex items-center justify-center text-sm font-black shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.5)]">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-4 sm:p-5 rounded-2xl rounded-tl-xs max-w-[90%] sm:max-w-[85%] shadow-lg">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.06]">
                <span className="text-xs font-black text-[#f9b03c] flex items-center gap-1.5">
                  <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> Tsehay AI Tutor
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Verified Course Strategy</span>
              </div>
              <p className="text-xs sm:text-[13.5px] text-slate-100 font-normal leading-relaxed whitespace-pre-line font-body">
                {displayedResponse}
                {phase === 'typing_response' && <span className="inline-block w-1.5 h-4 bg-[#f9b03c] ml-1 animate-pulse align-middle" />}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Mockup Action Bar */}
      <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-gray-400 relative z-10">
        <span className="flex items-center gap-1.5 text-gray-400">
          <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i> በሁሉም ኮርሶች ውስጥ በቀጥታ የሚሰራ
        </span>
        <span className="text-[#f9b03c] font-bold">100% ተግባራዊ የቢዝነስ ድጋፍ</span>
      </div>
    </div>
  );
}
