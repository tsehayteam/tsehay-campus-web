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
      <main className="min-h-screen flex flex-col bg-[#030509] text-slate-100 transition-colors duration-300 relative overflow-hidden">
        
        {/* =========================================================================
            🌟 3D PARTICLE NETWORK & MESH GRADIENT CANVAS BACKGROUND
           ========================================================================= */}
        <About3DParticleMeshCanvas />

        {/* Deep Void Stardust Mesh Background & Ambient Lighting */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-15 mix-blend-overlay pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,104,186,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(249,176,60,0.12),transparent_55%)] pointer-events-none z-0" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-[#3268ba]/15 via-[#f9b03c]/10 to-transparent rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[35%] -left-36 w-[450px] h-[450px] bg-[#3268ba]/12 rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[65%] -right-36 w-[450px] h-[450px] bg-[#f9b03c]/12 rounded-full blur-[160px] pointer-events-none -z-10" />

        <section id="about" className="pt-28 sm:pt-36 pb-24 relative z-10 flex-1">
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
            
            {/* Header Title */}
            <div className="text-center">
              <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-white mb-4 tracking-tight">
                {t('about_us_page')}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)]" />
            </div>

            {/* Main Intro Video With Rotating Conic-Gradient Glowing Border (20px) */}
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
                
                {/* ✨ 4 Sparkling Corner Flares */}
                <div className="absolute -top-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-300"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-500"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-700"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                
                <div className="relative rounded-[22px] bg-slate-900/95 backdrop-blur-xl p-6 sm:p-10 border border-white/10 shadow-2xl">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(249,176,60,0.25)]">
                      <i className="fa-solid fa-book-open-reader"></i>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#f9b03c] tracking-widest uppercase block">ታሪካችን</span>
                      <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
                        {t('our_story_title')}
                      </h2>
                    </div>
                  </div>

                  <p className="text-slate-300 font-body leading-relaxed text-base sm:text-[17px] mb-4">
                    {t('our_story_p1')}
                  </p>
                  
                  <p className="text-slate-300 font-body leading-relaxed text-base sm:text-[17px] mb-8">
                    {t('our_story_p2')}
                  </p>

                  {/* Stats Pill Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#f9b03c]/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-graduation-cap text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-white leading-none">500+</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_students')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#3268ba]/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-[#3268ba]/15 text-[#5a93e8] flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-laptop-code text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-white leading-none">100%</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_practical')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-lg">
                        <i className="fa-solid fa-brain text-base"></i>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-white leading-none">24/7</h4>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{t('stat_ai')}</p>
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
                <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/60 via-[#ffe066]/40 to-[#3268ba]/60 rounded-3xl opacity-60 group-hover:opacity-100 transition duration-500 blur-xs" />
                
                {/* 4 Sparkling Corner Flares */}
                <div className="absolute -top-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-200"></span>
                  <span className="block w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>
                <div className="absolute -bottom-1.5 -left-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#3268ba] rounded-full animate-ping opacity-75 delay-400"></span>
                  <span className="block w-3 h-3 bg-[#5a93e8] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#3268ba]"></span>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 z-20 pointer-events-none">
                  <span className="absolute w-4 h-4 bg-[#f9b03c] rounded-full animate-ping opacity-75 delay-600"></span>
                  <span className="block w-3 h-3 bg-[#f9b03c] rounded-full border-2 border-slate-900 shadow-[0_0_12px_#f9b03c]"></span>
                </div>

                <div className="relative rounded-[22px] bg-slate-900/95 backdrop-blur-xl p-8 sm:p-12 text-center shadow-2xl">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-4 shadow-[0_0_25px_rgba(249,176,60,0.25)] group-hover:scale-110 transition duration-300">
                    <i className="fa-solid fa-bullseye"></i>
                  </div>
                  
                  <span className="text-xs font-bold text-[#f9b03c] tracking-widest uppercase block mb-1">ራዕይ እና ዓላማ</span>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-white mb-4">
                    {t('mission_title')}
                  </h2>

                  <p className="text-lg sm:text-2xl font-bold text-slate-200 leading-relaxed max-w-2xl mx-auto">
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
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-white">
                  {t('what_we_do_title')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                
                {/* Pillar 1 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/20">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(249,176,60,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-chart-line"></i>
                      </div>
                      <h3 className="font-bold text-white text-xl mb-3 font-heading leading-snug">{t('wwd_1_title')}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{t('wwd_1_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#5a93e8] rounded-full shadow-[0_0_8px_#3268ba] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#3268ba]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#3268ba]/20">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(50,104,186,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-people-group"></i>
                      </div>
                      <h3 className="font-bold text-white text-xl mb-3 font-heading leading-snug">{t('wwd_2_title')}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{t('wwd_2_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="relative p-[2px] rounded-3xl group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition duration-500 rounded-3xl" />
                  
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 pointer-events-none" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] pointer-events-none" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#f9b03c] rounded-full shadow-[0_0_8px_#f9b03c] animate-ping opacity-75 delay-500 pointer-events-none" />
                  
                  <div className="relative rounded-[22px] bg-slate-900/90 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#f9b03c]/50 transition duration-500 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#f9b03c]/20">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(249,176,60,0.2)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                      </div>
                      <h3 className="font-bold text-white text-xl mb-3 font-heading leading-snug">{t('wwd_3_title')}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{t('wwd_3_desc')}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                4. OUR TEAM (የአመራር ቡድን / Our Team) - DISTINCT ELEGANT GLASSMORPHISM
               ========================================================================= */}
            <div>
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3">
                  <i className="fa-solid fa-users text-[10px]"></i>
                  <span>የአመራር ቡድን</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-white">
                  {t('our_team_title')}
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
                
                {/* Eyoub Sahle */}
                <div className="group relative w-full sm:w-[380px] rounded-[24px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                  <div 
                    className="relative rounded-[24px] p-8 sm:p-10 text-center flex flex-col items-center transition-all duration-500 h-full"
                    style={{
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Soft Golden Yellow Spotlight Fading in on Hover */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,176,60,0.16),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[24px]" />
                    
                    {/* Hover Border Transition */}
                    <div className="absolute inset-0 rounded-[24px] border border-transparent group-hover:border-[rgba(249,176,60,0.6)] transition-colors duration-500 pointer-events-none" />

                    {/* Circular Avatar Photo */}
                    <div className="relative mb-6">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-[#f9b03c]/50 group-hover:border-[#f9b03c] group-hover:shadow-[0_0_25px_rgba(249,176,60,0.4)] transition-all duration-500 bg-slate-900">
                        <img 
                          src="/assets/eyob_white.jpg" 
                          alt="Eyoub Sahle" 
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                          onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Eyoub+Sahle&background=000000&color=fff&size=160'; }} 
                        />
                      </div>
                    </div>
                    
                    {/* Crisp Typography */}
                    <h3 className="font-bold text-white text-xl sm:text-2xl mb-2 notranslate whitespace-nowrap tracking-tight">
                      ኢዮብ ሳህሌ (Eyoub Sahle)
                    </h3>
                    <p className="text-sm font-bold text-[#f9b03c] tracking-wide mb-1">
                      ባለቤት እና ዋና አሰልጣኝ
                    </p>
                    <p className="text-xs font-semibold text-[#5a93e8] tracking-wider uppercase">
                      Owner & Lead Instructor
                    </p>
                  </div>
                </div>

                {/* Ribka Teshome */}
                <div className="group relative w-full sm:w-[380px] rounded-[24px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                  <div 
                    className="relative rounded-[24px] p-8 sm:p-10 text-center flex flex-col items-center transition-all duration-500 h-full"
                    style={{
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Soft Golden Yellow Spotlight Fading in on Hover */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,176,60,0.16),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[24px]" />
                    
                    {/* Hover Border Transition */}
                    <div className="absolute inset-0 rounded-[24px] border border-transparent group-hover:border-[rgba(249,176,60,0.6)] transition-colors duration-500 pointer-events-none" />

                    {/* Circular Avatar Photo */}
                    <div className="relative mb-6">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-[#f9b03c]/50 group-hover:border-[#f9b03c] group-hover:shadow-[0_0_25px_rgba(249,176,60,0.4)] transition-all duration-500 bg-slate-900">
                        <img 
                          src="/assets/ribka2.jpg" 
                          alt="Ribka Teshome" 
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
                          onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Ribka+Teshome&background=000000&color=fff&size=160'; }} 
                        />
                      </div>
                    </div>
                    
                    {/* Crisp Typography */}
                    <h3 className="font-bold text-white text-xl sm:text-2xl mb-2 notranslate whitespace-nowrap tracking-tight">
                      ርብቃ ተሾመ (Ribka Teshome)
                    </h3>
                    <p className="text-sm font-bold text-[#f9b03c] tracking-wide mb-1">
                      ዋና ስራ አስኪያጅ
                    </p>
                    <p className="text-xs font-semibold text-[#5a93e8] tracking-wider uppercase">
                      General Manager
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                🌟 CRITICAL FIX: ULTRA-MINIMALIST SINGLE VIDEO REELS SLIDER (INFINITE LOOP)
               ========================================================================= */}
            <div className="space-y-8 pt-4">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] text-xs font-bold mb-3 shadow-[0_0_15px_rgba(249,176,60,0.15)]">
                  <i className="fa-solid fa-clapperboard text-[11px]"></i>
                  <span>አጫጭር ቪዲዮዎች • Short Reels</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-tight">
                  የካምፓሳችን አጫጭር ቪዲዮዎች
                </h2>
              </div>

              {/* Single Video Card Carousel with Sleek Glassmorphism Navigation */}
              <AboutSingleReelSlider />
            </div>

            {/* =========================================================================
                🌟 SINGLE CLEAN COMMUNITY PHOTO (NO TEXT OVERLAYS)
               ========================================================================= */}
            <div className="space-y-8 pt-8 border-t border-white/5">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3268ba]/10 border border-[#3268ba]/30 text-[#5a93e8] text-xs font-bold mb-3 shadow-[0_0_15px_rgba(50,104,186,0.15)]">
                  <i className="fa-solid fa-camera-retro text-[11px]"></i>
                  <span>የስልጠና ማህበረሰብ • Campus Community</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-tight">
                  በስልጠና ላይ ያሉ
                </h2>
              </div>

              {/* Single High-Quality Focused Community Photo Card */}
              <AboutSingleCleanPhoto />
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// =========================================================================
// 🌟 3D PARTICLE NETWORK & MESH GRADIENT CANVAS (MATCHING LANDING PAGE)
// =========================================================================
function About3DParticleMeshCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = Math.min(Math.floor((width * height) / 22000), 65);
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      color: string;
    }> = [];

    const colors = ['#f9b03c', '#3268ba', '#5a93e8', '#ffe066'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 400 - 200,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.8 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.z < -200) p.z = 200;
        if (p.z > 200) p.z = -200;

        const scale = 300 / (300 + p.z);
        const alpha = Math.max(0.15, Math.min(0.7, (p.z + 200) / 400)) * 0.65;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#f9b03c';
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-70"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    />
  );
}

