'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { parseVideoEmbedUrl, extractYouTubeId, parseImageUrl } from '@/lib/videoParser';

export default function About() {
  const { t, lang } = useLanguage();

  return (
    <>
      <main className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 overflow-x-hidden selection:bg-[#f9b03c]/30 selection:text-[#f9b03c] relative">
        
        {/* =========================================================================
            1. LUXURY AMBIENT BACKGROUND (NON-INTRUSIVE CYBER-GRID & DYNAMIC GLOWS)
           ========================================================================= */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Subtle Cyber Grid */}
          <div 
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
            style={{
              backgroundImage: `radial-gradient(rgba(249, 176, 60, 0.4) 1px, transparent 1px), radial-gradient(rgba(50, 104, 186, 0.4) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px'
            }}
          />
          {/* Luminous Atmospheric Glow Orbs */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#3268ba]/20 via-[#f9b03c]/15 to-transparent rounded-full blur-[140px] -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[40%] -left-48 w-[600px] h-[600px] bg-[#3268ba]/15 rounded-full blur-[160px] -z-10" />
          <div className="absolute top-[70%] -right-48 w-[600px] h-[600px] bg-[#f9b03c]/15 rounded-full blur-[160px] -z-10" />
        </div>

        {/* =========================================================================
            2. HERO SECTION WITH 3D ANAMORPHIC POP-OUT STAGE ("የኔ አድ" 3D EXPERIENCE)
           ========================================================================= */}
        <section className="pt-32 sm:pt-40 pb-20 sm:pb-28 relative z-10">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header Badge & Title */}
            <div className="text-center max-w-4xl mx-auto mb-16 sm:mb-20">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/35 text-[#f9b03c] text-xs font-black mb-6 shadow-[0_0_25px_rgba(249,176,60,0.25)] animate-pulse">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
                </span>
                <span className="tracking-wide uppercase">✨ በኢትዮጵያ ቀዳሚው የተግባር ዲጂታል አካዳሚ • TSEHAY CAMPUS ✨</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight leading-[1.15] mb-6">
                እኛ የምናምነው በወሬ ሳይሆን{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-200 to-[#f9b03c] animate-gradient-x drop-shadow-[0_0_35px_rgba(249,176,60,0.4)]">
                  በተጨባጭ ውጤት
                </span>{' '}
                ነው!
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto">
                ፀሐይ ካምፓስ በኢትዮጵያ ውስጥ የመጀመሪያውና ብቸኛው በዩቲዩብ (Faceless YouTube Channels) እና በ AI ቴክኖሎጂ ተጨባጭ የገቢ ምንጭ መፍጠር የሚያስችል 100% ተግባራዊ የስልጠና ማዕከል ነው።
              </p>
            </div>

            {/* Grid: 3D Anamorphic Pop-out Showcase + Vision Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-24">
              
              {/* Left Column: Interactive 3D Pop-Out Anamorphic Billboard ("የኔ አድ" 3D Screen Effect) */}
              <div className="lg:col-span-6 flex justify-center">
                <Anamorphic3DBillboard />
              </div>

              {/* Right Column: Mission, Vision & Key Strengths Bento */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Vision Box */}
                <div className="relative p-[1px] rounded-3xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#f9b03c]/40 via-[#3268ba]/40 to-[#f9b03c]/40 rounded-3xl opacity-60 group-hover:opacity-100 transition duration-500 blur-sm" />
                  <div className="relative rounded-[23px] bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 border border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-xl mb-4 border border-[#f9b03c]/30 shadow-[0_0_20px_rgba(249,176,60,0.3)]">
                      <i className="fa-solid fa-bullseye"></i>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 font-heading">ራዕያችን (Our Vision)</h3>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      ማንኛውም ኢትዮጵያዊ በየትኛውም የዓለም ክፍል ሆኖ በዲጂታል እውቀትና በ AI ቴክኖሎጂ ታግዞ በዓለም አቀፍ ደረጃ ተወዳዳሪና ራሱን የቻለ ገቢ ፈጣሪ እንዲሆን ማስቻል ነው።
                    </p>
                  </div>
                </div>

                {/* 3 Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Stat 1 */}
                  <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5 text-center hover:border-[#f9b03c]/50 hover:bg-slate-900/90 transition duration-300">
                    <div className="text-2xl sm:text-3xl font-black text-[#f9b03c] font-heading drop-shadow-[0_0_15px_rgba(249,176,60,0.5)]">
                      500+
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-1">ስኬታማ ተማሪዎች</div>
                  </div>

                  {/* Stat 2 */}
                  <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5 text-center hover:border-[#3268ba]/50 hover:bg-slate-900/90 transition duration-300">
                    <div className="text-2xl sm:text-3xl font-black text-[#5a93e8] font-heading drop-shadow-[0_0_15px_rgba(50,104,186,0.5)]">
                      100%
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-1">ተግባራዊ ልምምድ</div>
                  </div>

                  {/* Stat 3 */}
                  <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5 text-center hover:border-emerald-500/50 hover:bg-slate-900/90 transition duration-300">
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-heading drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                      24/7
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-1">የ AI ድጋፍ</div>
                  </div>

                </div>

              </div>

            </div>

            {/* =========================================================================
                3. MAIN VIDEO PRESENTATION (DYNAMIC HERO PLAYER)
               ========================================================================= */}
            <div className="mt-12 sm:mt-16 mb-24 sm:mb-32">
              <div className="text-center max-w-3xl mx-auto mb-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3268ba]/15 border border-[#3268ba]/40 text-[#5a93e8] text-xs font-black mb-3">
                  <i className="fa-solid fa-play text-[10px]"></i>
                  <span>የቪዲዮ ማብራሪያ</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white font-heading">
                  ስለ ፀሐይ ካምፓስ በአጭሩ ይመልከቱ
                </h2>
              </div>

              <AboutHeroPlayer />
            </div>

            {/* =========================================================================
                4. WHAT WE DO / CORE PILLARS OF EXCELLENCE
               ========================================================================= */}
            <div className="mb-24 sm:mb-32">
              <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black mb-3">
                  <i className="fa-solid fa-gem text-[10px]"></i>
                  <span>የእኛ ልዩ ጥንካሬዎች</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white font-heading">
                  ፀሐይ ካምፓስን ለምን ይመርጣሉ?
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                
                {/* Pillar 1 */}
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-slate-900/80 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#f9b03c]/40 transition duration-500">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_25px_rgba(249,176,60,0.25)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-chart-line"></i>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 font-heading">የገበያ ተፈላጊ ክህሎቶች</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        የዛሬውን ዓለም አቀፍ የዲጂታል ገበያ የሚመጥኑ፣ ገቢ የሚያስገኙና በተግባር የተፈተሹ የዩቲዩብ እና የ AI ስልጠናዎች።
                      </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-[#f9b03c]">
                      <span>100% የተረጋገጠ ስኬት</span>
                      <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </div>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3268ba]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-slate-900/80 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#3268ba]/40 transition duration-500">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_25px_rgba(50,104,186,0.25)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-hands-holding-circle"></i>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 font-heading">የቀጥታ አሰልጣኝ ድጋፍ</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        ስልጠናው ከተጠናቀቀ በኋላም ቢሆን በእያንዳንዱ እርምጃዎ አብሮዎት የሚጓዝ የቀጥታ የአሰልጣኝ እና የኮሚዩኒቲ ድጋፍ።
                      </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-[#5a93e8]">
                      <span>ቀጣይነት ያለው ክትትል</span>
                      <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </div>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="relative p-[1px] rounded-3xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f9b03c]/40 via-transparent to-transparent opacity-40 group-hover:opacity-100 transition duration-500" />
                  <div className="relative rounded-[23px] bg-slate-900/80 backdrop-blur-xl p-8 h-full flex flex-col justify-between border border-white/10 group-hover:border-[#f9b03c]/40 transition duration-500">
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_25px_rgba(249,176,60,0.25)] group-hover:scale-110 transition duration-300">
                        <i className="fa-solid fa-brain"></i>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 font-heading">ዘመናዊ AI ረዳት ቴክኖሎጂ</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        በመማሪያ ክፍልዎ ውስጥ ማንኛውንም ጥያቄ 24/7 በድምፅ እና በጽሑፍ የሚመልስ ልዩ ፀሐይ AI ቱተር።
                      </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-white/10 flex items-center gap-2 text-xs font-bold text-[#f9b03c]">
                      <span>ብልህ የመማሪያ ሲስተም</span>
                      <i className="fa-solid fa-arrow-right text-[10px]"></i>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                5. FOUNDERS & LEADERSHIP TEAM (3D HOVER CARDS)
               ========================================================================= */}
            <div className="mb-24 sm:mb-32">
              <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black mb-3">
                  <i className="fa-solid fa-users text-[10px]"></i>
                  <span>የአመራር ቡድናችን</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white font-heading">
                  የፀሐይ ካምፓስ መሥራቾች
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                
                {/* Eyob Sahle */}
                <div className="relative p-[2px] rounded-3xl overflow-hidden group hover:-translate-y-3 transition-all duration-500">
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#f9b03c_320deg,#ffe066_355deg,#ffffff_360deg)] animate-border-beam opacity-70 group-hover:opacity-100 pointer-events-none" />
                  <div className="relative rounded-[calc(1.5rem-2px)] bg-slate-900/90 backdrop-blur-2xl p-8 flex flex-col items-center text-center border border-white/10">
                    <div className="relative w-36 h-36 rounded-full overflow-hidden mb-6 border-4 border-[#f9b03c]/40 shadow-[0_0_30px_rgba(249,176,60,0.4)] group-hover:scale-105 transition duration-500">
                      <img 
                        src="/assets/eyob_white.jpg" 
                        alt="Eyob Sahle" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=Eyob+Sahle&background=F9B03C&color=000&size=200'; }}
                      />
                    </div>
                    <h3 className="text-2xl font-black text-white font-heading mb-1 notranslate">ኢዮብ ሳህሌ (Eyob Sahle)</h3>
                    <div className="inline-block px-3 py-1 rounded-full bg-[#f9b03c]/15 text-[#f9b03c] text-xs font-bold mb-4 border border-[#f9b03c]/30">
                      መሥራች እና ዋና አሰልጣኝ (Founder & Lead Instructor)
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      በዲጂታል ቢዝነስ እና በዩቲዩብ ቻናል ግንባታ የበርካታ ዓመታት ልምድ ያለው፣ ከዜሮ ተነስተው ስኬታማ የሆኑ ቻናሎችን ያስተዳደረ ባለሙያ።
                    </p>
                  </div>
                </div>

                {/* Ribka Teshome */}
                <div className="relative p-[2px] rounded-3xl overflow-hidden group hover:-translate-y-3 transition-all duration-500">
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#3268ba_320deg,#00f2fe_355deg,#ffffff_360deg)] animate-border-beam opacity-70 group-hover:opacity-100 pointer-events-none" />
                  <div className="relative rounded-[calc(1.5rem-2px)] bg-slate-900/90 backdrop-blur-2xl p-8 flex flex-col items-center text-center border border-white/10">
                    <div className="relative w-36 h-36 rounded-full overflow-hidden mb-6 border-4 border-[#3268ba]/40 shadow-[0_0_30px_rgba(50,104,186,0.4)] group-hover:scale-105 transition duration-500">
                      <img 
                        src="/assets/ribka2.jpg" 
                        alt="Ribka Teshome" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=Ribka+Teshome&background=3268BA&color=fff&size=200'; }}
                      />
                    </div>
                    <h3 className="text-2xl font-black text-white font-heading mb-1 notranslate">ርብቃ ተሾመ (Ribka Teshome)</h3>
                    <div className="inline-block px-3 py-1 rounded-full bg-[#3268ba]/15 text-[#5a93e8] text-xs font-bold mb-4 border border-[#3268ba]/30">
                      ዋና ስራ አስኪያጅ (General Manager)
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      የስራ አመራር እና የተማሪዎች ድጋፍ መሪ፣ የተማሪዎችን ውጤታማነት እና የካምፓሱን አጠቃላይ ስራዎች በበላይነት የምትመራ።
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* =========================================================================
                6. VIDEO REELS & COMMUNITY SHOWCASE
               ========================================================================= */}
            <div className="mt-20">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 text-[#f9b03c] text-xs font-black mb-3">
                  <i className="fa-solid fa-clapperboard text-[10px]"></i>
                  <span>የካምፓሳችን ቅንጭብ ቪዲዮዎች</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white font-heading">
                  ከተግባራዊ እንቅስቃሴዎቻችን
                </h2>
              </div>

              {/* 2 Clean Vertical Reels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto mb-12">
                <AboutShortVideo src="/assets/videos/Tsehay.mp4" title="ፀሐይ ካምፓስ በጨረፍታ" />
                <AboutShortVideo src="/assets/videos/Marketing%20and%20psyco.mp4" title="የማርኬቲንግ እና ስኬት ሚስጥሮች" />
              </div>

              {/* Banner Style Team Photo */}
              <div className="rounded-3xl overflow-hidden shadow-2xl group w-full h-72 sm:h-96 md:h-[460px] bg-black relative border border-white/10 max-w-4xl mx-auto">
                <img 
                  src="https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700" 
                  alt="Tsehay Campus Team" 
                  onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6 sm:p-8">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-white font-heading mb-1">
                      ፀሐይ ካምፓስ - የእርስዎ የዲጂታል ስኬት አጋር
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300">
                      በአንድነት የምንማርበት፣ የምናድግበት እና የምንለወጥበት ታላቅ ቤተሰብ!
                    </p>
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
// 🌟 3D ANAMORPHIC POP-OUT BILLBOARD ("የኔ አድ" 3D NAKED-EYE STAGE)
// =========================================================================
function Anamorphic3DBillboard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Tilt calculations
    const rotX = ((y - centerY) / centerY) * -14;
    const rotY = ((x - centerX) / centerX) * 16;
    
    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div 
      className="relative w-full max-w-[440px] aspect-[4/5] flex items-center justify-center select-none"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic Ambient Ground Glow */}
      <div className="absolute -bottom-10 inset-x-8 h-20 bg-gradient-to-r from-[#f9b03c]/40 via-[#3268ba]/40 to-[#f9b03c]/40 blur-3xl -z-10 animate-pulse" />

      {/* 3D Tilted Chamber */}
      <div
        ref={cardRef}
        onMouseMove={(e) => { setIsHovered(true); handleMouseMove(e); }}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-full rounded-[2.5rem] transition-transform duration-200 ease-out cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.03 : 1}, ${isHovered ? 1.03 : 1}, 1)`
        }}
      >
        {/* Layer 1: Background Cyber Frame (The Anamorphic Billboard Box) */}
        <div 
          className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-[#060a14]/95 to-slate-950/95 border-2 border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Inner Depth Grid Perspective */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(249,176,60,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(50,104,186,0.3) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
          
          {/* Neon Light Floor Ring */}
          <div className="absolute -bottom-24 -inset-x-12 h-48 bg-gradient-to-t from-[#f9b03c]/30 to-transparent rounded-full blur-xl" />

          {/* Top Billboard Tech Header */}
          <div className="absolute top-4 inset-x-5 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-[11px] font-black tracking-widest text-[#f9b03c] uppercase font-mono">3D ANAMORPHIC STAGE</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">TSEHAY-3D</span>
          </div>
        </div>

        {/* Layer 2: Floating 3D Background Holographic Halo */}
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full border-2 border-dashed border-[#f9b03c]/40 animate-spin pointer-events-none"
          style={{ 
            transform: 'translateZ(40px) translateX(-50%)',
            animationDuration: '20s'
          }}
        />

        {/* Layer 3: THE POP-OUT HERO SUBJECT (Breaks out of the frame into the room!) */}
        <div 
          className="absolute inset-x-0 bottom-0 top-6 flex items-end justify-center pointer-events-none"
          style={{ 
            transform: 'translateZ(85px)',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <img 
            src="/assets/eyob_new.png" 
            alt="Eyob Sahle 3D" 
            className="w-[92%] h-[115%] object-contain object-bottom drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] -translate-y-6 group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/eyob_white.jpg';
            }}
          />
        </div>

        {/* Layer 4: Floating 3D Gold YouTube Diamond Badge (Pop-Out Left) */}
        <div 
          className="absolute top-20 -left-4 sm:-left-6 bg-slate-900/90 backdrop-blur-xl border border-[#f9b03c]/50 p-3.5 rounded-2xl shadow-[0_15px_35px_rgba(249,176,60,0.4)] flex items-center gap-3 pointer-events-none"
          style={{ 
            transform: 'translateZ(110px)',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-300 to-yellow-200 text-slate-950 flex items-center justify-center text-lg shadow-lg">
            <i className="fa-brands fa-youtube"></i>
          </div>
          <div>
            <div className="text-[11px] font-black text-white leading-tight">100% FACELESS</div>
            <div className="text-[9px] font-bold text-[#f9b03c]">የተረጋገጠ ስኬት</div>
          </div>
        </div>

        {/* Layer 5: Floating 3D AI Neural Orb Badge (Pop-Out Right) */}
        <div 
          className="absolute bottom-20 -right-4 sm:-right-6 bg-slate-900/90 backdrop-blur-xl border border-[#3268ba]/50 p-3.5 rounded-2xl shadow-[0_15px_35px_rgba(50,104,186,0.4)] flex items-center gap-3 pointer-events-none"
          style={{ 
            transform: 'translateZ(120px)',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3268ba] via-blue-400 to-cyan-300 text-white flex items-center justify-center text-lg shadow-lg">
            <i className="fa-solid fa-brain"></i>
          </div>
          <div>
            <div className="text-[11px] font-black text-white leading-tight">ፀሐይ AI ቱተር</div>
            <div className="text-[9px] font-bold text-cyan-300">24/7 የድምፅ ረዳት</div>
          </div>
        </div>

        {/* Layer 6: Floating 3D Glass Pedestal Footer */}
        <div 
          className="absolute bottom-4 inset-x-5 bg-black/75 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center justify-between pointer-events-none shadow-2xl"
          style={{ 
            transform: 'translateZ(95px)',
            transition: 'transform 0.2s ease-out'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black text-white">ኢዮብ ሳህሌ</span>
          </div>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40">
            ዋና አሰልጣኝ
          </span>
        </div>

      </div>
    </div>
  );
}

// =========================================================================
// 🌟 DYNAMIC HERO VIDEO PLAYER
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
              videoUrl: parsed.videoUrl || '',
              title: parsed.title || '',
              thumbnail: parsed.thumbnail || ''
            };
          }
        }
      } catch (e) {}
    }
    return {
      videoUrl: '',
      title: '',
      thumbnail: ''
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
              videoUrl: data.videoUrl || '',
              title: data.title || '',
              thumbnail: data.thumbnail || ''
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
  const yId = extractYouTubeId(videoData.videoUrl);
  const customThumb = videoData.thumbnail?.trim();
  
  const activeThumbnail = customThumb 
    ? parseImageUrl(customThumb) 
    : (yId ? `https://img.youtube.com/vi/${yId}/maxresdefault.jpg` : '/assets/hero-bg-new.jpg');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative rounded-[2.5rem] p-[2px] overflow-hidden group shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#f9b03c_320deg,#ffe066_355deg,#ffffff_360deg)] animate-border-beam opacity-80 group-hover:opacity-100 pointer-events-none" />

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
                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/hero-bg-new.jpg'; }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 group-hover:bg-black/10 transition-colors duration-500"></div>

              {/* Centered Glowing Play Button */}
              <div className="relative z-20 flex items-center justify-center pointer-events-none">
                <span className="absolute w-24 h-24 rounded-full bg-[#f9b03c]/40 animate-ping pointer-events-none"></span>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_50px_rgba(249,176,60,0.9)] group-hover:scale-110 transition-all duration-300">
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
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
                  allowFullScreen
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
// 🌟 CLEAN REEL VIDEO CARD
// =========================================================================
function AboutShortVideo({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div 
      onClick={togglePlayPause}
      className="rounded-3xl overflow-hidden shadow-2xl group aspect-[9/16] bg-slate-950 relative cursor-pointer select-none border border-white/15 transition-all duration-300 hover:shadow-[0_0_35px_rgba(249,176,60,0.35)] hover:-translate-y-1.5"
    >
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.currentTime = 0;
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
      >
        <source src={src} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>

      {/* Title Badge */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
        <span className="inline-block px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-white/20 shadow-md">
          {title}
        </span>
      </div>

      {/* Play/Pause Button */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 transform ${
        isPlaying ? 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100' : 'opacity-100 scale-100'
      }`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl backdrop-blur-md ${
          isPlaying 
            ? 'bg-black/70 border-2 border-[#f9b03c] text-[#f9b03c]' 
            : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 group-hover:scale-110 shadow-[0_0_35px_rgba(249,176,60,0.8)]'
        }`}>
          {isPlaying ? (
            <i className="fa-solid fa-pause text-xl"></i>
          ) : (
            <i className="fa-solid fa-play text-xl ml-1"></i>
          )}
        </div>
      </div>
    </div>
  );
}
