'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { parseVideoEmbedUrl, parseImageUrl } from '@/lib/videoParser';

export default function About() {
  const { t, lang } = useLanguage();

  return (
    <>
      <main className="min-h-screen flex flex-col bg-white dark:bg-[#030509] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
        
        {/* Deep Void Stardust Mesh Background & Ambient Lighting */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,104,186,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(249,176,60,0.15),transparent_55%)] pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-[#3268ba]/18 via-[#f9b03c]/15 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="absolute top-[35%] -left-36 w-[450px] h-[450px] bg-[#3268ba]/15 rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[65%] -right-36 w-[450px] h-[450px] bg-[#f9b03c]/15 rounded-full blur-[160px] pointer-events-none -z-10" />

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
                1. OUR STORY (የእኛ ታሪክ) - 4-CORNER SPARKLING BORDER CARD WITH MICRO-MOTION
               ========================================================================= */}
            <div className="max-w-4xl mx-auto">
              <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500">
                {/* Flowing Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/50 via-[#3268ba]/50 to-[#f9b03c]/50 rounded-3xl opacity-60 group-hover:opacity-100 transition duration-500 blur-xs" />
                
                {/* ✨ 4 SPARKLING CORNER FLARES (ብልጭ የሚሉ 4 ማዕዘናት) */}
                <div className="absolute -top-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-300"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-500"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-700"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                
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
              <div className="relative p-[2px] rounded-3xl group hover:-translate-y-1.5 transition-all duration-500">
                {/* Flowing Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/60 via-[#ffe066]/40 to-[#3268ba]/60 rounded-3xl opacity-60 group-hover:opacity-100 transition duration-500 blur-xs" />
                
                {/* ✨ 4 SPARKLING CORNER FLARES */}
                <div className="absolute -top-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-200"></span>
                  <span className="block w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -bottom-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-400"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-600"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>

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
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  {/* Sparkling Corner Flares */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/20">
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
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  {/* Sparkling Corner Flares */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#3268ba]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#3268ba]/20">
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
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  {/* Sparkling Corner Flares */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-gray-100 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/20">
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
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  {/* Sparkling Corner Flares */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
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
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500 w-full sm:w-[380px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  {/* Sparkling Corner Flares */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
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

            {/* =========================================================================
                5. 🌟 3D COVERFLOW CINEMATIC SLIDERS (REELS & PHOTOS)
               ========================================================================= */}
            <div className="space-y-24">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3 shadow-[0_0_15px_rgba(249,176,60,0.2)]">
                  <i className="fa-solid fa-cubes text-[11px]"></i>
                  <span>3D Cinematic Gallery</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 dark:text-white tracking-tight">
                  የካምፓሳችን አጫጭር ቪዲዮዎች እና ምስሎች
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  በ 3D Coverflow ስላይደር የተዋቀሩ የተግባር እንቅስቃሴዎቻችን እና የክፍለ-ጊዜ ማሳያዎች
                </p>
              </div>

              {/* A. 3D Coverflow Vertical Video Reels Slider */}
              <About3DCoverflowReels />

              {/* B. 3D Coverflow Campus Photos Slider */}
              <About3DCoverflowPhotos />
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
// 🌟 3D COVERFLOW SHORT VIDEOS / REELS SLIDER (INFINITE 3D PERSPECTIVE)
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
    title: 'ስለ ፀሐይ ካምፓስ አጠቃላይ እንቅስቃሴ እና ራዕይ', 
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
    title: 'የተግባራዊ ስልጠናዎች እና የኢኮሜርስ ገቢ ማግኛ ማስተርክላስ', 
    tag: 'E-Commerce & Digital Skills',
    src: '/assets/videos/Tsehay.mp4',
    thumbnail: '/assets/about_video_cover.jpg'
  }
];

function About3DCoverflowReels() {
  const [reels, setReels] = useState<ReelItem[]>(DEFAULT_REELS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Sync real-time dynamic reels from Firestore
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
          if (list.length > 0) {
            setReels(list);
          }
        }
      }, (err) => {
        console.warn("About reels listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About reels setup error:", e);
    }
  }, []);

  const totalItems = reels.length;

  // Pause all playing videos when sliding
  const pauseAllVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach((vid) => {
      if (vid && !vid.paused) {
        vid.pause();
      }
    });
    setPlayingIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    pauseAllVideos();
    setActiveIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  }, [totalItems, pauseAllVideos]);

  const handleNext = useCallback(() => {
    pauseAllVideos();
    setActiveIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  }, [totalItems, pauseAllVideos]);

  const togglePlayVideo = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRefs.current[idx];
    if (!vid) return;

    if (vid.paused) {
      pauseAllVideos();
      vid.muted = false;
      vid.play().then(() => {
        setPlayingIndex(idx);
      }).catch(() => {
        vid.muted = true;
        vid.play().then(() => setPlayingIndex(idx)).catch(() => {});
      });
    } else {
      vid.pause();
      setPlayingIndex(null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) handleNext();
    else if (diff < -45) handlePrev();
    touchStartX.current = null;
  };

  // Mouse Drag Swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const diff = touchStartX.current - e.clientX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartX.current = null;
    isDragging.current = false;
  };

  // Calculate circular offset distance for 3D positioning
  const getOffset = (index: number) => {
    let diff = (index - activeIndex) % totalItems;
    if (diff > totalItems / 2) diff -= totalItems;
    if (diff < -totalItems / 2) diff += totalItems;
    return diff;
  };

  return (
    <div className="relative max-w-5xl mx-auto px-2 select-none">
      
      {/* Top Header Bar with Glassmorphic Badge & Counter */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(249,176,60,0.3)]">
            <i className="fa-solid fa-play"></i>
          </div>
          <div>
            <span className="text-xs font-black text-[#f9b03c] uppercase tracking-wider block">
              3D Short Reels (አጫጭር ቪዲዮዎች)
            </span>
            <span className="text-[11px] text-gray-400 font-bold">
              ቪዲዮ {activeIndex + 1} ከ {totalItems} • 3D Coverflow Mode
            </span>
          </div>
        </div>

        {/* Glassmorphism Next / Prev Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:bg-[#f9b03c] hover:text-slate-950 text-slate-800 dark:text-white border border-white/20 dark:border-white/10 flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer active:scale-90 hover:shadow-[0_0_25px_rgba(249,176,60,0.5)]"
            title="ወደ ኋላ (Previous Slide)"
            aria-label="Previous Slide"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 hover:brightness-110 text-slate-950 font-black flex items-center justify-center transition-all duration-300 shadow-xl shadow-[#f9b03c]/30 cursor-pointer active:scale-90 hover:shadow-[0_0_30px_rgba(249,176,60,0.7)]"
            title="ቀጣይ (Next Slide)"
            aria-label="Next Slide"
          >
            <i className="fa-solid fa-chevron-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* 🌟 3D Perspective Stage Container */}
      <div 
        className="relative h-[490px] sm:h-[540px] md:h-[580px] w-full flex items-center justify-center overflow-visible"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {reels.map((reel, idx) => {
          const offset = getOffset(idx);
          const isActive = offset === 0;
          const isLeft = offset === -1;
          const isRight = offset === 1;
          const isVisible = Math.abs(offset) <= 1;

          // 3D Transform calculations
          let transformStyle = '';
          let zIndex = 10;
          let opacity = 0;
          let filter = 'blur(0px)';
          let pointerEvents: 'auto' | 'none' = 'none';

          if (isActive) {
            transformStyle = 'translate3d(0px, 0px, 60px) rotateY(0deg) scale(1.1)';
            zIndex = 30;
            opacity = 1;
            pointerEvents = 'auto';
          } else if (isLeft) {
            transformStyle = 'translate3d(-240px, 0px, -60px) rotateY(32deg) scale(0.85)';
            zIndex = 20;
            opacity = 0.5;
            filter = 'brightness(0.7)';
            pointerEvents = 'auto';
          } else if (isRight) {
            transformStyle = 'translate3d(240px, 0px, -60px) rotateY(-32deg) scale(0.85)';
            zIndex = 20;
            opacity = 0.5;
            filter = 'brightness(0.7)';
            pointerEvents = 'auto';
          } else {
            const side = offset < 0 ? -1 : 1;
            transformStyle = `translate3d(${side * 380}px, 0px, -180px) rotateY(${side * -45}deg) scale(0.7)`;
            zIndex = 5;
            opacity = 0;
            pointerEvents = 'none';
          }

          return (
            <div
              key={reel.id}
              onClick={() => {
                if (!isActive) {
                  pauseAllVideos();
                  setActiveIndex(idx);
                }
              }}
              style={{
                transform: transformStyle,
                zIndex,
                opacity,
                filter,
                pointerEvents,
                transition: 'transform 0.6s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.6s ease, filter 0.6s ease, box-shadow 0.6s ease',
                boxShadow: isActive ? '0 10px 40px rgba(249, 176, 60, 0.4), 0 0 20px rgba(249, 176, 60, 0.2)' : '0 8px 25px rgba(0,0,0,0.6)',
                border: isActive ? '1px solid rgba(249, 176, 60, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] sm:w-[280px] md:w-[310px] aspect-[9/16] rounded-3xl overflow-hidden cursor-pointer bg-slate-950 backdrop-blur-xl group`}
            >
              {/* Video Player */}
              <video
                ref={(el) => { videoRefs.current[idx] = el; }}
                src={reel.src}
                playsInline
                webkit-playsinline="true"
                disablePictureInPicture
                controlsList="nodownload noremoteplayback"
                preload="metadata"
                onEnded={() => setPlayingIndex(null)}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Vignette Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

              {/* Active Golden Corner Accents */}
              {isActive && (
                <>
                  <span className="absolute top-3 left-3 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_10px_#f9b03c] animate-ping opacity-75 pointer-events-none z-30" />
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_10px_#f9b03c] pointer-events-none z-30" />
                </>
              )}

              {/* Top Tag */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/65 text-[#f9b03c] border border-[#f9b03c]/35 backdrop-blur-md">
                  {reel.tag}
                </span>
                <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-xs">
                  <i className="fa-solid fa-cube text-[10px]"></i>
                </div>
              </div>

              {/* Center Play/Pause Trigger */}
              {isActive && (
                <div 
                  onClick={(e) => togglePlayVideo(idx, e)}
                  className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
                >
                  <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
                    playingIndex === idx
                      ? 'bg-black/75 border-2 border-[#f9b03c] text-[#f9b03c] opacity-0 hover:opacity-100'
                      : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_35px_rgba(249,176,60,0.85)] group-hover:scale-110'
                  }`}>
                    {playingIndex === idx ? (
                      <i className="fa-solid fa-pause text-2xl"></i>
                    ) : (
                      <i className="fa-solid fa-play text-2xl ml-1"></i>
                    )}
                  </div>
                </div>
              )}

              {/* Non-active overlay click notice */}
              {!isActive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-black uppercase tracking-wider text-white/80 bg-black/60 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
                    ለማየት ይጫኑ
                  </span>
                </div>
              )}

              {/* Bottom Title & Details */}
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none space-y-1">
                <h4 className="text-sm sm:text-base font-black text-white leading-snug drop-shadow-md line-clamp-2">
                  {reel.title}
                </h4>
                {isActive && (
                  <p className="text-[11px] text-[#f9b03c] font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-hand-pointer text-[10px]"></i>
                    <span>{playingIndex === idx ? 'ለማቆም ይጫኑ' : 'ለማጫወት ማዕከሉን ይጫኑ'}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Side Quick Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/60 hover:bg-[#f9b03c] hover:text-slate-950 text-white border border-white/20 hover:border-[#f9b03c] backdrop-blur-xl items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer active:scale-90"
        title="ወደ ኋላ"
      >
        <i className="fa-solid fa-chevron-left text-base"></i>
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/60 hover:bg-[#f9b03c] hover:text-slate-950 text-white border border-white/20 hover:border-[#f9b03c] backdrop-blur-xl items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer active:scale-90"
        title="ቀጣይ"
      >
        <i className="fa-solid fa-chevron-right text-base"></i>
      </button>

      {/* Bottom Dots Indicator */}
      <div className="flex items-center justify-center gap-2.5 pt-6">
        {reels.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              pauseAllVideos();
              setActiveIndex(i);
            }}
            className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === activeIndex 
                ? 'w-9 bg-[#f9b03c] shadow-[0_0_14px_#f9b03c]' 
                : 'w-2.5 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 3D COVERFLOW CAMPUS PHOTOS SLIDER (WIDE PERSPECTIVE & LIGHTBOX)
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

function About3DCoverflowPhotos() {
  const [photos, setPhotos] = useState<PhotoItem[]>(DEFAULT_PHOTOS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<PhotoItem | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Sync real-time photos from Firestore
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
          if (list.length > 0) {
            setPhotos(list);
          }
        }
      }, (err) => {
        console.warn("About photos listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About photos setup error:", e);
    }
  }, []);

  const totalItems = photos.length;

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  }, [totalItems]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  }, [totalItems]);

  // Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) handleNext();
    else if (diff < -45) handlePrev();
    touchStartX.current = null;
  };

  // Mouse Drag Swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const diff = touchStartX.current - e.clientX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartX.current = null;
    isDragging.current = false;
  };

  const getOffset = (index: number) => {
    let diff = (index - activeIndex) % totalItems;
    if (diff > totalItems / 2) diff -= totalItems;
    if (diff < -totalItems / 2) diff += totalItems;
    return diff;
  };

  return (
    <div className="relative max-w-5xl mx-auto pt-10 border-t border-gray-100 dark:border-white/5 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(50,104,186,0.3)]">
            <i className="fa-solid fa-images"></i>
          </div>
          <div>
            <span className="text-xs font-black text-[#3268ba] dark:text-[#5a93e8] uppercase tracking-wider block">
              3D Photo Gallery (የካምፓሳችን ምስሎች)
            </span>
            <span className="text-[11px] text-gray-400 font-bold">
              ምስል {activeIndex + 1} ከ {totalItems} • 3D Coverflow Mode
            </span>
          </div>
        </div>

        {/* Glassmorphic Next / Prev Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl hover:bg-[#3268ba] hover:text-white text-slate-800 dark:text-white border border-white/20 dark:border-white/10 flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer active:scale-90 hover:shadow-[0_0_25px_rgba(50,104,186,0.5)]"
            title="ወደ ኋላ (Previous Photo)"
            aria-label="Previous Photo"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#3268ba] to-blue-500 hover:brightness-110 text-white font-black flex items-center justify-center transition-all duration-300 shadow-xl shadow-[#3268ba]/30 cursor-pointer active:scale-90 hover:shadow-[0_0_30px_rgba(50,104,186,0.7)]"
            title="ቀጣይ (Next Photo)"
            aria-label="Next Photo"
          >
            <i className="fa-solid fa-chevron-right text-sm"></i>
          </button>
        </div>
      </div>

      {/* 🌟 3D Wide Perspective Stage */}
      <div 
        className="relative h-[340px] sm:h-[400px] md:h-[460px] w-full flex items-center justify-center overflow-visible"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {photos.map((photo, idx) => {
          const offset = getOffset(idx);
          const isActive = offset === 0;
          const isLeft = offset === -1;
          const isRight = offset === 1;

          let transformStyle = '';
          let zIndex = 10;
          let opacity = 0;
          let filter = 'blur(0px)';
          let pointerEvents: 'auto' | 'none' = 'none';

          if (isActive) {
            transformStyle = 'translate3d(0px, 0px, 70px) rotateY(0deg) scale(1.1)';
            zIndex = 30;
            opacity = 1;
            pointerEvents = 'auto';
          } else if (isLeft) {
            transformStyle = 'translate3d(-260px, 0px, -70px) rotateY(32deg) scale(0.85)';
            zIndex = 20;
            opacity = 0.5;
            filter = 'brightness(0.7)';
            pointerEvents = 'auto';
          } else if (isRight) {
            transformStyle = 'translate3d(260px, 0px, -70px) rotateY(-32deg) scale(0.85)';
            zIndex = 20;
            opacity = 0.5;
            filter = 'brightness(0.7)';
            pointerEvents = 'auto';
          } else {
            const side = offset < 0 ? -1 : 1;
            transformStyle = `translate3d(${side * 420}px, 0px, -180px) rotateY(${side * -45}deg) scale(0.7)`;
            zIndex = 5;
            opacity = 0;
            pointerEvents = 'none';
          }

          return (
            <div
              key={photo.id}
              onClick={() => {
                if (isActive) {
                  setSelectedLightboxPhoto(photo);
                } else {
                  setActiveIndex(idx);
                }
              }}
              style={{
                transform: transformStyle,
                zIndex,
                opacity,
                filter,
                pointerEvents,
                transition: 'transform 0.6s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.6s ease, filter 0.6s ease, box-shadow 0.6s ease',
                boxShadow: isActive ? '0 10px 40px rgba(249, 176, 60, 0.4), 0 0 25px rgba(50, 104, 186, 0.3)' : '0 8px 25px rgba(0,0,0,0.6)',
                border: isActive ? '1px solid rgba(249, 176, 60, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[420px] md:w-[500px] aspect-[16/10] rounded-3xl overflow-hidden cursor-pointer bg-slate-950 backdrop-blur-xl group`}
            >
              <img 
                src={photo.src} 
                alt={photo.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop'; }} 
              />

              {/* Vignette Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/35 pointer-events-none" />

              {/* Top Tag & Expand Icon */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/65 text-[#5a93e8] border border-[#3268ba]/35 backdrop-blur-md">
                  {photo.tag}
                </span>
                <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center text-xs">
                  <i className="fa-solid fa-expand"></i>
                </div>
              </div>

              {/* Bottom Caption */}
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none space-y-1">
                <h4 className="text-sm sm:text-lg font-black text-white leading-snug drop-shadow-md">
                  {photo.title}
                </h4>
                {isActive && (
                  <p className="text-xs text-[#5a93e8] font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-magnifying-glass-plus text-[10px]"></i>
                    <span>ሙሉውን ለማየት ይጫኑ (Click to Expand)</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Side Quick Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/60 hover:bg-[#3268ba] text-white border border-white/20 hover:border-[#3268ba] backdrop-blur-xl items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer active:scale-90"
        title="ወደ ኋላ"
      >
        <i className="fa-solid fa-chevron-left text-base"></i>
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/60 hover:bg-[#3268ba] text-white border border-white/20 hover:border-[#3268ba] backdrop-blur-xl items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer active:scale-90"
        title="ቀጣይ"
      >
        <i className="fa-solid fa-chevron-right text-base"></i>
      </button>

      {/* Thumbnail Selector Bar */}
      <div className="flex items-center justify-center gap-3 pt-6 overflow-x-auto no-scrollbar px-2">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`relative rounded-xl overflow-hidden shrink-0 w-16 h-12 sm:w-20 sm:h-14 border-2 transition-all duration-300 cursor-pointer ${
              i === activeIndex 
                ? 'border-[#f9b03c] scale-105 shadow-[0_0_15px_rgba(249,176,60,0.6)] ring-2 ring-[#f9b03c]/40' 
                : 'border-transparent opacity-50 hover:opacity-90'
            }`}
          >
            <img src={photo.src} alt={photo.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedLightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
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

            <div className="rounded-2xl overflow-hidden max-h-[75vh] flex items-center justify-center bg-black">
              <img 
                src={selectedLightboxPhoto.src} 
                alt={selectedLightboxPhoto.title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
