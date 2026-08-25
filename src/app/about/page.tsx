'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';

export default function About() {
  const { t, lang } = useLanguage();

  return (
    <>
      <main className="min-h-screen flex flex-col bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
        
        {/* Subtle 3D Stardust Mesh Background & Ambient Lighting (Matching Landing Page) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-15 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,104,186,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(249,176,60,0.12),transparent_50%)] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-[#3268ba]/15 via-[#f9b03c]/12 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="absolute top-[35%] -left-36 w-[450px] h-[450px] bg-[#3268ba]/12 rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[65%] -right-36 w-[450px] h-[450px] bg-[#f9b03c]/12 rounded-full blur-[160px] pointer-events-none -z-10" />

        <section id="about" className="pt-28 sm:pt-36 pb-24 relative z-10 flex-1">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
            
            {/* Header Title */}
            <div className="text-center">
              <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white mb-4 tracking-tight">
                {t('about_us_page')}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)]" />
            </div>

            {/* Main Video Presentation */}
            <div>
              <AboutHeroPlayer />
            </div>

            {/* =========================================================================
                1. OUR STORY (የእኛ ታሪክ) - ELEGANT CARD WITH ANIMATED ACCENTS
               ========================================================================= */}
            <div className="max-w-4xl mx-auto">
              <div className="relative p-[1px] rounded-3xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/30 via-[#3268ba]/30 to-[#f9b03c]/30 rounded-3xl opacity-50 group-hover:opacity-100 transition duration-500 blur-sm" />
                
                <div className="relative rounded-[23px] bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-10 border border-gray-200/80 dark:border-white/10 shadow-xl">
                  
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
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-graduation-cap text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">500+</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_students')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-[#3268ba]/15 text-[#5a93e8] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-laptop-code text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">100%</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_practical')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
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
                2. MISSION (ተልዕኳችን) - CLEAN STATIC LUXURY CARD (SPINNING BEAM REMOVED)
               ========================================================================= */}
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden group text-center border-2 border-[#f9b03c]/35 dark:border-[#f9b03c]/30 shadow-[0_0_35px_rgba(249,176,60,0.12)]">
                
                {/* Subtle static ambient glow behind card */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/10 via-transparent to-[#3268ba]/10 pointer-events-none" />

                <div className="relative rounded-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 sm:p-12">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-4 shadow-[0_0_25px_rgba(249,176,60,0.25)]">
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
                3. WHY TSEHAY CAMPUS (ለምን ፀሐይ ካምፓስ?) - 3 INTERACTIVE PILLAR CARDS
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
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/40 transition duration-500 shadow-md group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/15">
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
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#3268ba]/40 transition duration-500 shadow-md group-hover:shadow-2xl group-hover:shadow-[#3268ba]/15">
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
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2.5 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/40 transition duration-500 shadow-md group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/15">
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
                4. OUR TEAM (የፀሐይ ካምፓስ ቡድኖች) - WIDE CLEAN SINGLE-LINE CARDS
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
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2.5 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500" />
                  
                  <div className="relative rounded-[23px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 text-center border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/40 shadow-xl flex flex-col items-center">
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
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2.5 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/40 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500" />
                  
                  <div className="relative rounded-[23px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 text-center border border-gray-100 dark:border-white/10 group-hover:border-[#3268ba]/40 shadow-xl flex flex-col items-center">
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

            {/* =========================================================================
                5. REELS & PHOTOS (የካምፓሳችን አጫጭር ቪዲዮዎች እና ምስሎች) - INTERACTIVE CAROUSELS
               ========================================================================= */}
            <div className="space-y-16">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3">
                  <i className="fa-solid fa-film text-[10px]"></i>
                  <span>ቅንጭብ ማሳያዎች</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 dark:text-white">
                  የካምፓሳችን አጫጭር ቪዲዮዎች እና ምስሎች
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  ከተግባራዊ እንቅስቃሴዎቻችን እና ከስልጠና ክፍለ-ጊዜዎቻችን የተወሰዱ
                </p>
              </div>

              {/* A. Interactive Short Videos (Reels) Slider */}
              <AboutReelsSlider />

              {/* B. Interactive Campus Moments Photo Slider */}
              <AboutPhotosSlider />
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// =========================================================================
// 🌟 DYNAMIC HERO VIDEO PLAYER WITH ROTATING LIGHT BEAM & INSTANT THUMBNAIL
// =========================================================================
function AboutHeroPlayer() {
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
  const [isPlaying, setIsPlaying] = useState(false);

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
      }, (err) => {
        console.warn("About video listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About video listener setup error:", e);
    }
  }, []);

  const parsed = parseVideoEmbedUrl(videoData.videoUrl, true);
  const customThumb = videoData.thumbnail?.trim();
  
  const activeThumbnail = customThumb 
    ? parseImageUrl(customThumb) 
    : '/assets/about_video_cover.jpg';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative rounded-[2.5rem] p-[2px] overflow-hidden group shadow-2xl">
        
        {/* Animated Rotating Light Beam Frame (ጨረር ፍሬም) */}
        <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#f9b03c_320deg,#ffe066_355deg,#ffffff_360deg)] animate-border-beam opacity-85 group-hover:opacity-100 pointer-events-none" />

        <div className="relative rounded-[calc(2.5rem-2px)] overflow-hidden bg-black aspect-video flex items-center justify-center">
          {!isPlaying ? (
            <div 
              onClick={() => {
                if (videoData.videoUrl) setIsPlaying(true);
              }}
              className="absolute inset-0 w-full h-full z-10 cursor-pointer overflow-hidden select-none flex items-center justify-center"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && videoData.videoUrl) setIsPlaying(true); }}
              aria-label="ቪዲዮውን ለማጫወት ይጫኑ"
            >
              <img 
                src={activeThumbnail} 
                alt="Tsehay Campus Video" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => { 
                  (e.target as HTMLImageElement).src = '/assets/about_video_cover.jpg'; 
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 group-hover:bg-black/10 transition-colors duration-500"></div>

              {/* Glowing Interactive Play Button */}
              <div className="relative z-20 flex items-center justify-center pointer-events-none">
                <span className="absolute w-24 h-24 rounded-full bg-[#f9b03c]/40 animate-ping pointer-events-none"></span>
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_40px_rgba(249,176,60,0.75)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(249,176,60,0.95)] transition-all duration-300">
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
                  title={videoData.title || "Tsehay Campus Introduction"} 
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

