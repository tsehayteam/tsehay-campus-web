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

const DEFAULT_LOCAL_URL = 'https://www.youtube.com/watch?v=mgdOMtW6J8k';
const DEFAULT_INTERNATIONAL_URL = 'https://www.youtube.com/watch?v=B-s71n0dHUk';

export default function InstructorYouTubePortfolio() {
  // Synchronously initialize from local storage cache or defaults
  const [localVideoUrl, setLocalVideoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_portfolio_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.localVideoUrl) return parsed.localVideoUrl;
        }
      } catch (e) {}
    }
    return DEFAULT_LOCAL_URL;
  });

  const [internationalVideoUrl, setInternationalVideoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_portfolio_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.internationalVideoUrl) return parsed.internationalVideoUrl;
        }
      } catch (e) {}
    }
    return DEFAULT_INTERNATIONAL_URL;
  });

  useEffect(() => {
    // 1. Fetch from Server Admin API (Guaranteed latest updated state)
    const fetchApiSettings = async () => {
      try {
        const res = await fetch('/api/admin/site-settings?settingKey=youtube_portfolio');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            if (json.data.localVideoUrl) setLocalVideoUrl(json.data.localVideoUrl);
            if (json.data.internationalVideoUrl) setInternationalVideoUrl(json.data.internationalVideoUrl);

            try {
              localStorage.setItem('tsehay_youtube_portfolio_cache', JSON.stringify({
                localVideoUrl: json.data.localVideoUrl || DEFAULT_LOCAL_URL,
                internationalVideoUrl: json.data.internationalVideoUrl || DEFAULT_INTERNATIONAL_URL
              }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("API site-settings fetch fallback:", err);
      }
    };
    fetchApiSettings();

    // 2. Real-time Firestore sync for instantaneous updates (Multi-path listener)
    const portfolioDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'youtube_portfolio');
    const unsubscribe1 = onSnapshot(portfolioDocRef, (docSnap) => {
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
    }, (err) => {
      console.warn("YouTube portfolio nested Firestore sync warning:", err);
    });

    const rootDocRef = doc(db, 'site_settings', 'youtube_portfolio');
    const unsubscribe2 = onSnapshot(rootDocRef, (docSnap) => {
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
    }, (err) => {
      console.warn("YouTube portfolio root Firestore sync warning:", err);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, []);

  const localVideoId = extractYouTubeId(localVideoUrl) || 'mgdOMtW6J8k';
  const internationalVideoId = extractYouTubeId(internationalVideoUrl) || 'B-s71n0dHUk';

  const localEmbedUrl = `https://www.youtube-nocookie.com/embed/${localVideoId}?rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&cc_load_policy=0&playsinline=1`;
  const internationalEmbedUrl = `https://www.youtube-nocookie.com/embed/${internationalVideoId}?rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&loop=1&playlist=${internationalVideoId}`;

  return (
    <section id="instructor-portfolio" className="relative py-16 sm:py-24 overflow-hidden bg-slate-900/60 dark:bg-[#030509]/90 border-b border-gray-200/80 dark:border-white/10">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-[#3268ba]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#f9b03c]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-slate-900 dark:text-white mb-4 tracking-tight">
            <span className="text-[#f9b03c] drop-shadow-[0_0_25px_rgba(249,176,60,0.4)]">
              የዩቲዩብ
            </span>{' '}
            ቻናል ስኬት በተግባር
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-[#a0aec0] font-body leading-relaxed max-w-2xl mx-auto">
            እኛ በተግባር የምናስተዳድራቸውንና በውጤታማነታቸው የተረጋገጡትን የዩቲዩብ ቻናሎች (Faceless Channels) ይመልከቱ።
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto mt-5 rounded-full shadow-[0_0_10px_rgba(249,176,60,0.5)]" />
        </div>

        {/* 2 Clean Edge-to-Edge Balanced Video Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          
          {/* =========================================================================
              CARD 1: HAGERIGNA CHANNEL (ሀገርኛ ቻናል)
              ========================================================================= */}
          <div 
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 hover:border-[#3268ba] shadow-lg hover:shadow-[0_20px_45px_rgba(50,104,186,0.35)] flex flex-col justify-between"
          >
            {/* Top Bar Label */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#3268ba] shadow-[0_0_10px_#3268ba] group-hover:scale-125 transition-transform duration-300"></span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading tracking-wide group-hover:text-[#5a93e8] transition-colors duration-300">
                  ሀገርኛ ቻናል
                </span>
              </div>
            </div>

            {/* Direct 100% Embedded YouTube Player */}
            <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
              <iframe
                src={localEmbedUrl}
                title="ሀገርኛ ዩቲዩብ ቻናል"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                loading="lazy"
                className="w-full h-full border-0 absolute inset-0 z-10"
              />
            </div>
          </div>

          {/* =========================================================================
              CARD 2: INTERNATIONAL CHANNEL (ዓለም አቀፍ ቻናል)
              ========================================================================= */}
          <div 
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-2xl border border-gray-200/90 dark:border-white/10 hover:border-[#f9b03c] shadow-lg hover:shadow-[0_20px_45px_rgba(249,176,60,0.35)] flex flex-col justify-between"
          >
            {/* Top Bar Label */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] group-hover:scale-125 transition-transform duration-300"></span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading tracking-wide group-hover:text-[#f9b03c] transition-colors duration-300">
                  ዓለም አቀፍ ቻናል
                </span>
              </div>
            </div>

            {/* Direct 100% Embedded YouTube Player */}
            <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
              <iframe
                src={internationalEmbedUrl}
                title="ዓለም አቀፍ ዩቲዩብ ቻናል"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                loading="lazy"
                className="w-full h-full border-0 absolute inset-0 z-10"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
