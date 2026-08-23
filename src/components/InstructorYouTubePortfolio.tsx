'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  const matchEmbed = trimmed.match(/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed && matchEmbed[1]) return matchEmbed[1];
  return trimmed;
}

export default function InstructorYouTubePortfolio() {
  // Default fallback YouTube IDs if not configured yet
  const [localVideoUrl, setLocalVideoUrl] = useState('https://www.youtube.com/watch?v=mgdOMtW6J8k');
  const [internationalVideoUrl, setInternationalVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from local storage cache immediately for instantaneous rendering
    try {
      const cached = localStorage.getItem('tsehay_youtube_portfolio_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.localVideoUrl) setLocalVideoUrl(parsed.localVideoUrl);
        if (parsed.internationalVideoUrl) setInternationalVideoUrl(parsed.internationalVideoUrl);
      }
    } catch (e) {}

    // Subscribe to Firestore for real-time portfolio updates
    const portfolioDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'youtube_portfolio');
    const unsubscribe = onSnapshot(portfolioDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          if (data.localVideoUrl) setLocalVideoUrl(data.localVideoUrl);
          if (data.internationalVideoUrl) setInternationalVideoUrl(data.internationalVideoUrl);

          try {
            localStorage.setItem('tsehay_youtube_portfolio_cache', JSON.stringify({
              localVideoUrl: data.localVideoUrl,
              internationalVideoUrl: data.internationalVideoUrl
            }));
          } catch (e) {}
        }
      }
      setIsLoading(false);
    }, (err) => {
      console.warn("YouTube portfolio Firestore sync warning:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const localVideoId = extractYouTubeId(localVideoUrl) || 'mgdOMtW6J8k';
  const internationalVideoId = extractYouTubeId(internationalVideoUrl) || 'dQw4w9WgXcQ';

  // Privacy-friendly clean embed URLs without external distractions
  const localEmbedUrl = `https://www.youtube-nocookie.com/embed/${localVideoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3`;
  const internationalEmbedUrl = `https://www.youtube-nocookie.com/embed/${internationalVideoId}?modestbranding=1&rel=0&controls=1&showinfo=0&iv_load_policy=3`;

  return (
    <section id="instructor-portfolio" className="relative py-20 lg:py-28 overflow-hidden bg-slate-900/60 dark:bg-[#030509]/90 border-b border-gray-200/80 dark:border-white/10 scrolly-reveal">
      
      {/* Cinematic Ambient Glow Gradients */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-[#3268ba]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#f9b03c]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#f9b03c]/10 border border-[#f9b03c]/30 px-4 py-1.5 rounded-full mb-4 shadow-[0_0_15px_rgba(249,176,60,0.15)]">
            <i className="fa-solid fa-briefcase text-[#f9b03c] text-xs"></i>
            <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">የተግባር ማረጋገጫ / Portfolio</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-slate-900 dark:text-white mb-4 tracking-tight">
            <span className="text-[#f9b03c] drop-shadow-[0_0_25px_rgba(249,176,60,0.4)]">
              የአሰልጣኙ የተግባር ስራዎች
            </span>
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-[#a0aec0] font-body leading-relaxed max-w-2xl mx-auto">
            እኛ በተግባር የምናስተዳድራቸውን አትራፊ የዩቲዩብ ቻናሎች ይመልከቱ።
          </p>

          <div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto mt-5 rounded-full shadow-[0_0_10px_rgba(249,176,60,0.5)]" />
        </div>

        {/* 2-Column Responsive Grid with Terafab Glassmorphism Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          
          {/* =========================================================================
              CARD 1: LOCAL YOUTUBE CHANNEL (በአማርኛ)
              ========================================================================= */}
          <div 
            data-scrolly-order="1" 
            className="group relative rounded-3xl p-4 sm:p-6 transition-all duration-500 hover:-translate-y-1.5 scrolly-card scrolly-stagger-1 bg-white/80 dark:bg-white/[0.03] backdrop-blur-[20px] border border-gray-200/90 dark:border-white/10 hover:border-[#3268ba]/60 shadow-xl dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(50,104,186,0.25)]"
          >
            {/* Top Card Header & Royal Blue Badge */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#3268ba] shadow-[0_0_10px_#3268ba]"></span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
                  የሀገር ውስጥ ቻናል
                </span>
              </div>

              {/* Badge: በአማርኛ (Local) in Royal Blue (#3268ba) */}
              <div className="bg-[#3268ba]/15 border border-[#3268ba]/40 text-[#3268ba] dark:text-[#5a93e8] px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(50,104,186,0.2)]">
                <i className="fa-solid fa-earth-africa text-[11px]"></i>
                <span>በአማርኛ (Local)</span>
              </div>
            </div>

            {/* Video Player Wrapper with Privacy Shield */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-black/10 dark:border-white/10 group-hover:border-[#3268ba]/50 transition-colors">
              
              {/* 🛡️ CRITICAL PRIVACY & CLEAN UI SHIELD: Prevents Clicking Video Title Away to YouTube */}
              <div 
                className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-none bg-gradient-to-b from-black/60 to-transparent" 
                aria-hidden="true"
              />

              {/* YouTube Iframe Player */}
              <iframe
                src={localEmbedUrl}
                title="የአማርኛ ዩቲዩብ ፖርትፎሊዮ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0 relative z-10"
              />
            </div>

            {/* Bottom Card Footer */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <i className="fa-brands fa-youtube text-red-500 text-sm"></i>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">የተረጋገጠ አትራፊ ቻናል</span>
              </span>
              <span className="text-[11px] font-mono text-[#3268ba] dark:text-blue-300 font-bold">
                100% Verified Work
              </span>
            </div>
          </div>

          {/* =========================================================================
              CARD 2: INTERNATIONAL YOUTUBE CHANNEL (ዓለም አቀፍ)
              ========================================================================= */}
          <div 
            data-scrolly-order="2" 
            className="group relative rounded-3xl p-4 sm:p-6 transition-all duration-500 hover:-translate-y-1.5 scrolly-card scrolly-stagger-2 bg-white/80 dark:bg-white/[0.03] backdrop-blur-[20px] border border-gray-200/90 dark:border-white/10 hover:border-[#f9b03c]/60 shadow-xl dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(249,176,60,0.25)]"
          >
            {/* Top Card Header & Golden Yellow Badge */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c]"></span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">
                  የውጭ ሀገር ገበያ ቻናል
                </span>
              </div>

              {/* Badge: ዓለም አቀፍ (International) in Golden Yellow (#f9b03c) */}
              <div className="bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-amber-800 dark:text-[#f9b03c] px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,176,60,0.2)]">
                <i className="fa-solid fa-globe text-[11px]"></i>
                <span>ዓለም አቀፍ (International)</span>
              </div>
            </div>

            {/* Video Player Wrapper with Privacy Shield */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-black/10 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition-colors">
              
              {/* 🛡️ CRITICAL PRIVACY & CLEAN UI SHIELD: Prevents Clicking Video Title Away to YouTube */}
              <div 
                className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-none bg-gradient-to-b from-black/60 to-transparent" 
                aria-hidden="true"
              />

              {/* YouTube Iframe Player */}
              <iframe
                src={internationalEmbedUrl}
                title="የዓለም አቀፍ ዩቲዩብ ፖርትፎሊዮ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0 relative z-10"
              />
            </div>

            {/* Bottom Card Footer */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <i className="fa-brands fa-youtube text-red-500 text-sm"></i>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">አለም አቀፍ የገቢ ምንጭ</span>
              </span>
              <span className="text-[11px] font-mono text-amber-700 dark:text-[#f9b03c] font-bold">
                High CPM Channel
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
