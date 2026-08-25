'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();
  if (!trimmed) return '';
  
  // Direct 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  
  // Standard watch URL (e.g. youtube.com/watch?v=...)
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  
  // youtu.be/ID
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  
  // Embed, Shorts, Live, or v URL
  const matchPath = trimmed.match(/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/i);
  if (matchPath && matchPath[1]) return matchPath[1];
  
  // Generic extraction fallback
  const matchAny11 = trimmed.match(/(?:[=/&?]|^)([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
  if (matchAny11 && matchAny11[1]) return matchAny11[1];
  
  return trimmed;
}

export const DEFAULT_PORTFOLIO_LOCAL = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';
export const DEFAULT_PORTFOLIO_INTL = 'https://www.youtube.com/watch?v=B-s71n0dHUk';

export default function InstructorYouTubePortfolio() {
  // Synchronously initialize with cached settings or verified portfolio videos
  const [localVideoUrl, setLocalVideoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_portfolio_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.localVideoUrl && typeof parsed.localVideoUrl === 'string' && parsed.localVideoUrl.trim()) {
            return parsed.localVideoUrl.trim();
          }
        }
      } catch (e) {}
    }
    return DEFAULT_PORTFOLIO_LOCAL;
  });

  const [internationalVideoUrl, setInternationalVideoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_portfolio_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.internationalVideoUrl && typeof parsed.internationalVideoUrl === 'string' && parsed.internationalVideoUrl.trim()) {
            return parsed.internationalVideoUrl.trim();
          }
        }
      } catch (e) {}
    }
    return DEFAULT_PORTFOLIO_INTL;
  });

  // Modal Cinema Player State
  const [activeModalVideo, setActiveModalVideo] = useState<{ id: string; title: string; url: string } | null>(null);

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

  // 3. Robust Real-time Firestore & Admin Sync (Works like Free YouTube Videos slider)
  useEffect(() => {
    let isMounted = true;

    // A. Fetch once from Firestore / API
    const fetchPortfolio = async () => {
      try {
        let fetchedLocal = '';
        let fetchedIntl = '';

        try {
          const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'youtube_portfolio');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data?.localVideoUrl) fetchedLocal = data.localVideoUrl.trim();
            if (data?.internationalVideoUrl) fetchedIntl = data.internationalVideoUrl.trim();
          }
        } catch (e) {}

        if (!fetchedLocal || !fetchedIntl) {
          try {
            const rootRef = doc(db, 'site_settings', 'youtube_portfolio');
            const rootSnap = await getDoc(rootRef);
            if (rootSnap.exists()) {
              const rData = rootSnap.data();
              if (rData?.localVideoUrl && !fetchedLocal) fetchedLocal = rData.localVideoUrl.trim();
              if (rData?.internationalVideoUrl && !fetchedIntl) fetchedIntl = rData.internationalVideoUrl.trim();
            }
          } catch (e) {}
        }

        if (isMounted) {
          if (fetchedLocal) setLocalVideoUrl(fetchedLocal);
          if (fetchedIntl) setInternationalVideoUrl(fetchedIntl);
        }
      } catch (err) {}
    };

    fetchPortfolio();

    // B. Real-time Firestore onSnapshot listener
    let unsubscribe = () => {};
    try {
      const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'youtube_portfolio');
      unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data?.localVideoUrl) setLocalVideoUrl(data.localVideoUrl.trim());
          if (data?.internationalVideoUrl) setInternationalVideoUrl(data.internationalVideoUrl.trim());
          try {
            localStorage.setItem('tsehay_youtube_portfolio_cache', JSON.stringify({
              localVideoUrl: data.localVideoUrl || DEFAULT_PORTFOLIO_LOCAL,
              internationalVideoUrl: data.internationalVideoUrl || DEFAULT_PORTFOLIO_INTL
            }));
          } catch (e) {}
        }
      });
    } catch (e) {}

    // C. Listen for admin live updates across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tsehay_youtube_portfolio_cache' && e.newValue && isMounted) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.localVideoUrl) setLocalVideoUrl(parsed.localVideoUrl);
          if (parsed?.internationalVideoUrl) setInternationalVideoUrl(parsed.internationalVideoUrl);
        } catch (err) {}
      }
    };

    const handleCustom = (e: any) => {
      if (e.detail && isMounted) {
        if (e.detail.localVideoUrl) setLocalVideoUrl(e.detail.localVideoUrl);
        if (e.detail.internationalVideoUrl) setInternationalVideoUrl(e.detail.internationalVideoUrl);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('tsehay_portfolio_updated', handleCustom);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tsehay_portfolio_updated', handleCustom);
    };
  }, []);

  const localId = extractYouTubeId(localVideoUrl) || 'mgdOMtW6J8k';
  const intlId = extractYouTubeId(internationalVideoUrl) || 'B-s71n0dHUk';

  const localThumb = `https://img.youtube.com/vi/${localId}/hqdefault.jpg`;
  const intlThumb = `https://img.youtube.com/vi/${intlId}/hqdefault.jpg`;

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

              {/* Clickable Card Video Thumbnail */}
              <div 
                onClick={() => {
                  setActiveModalVideo({
                    id: localId,
                    title: 'ሀገርኛ የዩቲዩብ ቻናል (Domestic Portfolio)',
                    url: `https://www.youtube.com/watch?v=${localId}`
                  });
                }}
                className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center group/thumb cursor-pointer select-none"
                title="ቪዲዮውን ለማጫወት ይጫኑ (Click to Play)"
              >
                <img
                  src={localThumb}
                  alt="ሀገርኛ ዩቲዩብ ቻናል"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/hero-bg-new.jpg';
                  }}
                />

                <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#3268ba]/40 animate-ping pointer-events-none"></span>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#3268ba] via-blue-500 to-cyan-400 text-white flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_35px_rgba(50,104,186,0.85)] group-hover/thumb:scale-110 transition-all duration-300">
                      <i className="fa-solid fa-play ml-1"></i>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 shadow-lg group-hover/thumb:border-[#5a93e8] group-hover/thumb:text-[#5a93e8] transition-colors">
                  <i className="fa-brands fa-youtube text-red-500 text-sm"></i>
                  <span>በቀጥታ ይመልከቱ</span>
                </div>
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

              {/* Clickable Card Video Thumbnail */}
              <div 
                onClick={() => {
                  setActiveModalVideo({
                    id: intlId,
                    title: 'ዓለም አቀፍ የዩቲዩብ ቻናል (International Portfolio)',
                    url: `https://www.youtube.com/watch?v=${intlId}`
                  });
                }}
                className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center group/thumb cursor-pointer select-none"
                title="ቪዲዮውን ለማጫወት ይጫኑ (Click to Play)"
              >
                <img
                  src={intlThumb}
                  alt="ዓለም አቀፍ ዩቲዩብ ቻናል"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/hero-bg-new.jpg';
                  }}
                />

                <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#f9b03c]/40 animate-ping pointer-events-none"></span>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_35px_rgba(249,176,60,0.85)] group-hover/thumb:scale-110 transition-all duration-300">
                      <i className="fa-solid fa-play ml-1"></i>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1.5 shadow-lg group-hover/thumb:border-[#f9b03c]/60 group-hover/thumb:text-[#f9b03c] transition-colors">
                  <i className="fa-brands fa-youtube text-red-500 text-sm"></i>
                  <span>በቀጥታ ይመልከቱ</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          HIGH-DEFINITION CINEMA MODAL PLAYER (MATCHES FREE YOUTUBE VIDEOS SLIDER)
         ========================================================================= */}
      {activeModalVideo && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
          onClick={() => setActiveModalVideo(null)}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModalVideo(null);
            }}
            className="fixed top-4 right-4 sm:top-6 sm:right-8 z-50 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all duration-300 border border-white/20 hover:scale-110 shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-md cursor-pointer"
            title="ዝጋ (Close)"
            aria-label="Close video player"
          >
            <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
          </button>

          {/* Pure Cinema Video Frame */}
          <div
            className="relative w-full max-w-5xl aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.95),0_0_40px_rgba(249,176,60,0.25)] border border-white/15 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${activeModalVideo.id}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1`}
              title={activeModalVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

    </section>
  );
}