// =========================================================================
// 🌟 INTERACTIVE SHORT VIDEOS / REELS SLIDER (YOUTUBE-STYLE NEXT/PREV CAROUSEL)
// =========================================================================
interface ReelItem {
  id: string;
  title: string;
  tag: string;
  src: string;
  thumbnail?: string;
}

const DEFAULT_REELS: ReelItem[] = [
  { 
    id: 'reel-1', 
    title: 'ስለ ፀሐይ ካምፓስ አጠቃላይ እንቅስቃሴ', 
    tag: 'Tsehay Campus Live',
    src: '/assets/videos/Tsehay.mp4',
    thumbnail: '/assets/about_video_cover.jpg'
  },
  { 
    id: 'reel-2', 
    title: 'የዲጂታል ማርኬቲንግ እና ስነ-ልቦና ተግባራዊ ስልጠና', 
    tag: 'Marketing & Psychology',
    src: '/assets/videos/Marketing%20and%20psyco.mp4',
    thumbnail: '/assets/hero-bg-new.jpg'
  },
  {
    id: 'reel-3',
    title: 'ተግባራዊ የቲክቶክ እና የኢኮሜርስ ገቢ ማግኛ ማስተርክላስ',
    tag: 'TikTok & E-Commerce',
    src: '/assets/videos/Tsehay.mp4',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg'
  },
  {
    id: 'reel-4',
    title: 'የስኬት ጉዞ እና የተማሪዎች የፈጠራ ስራዎች ማሳያ',
    tag: 'Student Projects',
    src: '/assets/videos/Marketing%20and%20psyco.mp4',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg'
  }
];

function AboutReelsSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reels, setReels] = useState<ReelItem[]>(DEFAULT_REELS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Sync real-time dynamic reels from Firestore if available
  useEffect(() => {
    try {
      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'about_reels'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: ReelItem[] = snapshot.docs.map((d) => ({
            id: d.id,
            title: d.data().title || 'Tsehay Reel',
            tag: d.data().tag || 'Reels',
            src: d.data().src || d.data().videoUrl || '/assets/videos/Tsehay.mp4',
            thumbnail: d.data().thumbnail || '/assets/about_video_cover.jpg'
          }));
          setReels(list);
        }
      }, (err) => {
        console.warn("About reels listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About reels setup error:", e);
    }
  }, []);

  const scrollToIndex = (index: number) => {
    const nextIdx = Math.max(0, Math.min(index, reels.length - 1));
    setCurrentIndex(nextIdx);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const child = container.children[nextIdx] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const handlePrev = () => {
    scrollToIndex(currentIndex === 0 ? reels.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex === reels.length - 1 ? 0 : currentIndex + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Header & Controls Toolbar */}
      <div className="flex items-center justify-between mb-5 px-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-sm shadow-[0_0_12px_rgba(249,176,60,0.25)]">
            <i className="fa-solid fa-clapperboard"></i>
          </div>
          <div>
            <span className="text-xs font-black text-[#f9b03c] uppercase tracking-wider block">
              አጫጭር ቪዲዮዎች (Short Video Highlights)
            </span>
            <span className="text-[11px] text-gray-400 font-bold">
              {currentIndex + 1} / {reels.length} ቪዲዮዎች
            </span>
          </div>
        </div>

        {/* Next / Prev Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 hover:bg-[#f9b03c] hover:text-slate-950 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer active:scale-90 hover:shadow-[0_0_20px_rgba(249,176,60,0.4)]"
            title="ወደ ኋላ (Previous Video)"
            aria-label="Previous Video"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#f9b03c]/25 cursor-pointer active:scale-90 hover:shadow-[0_0_25px_rgba(249,176,60,0.6)]"
            title="ቀጣይ ቪዲዮ (Next Video)"
            aria-label="Next Video"
          >
            <i className="fa-solid fa-chevron-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Container */}
      <div 
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-4 px-2"
      >
        {reels.map((reel, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div 
              key={reel.id} 
              className={`snap-center shrink-0 w-[270px] sm:w-[310px] transition-all duration-500 ${
                isActive ? 'scale-100 opacity-100 z-10' : 'scale-[0.97] opacity-85 hover:opacity-100'
              }`}
              onClick={() => setCurrentIndex(idx)}
            >
              <AboutShortVideo 
                src={reel.src} 
                title={reel.title} 
                tag={reel.tag} 
                isActive={isActive} 
              />
            </div>
          );
        })}
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4">
        {reels.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              i === currentIndex 
                ? 'w-7 bg-[#f9b03c] shadow-[0_0_10px_#f9b03c]' 
                : 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/40'
            }`}
            aria-label={`Go to video ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 CLEAN VERTICAL REEL COMPONENT WITH INTERACTIVE PLAYER & TITLE
// =========================================================================
function AboutShortVideo({ src, title, tag, isActive }: { src: string; title: string; tag: string; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handlePauseOthers = (e: any) => {
      if (e.detail?.id !== src && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener('tsehay_pause_other_videos', handlePauseOthers);
    return () => window.removeEventListener('tsehay_pause_other_videos', handlePauseOthers);
  }, [src]);

  // Pause video if user slides away from this item
  useEffect(() => {
    if (!isActive && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      window.dispatchEvent(new CustomEvent('tsehay_pause_other_videos', { detail: { id: src } }));
      video.muted = false;
      video.volume = 1.0;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        video.muted = true;
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={togglePlayPause}
      className={`rounded-3xl overflow-hidden shadow-2xl group aspect-[9/16] bg-slate-950 relative cursor-pointer select-none border transition-all duration-300 ${
        isActive 
          ? 'border-[#f9b03c]/60 shadow-[0_0_35px_rgba(249,176,60,0.25)]' 
          : 'border-gray-200 dark:border-white/10'
      }`}
      title={isPlaying ? "ለማቆም ይጫኑ (Click to Pause)" : "ለማጫወት ይጫኑ (Click to Play)"}
    >
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload noremoteplayback"
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
          }
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Gradient Vignette Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/40 pointer-events-none"></div>

      {/* Top Tag */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/60 text-[#f9b03c] border border-[#f9b03c]/30 backdrop-blur-md">
          {tag}
        </span>
        <div className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center text-[10px]">
          <i className="fa-solid fa-volume-high"></i>
        </div>
      </div>

      {/* Bottom Title Info */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none space-y-1">
        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
          {title}
        </h4>
        <p className="text-[11px] text-[#f9b03c] font-semibold flex items-center gap-1.5">
          <i className="fa-solid fa-play text-[8px]"></i>
          <span>{isPlaying ? 'በመጫወት ላይ...' : 'ለማጫወት ይጫኑ'}</span>
        </p>
      </div>

      {/* Play / Pause Animated Center Icon */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 transform ${
        isPlaying 
          ? 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100' 
          : 'opacity-100 scale-100'
      }`}>
        <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(249,176,60,0.6)] backdrop-blur-md transition-all duration-300 ${
          isPlaying 
            ? 'bg-black/75 border-2 border-[#f9b03c] text-[#f9b03c]' 
            : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 group-hover:scale-110 shadow-[0_0_40px_rgba(249,176,60,0.8)]'
        }`}>
          {isPlaying ? (
            <i className="fa-solid fa-pause text-2xl"></i>
          ) : (
            <i className="fa-solid fa-play text-2xl ml-1"></i>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 INTERACTIVE CAMPUS PHOTOS SLIDER (YOUTUBE-STYLE NEXT/PREV CAROUSEL)
// =========================================================================
interface PhotoItem {
  id: string;
  src: string;
  title: string;
  tag: string;
}

const DEFAULT_PHOTOS: PhotoItem[] = [
  { 
    id: 'p1', 
    src: 'https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg', 
    title: 'የተግባር ስልጠና ክፍለ-ጊዜ በካምፓሳችን', 
    tag: 'Hands-on Workshop' 
  },
  { 
    id: 'p2', 
    src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop', 
    title: 'የተማሪዎች የቡድን ውይይት እና የፕሮጀክት ስራ', 
    tag: 'Collaborative Projects' 
  },
  { 
    id: 'p3', 
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop', 
    title: 'የሰርተፊኬት አሰጣጥ እና የስኬት በዓል', 
    tag: 'Graduation & Awards' 
  },
  { 
    id: 'p4', 
    src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop', 
    title: 'ዘመናዊ የቴክኖሎጂ እና የ AI መማሪያ ማዕከል', 
    tag: 'Tech Hub' 
  },
  { 
    id: 'p5', 
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop', 
    title: 'ከባለሙያዎች ጋር የሚደረግ የተግባር ምክክር', 
    tag: 'Mentorship Session' 
  }
];

function AboutPhotosSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(DEFAULT_PHOTOS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<PhotoItem | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Sync real-time photos from Firestore if available
  useEffect(() => {
    try {
      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'about_photos'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: PhotoItem[] = snapshot.docs.map((d) => ({
            id: d.id,
            src: d.data().src || d.data().imageUrl || 'https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg',
            title: d.data().title || 'Tsehay Campus Moment',
            tag: d.data().tag || 'Campus'
          }));
          setPhotos(list);
        }
      }, (err) => {
        console.warn("About photos listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About photos setup error:", e);
    }
  }, []);

  const scrollToIndex = (index: number) => {
    const nextIdx = Math.max(0, Math.min(index, photos.length - 1));
    setCurrentIndex(nextIdx);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const child = container.children[nextIdx] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const handlePrev = () => {
    scrollToIndex(currentIndex === 0 ? photos.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex === photos.length - 1 ? 0 : currentIndex + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative max-w-5xl mx-auto pt-8 border-t border-gray-100 dark:border-white/5">
      {/* Header & Controls Toolbar */}
      <div className="flex items-center justify-between mb-5 px-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30 flex items-center justify-center text-sm shadow-[0_0_12px_rgba(50,104,186,0.25)]">
            <i className="fa-solid fa-images"></i>
          </div>
          <div>
            <span className="text-xs font-black text-[#3268ba] dark:text-[#5a93e8] uppercase tracking-wider block">
              የካምፓሳችን ምስሎች (Campus Photo Gallery)
            </span>
            <span className="text-[11px] text-gray-400 font-bold">
              {currentIndex + 1} / {photos.length} ምስሎች
            </span>
          </div>
        </div>

        {/* Next / Prev Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 hover:bg-[#3268ba] hover:text-white text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-white/10 flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer active:scale-90 hover:shadow-[0_0_20px_rgba(50,104,186,0.4)]"
            title="ወደ ኋላ (Previous Photo)"
            aria-label="Previous Photo"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3268ba] to-blue-500 hover:brightness-110 text-white font-black flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#3268ba]/25 cursor-pointer active:scale-90 hover:shadow-[0_0_25px_rgba(50,104,186,0.6)]"
            title="ቀጣይ ምስል (Next Photo)"
            aria-label="Next Photo"
          >
            <i className="fa-solid fa-chevron-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* Horizontal Photos Container */}
      <div 
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-4 px-2"
      >
        {photos.map((photo, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div 
              key={photo.id} 
              onClick={() => {
                setCurrentIndex(idx);
                setSelectedLightboxPhoto(photo);
              }}
              className={`snap-center shrink-0 w-full sm:w-[480px] md:w-[560px] rounded-3xl overflow-hidden shadow-2xl group h-64 sm:h-80 md:h-[340px] bg-slate-950 relative border cursor-pointer transition-all duration-500 ${
                isActive 
                  ? 'border-[#3268ba]/60 shadow-[0_0_35px_rgba(50,104,186,0.25)] scale-100' 
                  : 'border-gray-200 dark:border-white/10 scale-[0.98] opacity-85 hover:opacity-100'
              }`}
            >
              <img 
                src={photo.src} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                alt={photo.title} 
                onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop'; }} 
              />

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none"></div>

              {/* Tag Badge */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/60 text-[#5a93e8] border border-[#3268ba]/30 backdrop-blur-md">
                  {photo.tag}
                </span>
              </div>

              {/* Expand Icon */}
              <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <i className="fa-solid fa-expand"></i>
              </div>

              {/* Bottom Caption */}
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-white leading-snug drop-shadow-md">
                  {photo.title}
                </h4>
                <p className="text-xs text-[#5a93e8] font-semibold flex items-center gap-1.5">
                  <i className="fa-solid fa-image text-[10px]"></i>
                  <span>ሙሉውን ለማየት ይጫኑ (Click to Expand)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4">
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              i === currentIndex 
                ? 'w-7 bg-[#3268ba] shadow-[0_0_10px_#3268ba]' 
                : 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/40'
            }`}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLightboxPhoto(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl space-y-3 p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pt-1">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5a93e8] bg-[#3268ba]/20 px-2 py-0.5 rounded-md border border-[#3268ba]/30">
                  {selectedLightboxPhoto.tag}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedLightboxPhoto.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLightboxPhoto(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black">
              <img 
                src={selectedLightboxPhoto.src} 
                alt={selectedLightboxPhoto.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