// =========================================================================
// 🌟 1. HERO VIDEO PLAYER WITH ROTATING CONIC-GRADIENT BORDER (20px)
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
      <div 
        className="relative rounded-[20px] p-[2.5px] overflow-hidden group shadow-[0_0_40px_rgba(249,176,60,0.25)] hover:shadow-[0_0_60px_rgba(249,176,60,0.45)] transition-shadow duration-500"
        style={{ borderRadius: '20px' }}
      >
        <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_200deg,#3268ba_270deg,#5a93e8_300deg,#f9b03c_330deg,#ffe066_355deg,#ffffff_360deg)] animate-border-beam opacity-90 group-hover:opacity-100 pointer-events-none" />

        <div 
          className="relative rounded-[calc(20px-2.5px)] overflow-hidden bg-black aspect-video flex items-center justify-center"
          style={{ borderRadius: 'calc(20px - 2.5px)' }}
        >
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

              {/* Glowing Centered Golden Yellow Play Button */}
              <div className="relative z-20 flex items-center justify-center pointer-events-none">
                <span className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#f9b03c]/40 animate-ping pointer-events-none"></span>
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_40px_rgba(249,176,60,0.85)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(249,176,60,1)] transition-all duration-300">
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
// 🌟 2. ULTRA-FAST ZERO-LATENCY SHORT REELS SLIDER (INSTANT THUMBNAILS & SEAMLESS PLAY)
// =========================================================================
interface ShortReel {
  id: string;
  src: string;
  thumbnail: string;
  title?: string;
}

