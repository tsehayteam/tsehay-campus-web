'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp?: string;
  copied?: boolean;
}

export default function FloatingAIButton() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'ሰላም! እኔ Tsehay AI ነኝ። የፀሐይ ካምፓስ ይፋዊ AI ረዳትዎ እና የመማሪያ ጓደኛዎ። ዛሬ በምን ልርዳዎት? ስለ ኮርሶች፣ ስለ ስልጠናዎች፣ ስለ ክፍያ ወይም ስለ ትምህርቶች ማንኛውንም ጥያቄ ይጠይቁኝ! ✨',
      timestamp: 'አሁን'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [noteSavedIdx, setNoteSavedIdx] = useState<number | null>(null);

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
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

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

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || input).trim();
    if (!rawText || isLoading) return;

    playSoundEffect('send');

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgs: Message[] = [
      ...messages,
      { role: 'user', text: rawText, timestamp: nowTime }
    ];

    setMessages(newMsgs);
    setInput('');
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
    } catch (e) {
      alert('ማስታወሻውን ማስቀመጥ አልተቻለም።');
    }
  };

  const handleClearChat = async () => {
    if (!confirm('የ Tsehay AI ቻት ታሪክዎን ማጽዳት ይፈልጋሉ?')) return;
    const initialGreeting: Message[] = [{
      role: 'ai',
      text: 'ሰላም! እኔ Tsehay AI ነኝ። የፀሐይ ካምፓስ ይፋዊ AI ረዳትዎ እና የመማሪያ ጓደኛዎ። ዛሬ በምን ልርዳዎት? ✨',
      timestamp: 'አሁን'
    }];
    setMessages(initialGreeting);
    const storageKey = user?.uid ? `tsehay_floating_ai_${user.uid}` : 'tsehay_floating_ai_guest';
    try { localStorage.setItem(storageKey, JSON.stringify(initialGreeting)); } catch (e) {}
    if (user?.uid) {
      try {
        const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'floating_history');
        await setDoc(docRef, { messages: initialGreeting, updatedAt: serverTimestamp() });
      } catch (e) {}
    }
  };

  // Quick Action Prompts
  const quickPrompts = [
    { label: '💡 የኮርስ ማጠቃለያ', prompt: selectedCourse ? `የ"${selectedCourse.title}" ኮርስ ዋና ዋና ጥቅሞችን እና ትኩረቶችን አጠቃልለህ ንገረኝ` : 'በፀሐይ ካምፓስ የሚሰጡ ኮርሶችን እና ጥቅሞቻቸውን አጠቃልለህ ንገረኝ' },
    { label: '🚀 ተግባራዊ አተገባበር', prompt: selectedCourse ? `በ"${selectedCourse.title}" ኮርስ የተማርነውን በኢትዮጵያ ውስጥ በተግባር እንዴት ልተግብረው?` : 'ከኮርሶቹ የምናገኘውን እውቀት በተግባር ወደ ገቢ እንዴት እንቀይረዋለን?' },
    { label: '💳 የክፍያ እና ምዝገባ ሁኔታ', prompt: 'ለኮርሶቹ እንዴት በቴሌብር ወይም በባንክ እከፍላለሁ? የምዝገባው ሂደት እንዴት ነው?' },
    { label: '📜 ሰርተፊኬት አሰጣጥ', prompt: 'ኮርስ ሳጠናቅቅ ሰርተፊኬት እንዴት ነው የማገኘው?' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-body select-none">
      
      {/* 🌟 1. EXPANDABLE CHAT MODAL / DRAWER */}
      {isOpen && (
        <div className={`mb-4 w-[92vw] sm:w-[410px] md:w-[440px] bg-[#070b14]/95 dark:bg-[#070b14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[580px] sm:h-[620px] max-h-[82vh]'
        }`}>
          
          {/* Header Bar */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#0b1329] via-[#0f1b38] to-[#0b1329] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]">
                  <i className="fa-solid fa-robot text-lg"></i>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0b1329] rounded-full animate-pulse"></span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-sm text-white tracking-wide">
                    Tsehay AI Tutor
                  </h3>
                  <span className="text-[10px] bg-[#f9b03c]/20 text-[#f9b03c] font-black px-2 py-0.5 rounded-full border border-[#f9b03c]/30">
                    24/7 LIVE
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{selectedCourse ? selectedCourse.title : 'የፀሐይ ካምፓስ AI ረዳት'}</span>
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleClearChat}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ታሪክ አፅዳ (Clear Chat)"
              >
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>

              <button 
                onClick={() => setIsMinimized(prev => !prev)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title={isMinimized ? "አስፋ" : "አሳንስ"}
              >
                <i className={`fa-solid ${isMinimized ? 'fa-up-right-and-down-left-from-center' : 'fa-minus'} text-xs`}></i>
              </button>

              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Course Context Switcher Pill */}
              <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
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
                  className="bg-[#0f172a] text-xs font-bold text-[#f9b03c] border border-white/15 rounded-xl px-2.5 py-1 outline-none focus:border-[#f9b03c] transition shrink-0 cursor-pointer max-w-[210px] truncate"
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className="flex items-end gap-2 max-w-[88%]">
                        {!isUser && (
                          <div className="w-7 h-7 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0 mb-1">
                            <i className="fa-solid fa-robot text-xs"></i>
                          </div>
                        )}

                        <div 
                          className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm break-words ${
                            isUser
                              ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-bold rounded-br-none shadow-[0_4px_20px_rgba(249,176,60,0.25)]'
                              : 'bg-[#0f1629]/95 text-slate-100 border border-white/10 rounded-bl-none font-medium'
                          }`}
                        >
                          <div className="whitespace-pre-wrap font-body">
                            {m.text}
                          </div>

                          <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${isUser ? 'text-slate-900/80 font-bold' : 'text-gray-400'}`}>
                            <span>{m.timestamp || 'አሁን'}</span>
                            {isUser && <i className="fa-solid fa-check-double text-[10px] text-slate-900"></i>}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons under AI response */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-1.5 ml-9">
                          <button 
                            onClick={() => handleCopyMessage(m.text, idx)}
                            className="text-[10px] bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition cursor-pointer"
                          >
                            <i className={`fa-solid ${copiedIdx === idx ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                            <span>{copiedIdx === idx ? '✓ ተገልብጧል' : 'ኮፒ'}</span>
                          </button>

                          <button 
                            onClick={() => handleSaveToNotes(m.text, idx)}
                            className="text-[10px] bg-[#f9b03c]/10 hover:bg-[#f9b03c]/20 text-[#f9b03c] px-2.5 py-1 rounded-lg border border-[#f9b03c]/20 flex items-center gap-1 transition cursor-pointer"
                          >
                            <i className={`fa-solid ${noteSavedIdx === idx ? 'fa-circle-check text-emerald-400' : 'fa-bookmark'}`}></i>
                            <span>{noteSavedIdx === idx ? '✓ ተመዝግቧል' : 'ማስታወሻ'}</span>
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

              {/* Quick Action Suggestion Pills */}
              <div className="px-3 py-2 bg-black/40 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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

              {/* Input & Animated Send Button */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 bg-gradient-to-t from-[#060a14] to-[#0c1222] border-t border-white/10 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={selectedCourse ? `ስለ ${selectedCourse.title} ይጠይቁ...` : "ጥያቄዎን እዚህ ይጻፉ..."}
                  className="flex-1 bg-white/5 border border-white/15 focus:border-[#f9b03c] focus:ring-1 focus:ring-[#f9b03c]/30 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 outline-none transition"
                />

                {/* Tactile Send Button with Micro-Interaction (active:scale-90) */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`h-10 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-90 ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.5)] hover:brightness-110'
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                  title="መልዕክት ላክ (Send Message)"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs transform group-hover:translate-x-0.5 transition-transform"></i>
                      <span className="hidden sm:inline">ላክ</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      )}

      {/* 🌟 2. FLOATING LAUNCHER BUTTON WITH GLOWING RADIAL PULSE */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-[#0d1527] via-[#13203f] to-[#0d1527] border border-[#f9b03c]/40 hover:border-[#f9b03c] p-2.5 sm:px-4 sm:py-3 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(249,176,60,0.45)] transition-all duration-300 active:scale-90 hover:-translate-y-1 cursor-pointer"
          title="Tsehay AI Assistant ን ክፈት"
        >
          {/* Animated Laser Border Beam Glow */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3268ba] via-[#f9b03c] to-[#3268ba] opacity-40 group-hover:opacity-100 blur-sm transition duration-500 animate-pulse pointer-events-none"></span>

          <div className="relative flex items-center gap-3">
            {/* Robot Avatar Icon with Pulse */}
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-robot"></i>
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d1527] rounded-full animate-ping"></span>
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0d1527] rounded-full"></span>
            </div>

            {/* Amharic Label on Desktop */}
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
