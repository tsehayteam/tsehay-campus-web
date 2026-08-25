'use client';

import React, { useState, useEffect } from 'react';

const LOCAL_EMBED_URL = 'https://www.youtube.com/embed/l592Q0zJq2M?modestbranding=1&rel=0&controls=1&showinfo=0';
const INTERNATIONAL_EMBED_URL = 'https://www.youtube.com/embed/Z0oYJ8z0i3s?modestbranding=1&rel=0&controls=1&showinfo=0';

export default function InstructorYouTubePortfolio() {
  // 🌟 Human-like Pencil Typewriter with Playful Eraser Corrections & Multi-Phrases
  const [typedDesc, setTypedDesc] = useState('');
  const [pencilAction, setPencilAction] = useState<'writing' | 'erasing' | 'paused' | 'thinking'>('writing');

  const localCardTitle = 'ሀገርኛ ቻናል (Domestic)';
  const [typedLocalTitle, setTypedLocalTitle] = useState('');

  const intlCardTitle = 'ዓለም አቀፍ ቻናል (International)';
  const [typedIntlTitle, setTypedIntlTitle] = useState('');

  // 1. Dynamic Pencil Typewriter Animation with Playful Typo Erasing
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: any = null;

    const sleep = (ms: number) => new Promise(resolve => {
      timeoutId = setTimeout(resolve, ms);
    });

    const typeWriterLoop = async () => {
      while (!isCancelled) {
        // --- SEQUENCE 1: Playful Typo -> Eraser Correction -> Accurate Line ---
        const base1 = "እኛ በተግባር የምናስተዳድራቸውንና ";
        const typo = "በድብቅ በሚስጥር... ቆይ ቆይ 😅";
        const correct = "በውጤታማነታቸው የተረጋገጡትን የዩቲዩብ ቻናሎች (Faceless Channels) ይመልከቱ። ✨";

        setPencilAction('writing');
        for (let i = 1; i <= base1.length; i++) {
          if (isCancelled) return;
          setTypedDesc(base1.slice(0, i));
          await sleep(42 + Math.random() * 18);
        }

        for (let i = 1; i <= typo.length; i++) {
          if (isCancelled) return;
          setTypedDesc(base1 + typo.slice(0, i));
          await sleep(46 + Math.random() * 20);
        }

        setPencilAction('thinking');
        await sleep(950);

        setPencilAction('erasing');
        for (let i = typo.length; i >= 0; i--) {
          if (isCancelled) return;
          setTypedDesc(base1 + typo.slice(0, i));
          await sleep(30);
        }

        await sleep(250);

        setPencilAction('writing');
        for (let i = 1; i <= correct.length; i++) {
          if (isCancelled) return;
          setTypedDesc(base1 + correct.slice(0, i));
          await sleep(42 + Math.random() * 16);
        }

        setPencilAction('paused');
        await sleep(3800);

        setPencilAction('erasing');
        const full1 = base1 + correct;
        for (let i = full1.length; i >= 0; i -= 2) {
          if (isCancelled) return;
          setTypedDesc(full1.slice(0, Math.max(0, i)));
          await sleep(18);
        }
        setTypedDesc('');
        await sleep(350);

        // --- SEQUENCE 2: Inspiring faceless revenue line ---
        const text2 = "ያለምንም የፊት ገጽታ (100% Faceless) በቋሚነት ከፍተኛ ገቢ የሚያስገኙ የቀጥታ ማሳያዎች። 💎";
        setPencilAction('writing');
        for (let i = 1; i <= text2.length; i++) {
          if (isCancelled) return;
          setTypedDesc(text2.slice(0, i));
          await sleep(42 + Math.random() * 15);
        }

        setPencilAction('paused');
        await sleep(3500);

        setPencilAction('erasing');
        for (let i = text2.length; i >= 0; i -= 2) {
          if (isCancelled) return;
          setTypedDesc(text2.slice(0, Math.max(0, i)));
          await sleep(18);
        }
        setTypedDesc('');
        await sleep(350);

        // --- SEQUENCE 3: Practical proof of success ---
        const text3 = "ከዜሮ ተነስተው በዩቲዩብ ስኬታማ መሆን እንደሚቻል በተግባር የሚያሳዩ ቻናሎች! 🚀";
        setPencilAction('writing');
        for (let i = 1; i <= text3.length; i++) {
          if (isCancelled) return;
          setTypedDesc(text3.slice(0, i));
          await sleep(42 + Math.random() * 15);
        }

        setPencilAction('paused');
        await sleep(3500);

        setPencilAction('erasing');
        for (let i = text3.length; i >= 0; i -= 2) {
          if (isCancelled) return;
          setTypedDesc(text3.slice(0, Math.max(0, i)));
          await sleep(18);
        }
        setTypedDesc('');
        await sleep(350);
      }
    };

    typeWriterLoop();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 2. Typewriter Animation for Card Badges
  useEffect(() => {
    let iLocal = 0;
    let iIntl = 0;
    
    const localTimer = setInterval(() => {
      if (iLocal <= localCardTitle.length) {
        setTypedLocalTitle(localCardTitle.slice(0, iLocal));
        iLocal++;
      } else {
        clearInterval(localTimer);
      }
    }, 45);

    const intlTimer = setInterval(() => {
      if (iIntl <= intlCardTitle.length) {
        setTypedIntlTitle(intlCardTitle.slice(0, iIntl));
        iIntl++;
      } else {
        clearInterval(intlTimer);
      }
    }, 45);

    return () => {
      clearInterval(localTimer);
      clearInterval(intlTimer);
    };
  }, []);

  return (
    <section id="instructor-portfolio" className="relative py-16 sm:py-24 overflow-hidden bg-slate-900/60 dark:bg-[#030509]/95 border-b border-gray-200/80 dark:border-white/10">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-[#3268ba]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* SECTION HEADER */}
        <div className="text-center max-w-5xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/35 text-[#f9b03c] text-xs font-black mb-4 shadow-[0_0_20px_rgba(249,176,60,0.25)] animate-pulse">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f9b03c]"></span>
            </span>
            <span className="tracking-wide">✨ 100% FACELESS • በተግባር የተረጋገጠ የስኬት ማረጋገጫ ✨</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-slate-900 dark:text-white mb-4 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-200 to-[#f9b03c] animate-gradient-x drop-shadow-[0_0_25px_rgba(249,176,60,0.45)]">
              የዩቲዩብ
            </span>{' '}
            ቻናል ስኬት በተግባር
          </h2>

          <div className="min-h-[2.5rem] sm:min-h-[2.2rem] flex items-center justify-center">
            <p className="text-sm sm:text-base lg:text-[17px] text-slate-700 dark:text-[#cbd5e1] font-medium leading-relaxed max-w-4xl mx-auto px-2 flex items-center justify-center flex-wrap gap-1.5">
              <span>{typedDesc}</span>
              
              <span className="inline-flex items-center ml-0.5 select-none align-middle">
                {pencilAction === 'erasing' ? (
                  <span className="inline-flex items-center gap-1 text-sm bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    <span className="inline-block text-base animate-bounce">🧹</span>
                    <span className="text-[11px] font-black">በማረም ላይ...</span>
                  </span>
                ) : pencilAction === 'thinking' ? (
                  <span className="inline-flex items-center gap-1 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    <span className="inline-block text-base animate-spin">🤔</span>
                    <span className="text-[11px] font-black">ቆይ ቆይ...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <span className="inline-block text-base sm:text-lg text-[#f9b03c] animate-bounce origin-bottom drop-shadow-[0_0_8px_rgba(249,176,60,0.8)]">
                      ✏️
                    </span>
                    <span className="inline-block w-0.5 h-4 ml-0.5 bg-[#f9b03c] animate-ping"></span>
                  </span>
                )}
              </span>
            </p>
          </div>

          <div className="w-28 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto mt-5 rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)]" />
        </div>

        {/* 2 BORDER-BEAM GLOWING RECTANGULAR CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 sm:gap-8 lg:gap-10">
          
          {/* CARD 1: HAGERIGNA CHANNEL */}
          <div className="relative p-[2px] rounded-2xl sm:rounded-3xl overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(50,104,186,0.35)] flex flex-col">
            <div className="absolute inset-[-200%] animate-border-beam bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#3268ba_320deg,#00f2fe_355deg,#ffffff_360deg)] pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative w-full h-full rounded-[calc(1rem-1px)] sm:rounded-[calc(1.5rem-2px)] bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden z-10">
              
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3268ba] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3268ba] shadow-[0_0_12px_#3268ba]"></span>
                  </span>
                  
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading tracking-wide group-hover:text-[#5a93e8] transition-colors duration-300">
                    {typedLocalTitle || 'ሀገርኛ ቻናል'}
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#3268ba] animate-cursor-blink align-middle"></span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3268ba]/15 border border-[#3268ba]/40 text-[#3268ba] dark:text-[#7bb0ff] text-xs font-black shadow-sm animate-pulse">
                  <i className="fa-solid fa-circle text-[7px] text-red-500 animate-ping"></i>
                  <span>LIVE • FACELESS</span>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                <iframe
                  src={LOCAL_EMBED_URL}
                  title="ሀገርኛ ዩቲዩብ ቻናል"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0 absolute inset-0 z-10"
                />
              </div>

            </div>
          </div>

          {/* CARD 2: INTERNATIONAL CHANNEL */}
          <div className="relative p-[2px] rounded-2xl sm:rounded-3xl overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(249,176,60,0.35)] flex flex-col">
            <div className="absolute inset-[-200%] animate-border-beam bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#f9b03c_320deg,#ffe066_355deg,#ffffff_360deg)] pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative w-full h-full rounded-[calc(1rem-1px)] sm:rounded-[calc(1.5rem-2px)] bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden z-10">
              
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f9b03c] shadow-[0_0_12px_#f9b03c]"></span>
                  </span>
                  
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading tracking-wide group-hover:text-[#f9b03c] transition-colors duration-300">
                    {typedIntlTitle || 'ዓለም አቀፍ ቻናል'}
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#f9b03c] animate-cursor-blink align-middle"></span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-amber-800 dark:text-[#f9b03c] text-xs font-black shadow-sm animate-pulse">
                  <i className="fa-solid fa-bolt text-[8px] text-[#f9b03c] animate-bounce"></i>
                  <span>GLOBAL • REACH</span>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                <iframe
                  src={INTERNATIONAL_EMBED_URL}
                  title="ዓለም አቀፍ ዩቲዩብ ቻናል"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0 absolute inset-0 z-10"
                />
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