const DEFAULT_REELS: ShortReel[] = [
  {
    id: 'reel-1',
    src: '/assets/videos/Tsehay.mp4',
    thumbnail: '/assets/about_video_cover.jpg',
    title: 'የካምፓሳችን አጭር ቪዲዮ (Campus Reel 1)'
  },
  {
    id: 'reel-2',
    src: '/assets/videos/Marketing%20and%20psyco.mp4',
    thumbnail: '/assets/hero-bg-new.jpg',
    title: 'የማርኬቲንግ እና ሳይኮሎጂ ስልጠና (Campus Reel 2)'
  }
];

function AboutSingleReelSlider() {
  const [reels, setReels] = useState<ShortReel[]>(DEFAULT_REELS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'about_reels'),
        orderBy('order', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: ShortReel[] = snapshot.docs.map((d) => ({
            id: d.id,
            src: d.data().src || d.data().videoUrl || '/assets/videos/Tsehay.mp4',
            thumbnail: d.data().thumbnail || (d.id === 'reel-2' ? '/assets/hero-bg-new.jpg' : '/assets/about_video_cover.jpg'),
            title: d.data().title || ''
          }));
          if (list.length > 0) setReels(list);
        }
      });
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  const changeSlide = (newIndex: number, direction: 'left' | 'right') => {
    if (isSliding) return;
    
    // Instantly stop video & show thumbnail for zero black screen
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setSlideDirection(direction);
    setIsSliding(true);
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsSliding(false);
    }, 280);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextIdx = (currentIndex - 1 + reels.length) % reels.length;
    changeSlide(nextIdx, 'left');
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextIdx = (currentIndex + 1) % reels.length;
    changeSlide(nextIdx, 'right');
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      setIsLoading(true);
      vid.muted = false;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.warn("Autoplay with sound prevented, playing muted:", err);
            vid.muted = true;
            vid.play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => {
                setIsLoading(false);
              });
          });
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  // Touch handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentReel = reels[currentIndex] || reels[0];

  return (
    <div className="relative max-w-sm sm:max-w-md mx-auto flex flex-col items-center justify-center select-none py-2">
      
      {/* Slider Viewport Container */}
      <div 
        className="relative w-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sleek Glassmorphism Previous (<) Button */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute -left-4 sm:-left-12 md:-left-16 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/90 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/15 hover:border-[#f9b03c] backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.6)] cursor-pointer active:scale-90 hover:scale-110 hover:shadow-[0_0_30px_rgba(249,176,60,0.6)]"
          title="ወደ ኋላ (Previous)"
          aria-label="Previous Video"
        >
          <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
        </button>

        {/* Sleek Glassmorphism Next (>) Button */}
        <button
          type="button"
          onClick={handleNext}
          className="absolute -right-4 sm:-right-12 md:-right-16 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/90 hover:bg-[#f9b03c] text-white hover:text-slate-950 border border-white/15 hover:border-[#f9b03c] backdrop-blur-xl flex items-center justify-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.6)] cursor-pointer active:scale-90 hover:scale-110 hover:shadow-[0_0_30px_rgba(249,176,60,0.6)]"
          title="ቀጣይ (Next)"
          aria-label="Next Video"
        >
          <i className="fa-solid fa-chevron-right text-sm sm:text-base"></i>
        </button>

        {/* 🌟 Single Perfectly Centered Video Reel Card (Zero Black Flash, Instant Thumbnail) */}
        <div
          key={currentReel.id + '-' + currentIndex}
          onClick={togglePlay}
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
          }}
          className={`group relative w-full aspect-[9/16] rounded-[16px] overflow-hidden cursor-pointer shadow-[0_12px_45px_rgba(0,0,0,0.85)] hover:shadow-[0_0_40px_rgba(249,176,60,0.3)] hover:border-[#f9b03c]/60 transition-all duration-500 transform hover:scale-[1.01] bg-slate-950 ${
            isSliding ? 'opacity-90 scale-[0.98]' : 'opacity-100 scale-100'
          }`}
        >
          {/* 🌟 1. Instant Crisp Cover/Thumbnail Image (Visible immediately when not playing or loading) */}
          <img
            src={currentReel.thumbnail}
            alt={currentReel.title || "Tsehay Campus Short Reel"}
            loading="eager"
            className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ease-out group-hover:scale-105 ${
              isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/about_video_cover.jpg';
            }}
          />

          {/* 🌟 2. HTML5 Video Element with poster & auto playsInline */}
          <video
            ref={videoRef}
            src={currentReel.src}
            poster={currentReel.thumbnail}
            playsInline
            webkit-playsinline="true"
            disablePictureInPicture
            controlsList="nodownload noremoteplayback"
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              handleNext();
            }}
            className="w-full h-full object-cover"
          />

          {/* Subtle Ambient Vignette Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 z-15 pointer-events-none transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`} />

          {/* Reel Index Badge (e.g. 1 / 2) */}
          <div className="absolute top-3.5 left-3.5 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-black text-amber-300 flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-pulse"></span>
            <span>{currentIndex + 1} / {reels.length}</span>
          </div>

          {/* 🌟 3. Centered Golden Yellow Play / Pause Button with Pulse */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            {!isPlaying && !isLoading && (
              <span className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#f9b03c]/35 animate-ping pointer-events-none"></span>
            )}
            
            <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
              isLoading
                ? 'bg-black/80 border-2 border-[#f9b03c] text-[#f9b03c]'
                : isPlaying 
                  ? 'bg-black/75 border-2 border-[#f9b03c] text-[#f9b03c] opacity-0 group-hover:opacity-100' 
                  : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_40px_rgba(249,176,60,0.85)] group-hover:scale-110'
            }`}>
              {isLoading ? (
                <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
              ) : isPlaying ? (
                <i className="fa-solid fa-pause text-2xl"></i>
              ) : (
                <i className="fa-solid fa-play text-2xl ml-1"></i>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 Minimalist Glassmorphism Dot Pagination Indicators */}
      {reels.length > 1 && (
        <div className="flex items-center justify-center gap-2.5 mt-5 z-20">
          {reels.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => changeSlide(idx, idx > currentIndex ? 'right' : 'left')}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex
                  ? 'w-8 bg-gradient-to-r from-[#f9b03c] to-amber-300 shadow-[0_0_12px_rgba(249,176,60,0.8)]'
                  : 'w-2.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 🌟 3. SINGLE CLEAN COMMUNITY PHOTO (NO TEXT OVERLAYS, 16px BORDER RADIUS)
// =========================================================================
function AboutSingleCleanPhoto() {
  const [photoSrc, setPhotoSrc] = useState<string>('https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    try {
      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'about_photos'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const firstDoc = snapshot.docs[0].data();
          if (firstDoc && (firstDoc.src || firstDoc.imageUrl)) {
            setPhotoSrc(firstDoc.src || firstDoc.imageUrl);
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  return (
    <div className="max-w-4xl mx-auto flex justify-center">
      {/* Single Pure Photo Card without any textual clutter */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        style={{
          borderRadius: '16px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        className="group relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[16px] overflow-hidden cursor-pointer shadow-[0_10px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_45px_rgba(249,176,60,0.25)] hover:border-[#f9b03c]/50 transition-all duration-500 transform hover:-translate-y-1.5 hover:scale-[1.01]"
        title="ምስሉን በትልቁ ለማየት ይጫኑ"
      >
        <img
          src={photoSrc}
          alt="Tsehay Campus Community"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop';
          }}
        />

        {/* Subtle Ambient Hover Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Clean Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="rounded-xl overflow-hidden max-h-[80vh] flex items-center justify-center bg-black">
              <img
                src={photoSrc}
                alt="Tsehay Campus Community High-Res"
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
