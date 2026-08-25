'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';

export default function About() {
  const { t, lang } = useLanguage();

  return (
    <>
      <main className="min-h-screen flex flex-col bg-white dark:bg-[#030509] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
        
        {/* Deep Void Stardust Mesh Background & Ambient Lighting */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-15 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,104,186,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(249,176,60,0.12),transparent_55%)] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-[#3268ba]/15 via-[#f9b03c]/12 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="absolute top-[35%] -left-36 w-[450px] h-[450px] bg-[#3268ba]/12 rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[65%] -right-36 w-[450px] h-[450px] bg-[#f9b03c]/12 rounded-full blur-[160px] pointer-events-none -z-10" />

        <section id="about" className="pt-28 sm:pt-36 pb-24 relative z-10 flex-1">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-24">
            
            {/* Header Title */}
            <div className="text-center">
              <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white mb-4 tracking-tight">
                {t('about_us_page')}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)]" />
            </div>

            {/* =========================================================================
                🌟 ULTRA-MINIMALIST SINGLE-CARD VIDEO PRESENTATION (CLEAN FOCUS)
               ========================================================================= */}
            <div>
              <MinimalistSingleVideoCard />
            </div>

            {/* =========================================================================
                1. OUR STORY (የእኛ ታሪክ) - 4-CORNER SPARKLING BORDER CARD
               ========================================================================= */}
            <div className="max-w-4xl mx-auto">
              <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/40 via-[#3268ba]/40 to-[#f9b03c]/40 rounded-3xl opacity-50 group-hover:opacity-90 transition duration-500 blur-xs" />
                
                {/* 4 Sparkling Corner Flares */}
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#3268ba] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#3268ba] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                
                <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-10 border border-gray-200/80 dark:border-white/10 shadow-2xl">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(249,176,60,0.25)]">
                      <i className="fa-solid fa-book-open-reader"></i>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#f9b03c] tracking-widest uppercase block">ታሪካችን</span>
                      <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white">
                        {t('our_story_title')}
                      </h2>
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-slate-300 font-body leading-relaxed text-base sm:text-[17px] mb-4">
                    {t('our_story_p1')}
                  </p>
                  
                  <p className="text-gray-700 dark:text-slate-300 font-body leading-relaxed text-base sm:text-[17px] mb-8">
                    {t('our_story_p2')}
                  </p>

                  {/* Stats Pill Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:border-[#f9b03c]/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-graduation-cap text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">500+</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_students')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:border-[#3268ba]/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-[#3268ba]/15 text-[#5a93e8] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-laptop-code text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">100%</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_practical')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 hover:border-emerald-500/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-brain text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">24/7</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_ai')}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* =========================================================================
                2. MISSION (ተልዕኳችን) - 4-CORNER SPARKLING LUXURY CARD
               ========================================================================= */}
            <div className="max-w-4xl mx-auto">
              <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/50 via-[#ffe066]/30 to-[#3268ba]/50 rounded-3xl opacity-50 group-hover:opacity-90 transition duration-500 blur-xs" />
                
                {/* 4 Sparkling Corner Flares */}
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#3268ba] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />

                <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 sm:p-12 text-center shadow-2xl">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-4 shadow-[0_0_25px_rgba(249,176,60,0.25)] group-hover:scale-110 transition duration-300">
                    <i className="fa-solid fa-bullseye"></i>
                  </div>
                  
                  <span className="text-xs font-bold text-[#f9b03c] tracking-widest uppercase block mb-1">ራዕይ እና ዓላማ</span>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 dark:text-white mb-4">
                    {t('mission_title')}
                  </h2>

                  <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-200 leading-relaxed max-w-2xl mx-auto">
                    {t('mission_desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                3. WHY TSEHAY CAMPUS (ለምን ፀሐይ ካምፓስ?) - 3 SPARKLING PILLAR CARDS
               ========================================================================= */}
            <div>
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3">
                  <i className="fa-solid fa-star text-[10px]"></i>
                  <span>ልዩ ጥንካሬዎች</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 dark:text-white">
                  {t('what_we_do_title')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                
                {/* Pillar 1 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(249,176,60,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-chart-line"></i>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-3 font-heading leading-snug">{t('wwd_1_title')}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{t('wwd_1_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#3268ba]/50 transition duration-500 shadow-xl">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(50,104,186,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-people-group"></i>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-3 font-heading leading-snug">{t('wwd_2_title')}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{t('wwd_2_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(249,176,60,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-3 font-heading leading-snug">{t('wwd_3_title')}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{t('wwd_3_desc')}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                4. OUR TEAM (የፀሐይ ካምፓስ ቡድኖች) - SPARKLING CORNER PROFILE CARDS
               ========================================================================= */}
            <div>
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3">
                  <i className="fa-solid fa-users text-[10px]"></i>
                  <span>የአመራር ቡድን</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 dark:text-white">
                  {t('our_team_title')}
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
                
                {/* Eyoub Sahle */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 text-center border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/40 shadow-xl flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full overflow-hidden mb-5 bg-gray-100 dark:bg-gray-800 border-3 border-[#f9b03c]/40 shadow-[0_0_25px_rgba(249,176,60,0.35)] group-hover:scale-105 transition duration-300">
                      <img 
                        src="/assets/eyob_white.jpg" 
                        alt="Eyoub Sahle" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Eyoub+Sahle&background=000000&color=fff&size=160'; }} 
                      />
                    </div>
                    
                    <h3 className="font-black text-slate-900 dark:text-white text-xl mb-1.5 notranslate whitespace-nowrap">
                      ኢዮብ ሳህሌ (Eyoub Sahle)
                    </h3>
                    <p className="text-xs text-[#f9b03c] font-black uppercase tracking-wider">ባለቤት እና ዋና አሰልጣኝ</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">Owner & Lead Instructor</p>
                  </div>
                </div>

                {/* Ribka Teshome */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 text-center border border-gray-100 dark:border-white/10 group-hover:border-[#3268ba]/40 shadow-xl flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full overflow-hidden mb-5 bg-gray-100 dark:bg-gray-800 border-3 border-[#3268ba]/40 shadow-[0_0_25px_rgba(50,104,186,0.35)] group-hover:scale-105 transition duration-300">
                      <img 
                        src="/assets/ribka2.jpg" 
                        alt="Ribka Teshome" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Ribka+Teshome&background=000000&color=fff&size=160'; }} 
                      />
                    </div>
                    
                    <h3 className="font-black text-slate-900 dark:text-white text-xl mb-1.5 notranslate whitespace-nowrap">
                      ርብቃ ተሾመ (Ribka Teshome)
                    </h3>
                    <p className="text-xs text-[#3268ba] dark:text-[#5a93e8] font-black uppercase tracking-wider">ዋና ስራ አስኪያጅ</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">General Manager</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// =========================================================================
// 🌟 ULTRA-MINIMALIST SINGLE-CARD VIDEO COMPONENT (CLEAN GLASSMORPHISM FOCUS)
// =========================================================================
function MinimalistSingleVideoCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [videoData, setVideoData] = useState<{ videoUrl: string; title: string; thumbnail: string }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_about_video_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && (parsed.videoUrl || parsed.thumbnail)) {
            return {
              videoUrl: parsed.videoUrl || 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
              title: parsed.title || 'ስለ ፀሐይ ካምፓስ',
              thumbnail: parsed.thumbnail || '/assets/about_video_cover.jpg'
            };
          }
        }
      } catch (e) {}
    }
    return {
      videoUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
      title: 'ስለ ፀሐይ ካምፓስ',
      thumbnail: '/assets/about_video_cover.jpg'
    };
  });

  // ScrollTrigger / Intersection Observer for smooth entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Real-time Firestore sync
  useEffect(() => {
    try {
      const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'site_settings', 'about_video');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data) {
            const nextData = {
              videoUrl: data.videoUrl || 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
              title: data.title || 'ስለ ፀሐይ ካምፓስ',
              thumbnail: data.thumbnail || '/assets/about_video_cover.jpg'
            };
            setVideoData(nextData);
            try {
              localStorage.setItem('tsehay_about_video_cache', JSON.stringify(nextData));
            } catch (e) {}
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About video listener error:", e);
    }
  }, []);

  const parsed = parseVideoEmbedUrl(videoData.videoUrl, true);
  const customThumb = videoData.thumbnail?.trim();
  const activeThumbnail = customThumb 
    ? parseImageUrl(customThumb) 
    : '/assets/about_video_cover.jpg';

  return (
    <div className="flex justify-center items-center py-4 sm:py-8 select-none">
      
      {/* 🌟 Single Focused Glassmorphism Card */}
      <div 
        ref={cardRef}
        className={`relative w-full max-w-4xl rounded-[20px] overflow-hidden group cursor-pointer transition-all duration-700 ease-out hover:-translate-y-1 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
        }}
      >
        {/* Subtle Golden Yellow Pulsing Glow */}
        <div className="absolute inset-0 rounded-[20px] shadow-[0_0_35px_rgba(249,176,60,0.22)] group-hover:shadow-[0_0_55px_rgba(249,176,60,0.4)] transition-shadow duration-500 pointer-events-none" />

        {/* Video Player & Large Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
          {!isPlaying ? (
            <div 
              onClick={() => {
                if (videoData.videoUrl) setIsPlaying(true);
              }}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && videoData.videoUrl) setIsPlaying(true); }}
              aria-label="Play video"
            >
              {/* Large Clear Thumbnail */}
              <img 
                src={activeThumbnail} 
                alt="Tsehay Campus Video" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => { 
                  (e.target as HTMLImageElement).src = '/assets/about_video_cover.jpg'; 
                }}
              />

              {/* Gentle Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 group-hover:bg-black/20 transition-colors duration-500 pointer-events-none" />

              {/* Centered Golden Yellow Play Button */}
              <div className="relative z-20 flex items-center justify-center pointer-events-none">
                <span className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#f9b03c]/35 animate-ping pointer-events-none"></span>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_40px_rgba(249,176,60,0.85)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(249,176,60,1)] transition-all duration-300">
                  <i className="fa-solid fa-play ml-1.5"></i>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full z-10">
              {parsed.type === 'video' ? (
                <video 
                  id="about-html5-player"
                  className="w-full h-full object-cover" 
                  src={parsed.src}
                  autoPlay
                  controls
                  preload="auto"
                  playsInline
                  webkit-playsinline="true"
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <iframe 
                  id="about-youtube-player" 
                  className="w-full h-full" 
                  src={parsed.src}
                  title={videoData.title || "Tsehay Campus Presentation"} 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                  allowFullScreen
                  loading="eager"
                ></iframe>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
