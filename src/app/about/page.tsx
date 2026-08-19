// @ts-nocheck
'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';

export default function About() {
  const { t } = useLanguage();

  return (
    <>
      <main className="min-h-screen flex flex-col bg-white dark:bg-dark">
        <section id="about" className="pt-28 sm:pt-36 pb-24 relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-dark dark:to-darkCard border-b border-gray-200 dark:border-gray-800 transition-colors duration-300 flex-1">

          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header Title */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="font-heading font-black text-3xl sm:text-5xl text-dark dark:text-white mb-4">
                {t('about_us_page')}
              </h2>
              <div className="w-20 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>

            {/* Main Video Presentation: 100% Crisp, Pure, No Giant Cover / No Captions */}
            <AboutHeroYouTube />

            {/* Our Story */}
            <div className="max-w-4xl mx-auto mb-20 sm:mb-24">
              <h3 className="text-2xl font-bold font-heading text-primary mb-4">{t('our_story_title')}</h3>
              <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-4">
                {t('our_story_p1')}
              </p>
              <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-8">
                {t('our_story_p2')}
              </p>
              <div className="flex flex-wrap gap-8">
                <div>
                  <h4 className="text-3xl font-black text-dark dark:text-white">500+</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-primary pl-2">{t('stat_students')}</p>
                </div>
                <div>
                  <h4 className="text-3xl font-black text-dark dark:text-white">100%</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-secondary pl-2">{t('stat_practical')}</p>
                </div>
                <div>
                  <h4 className="text-3xl font-black text-dark dark:text-white">24/7</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 border-l-2 border-success pl-2">{t('stat_ai')}</p>
                </div>
              </div>
            </div>

            {/* Mission */}
            <div className="max-w-3xl mx-auto mb-20 sm:mb-24 text-center">
              <h3 className="text-2xl font-bold font-heading text-primary mb-4">{t('mission_title')}</h3>
              <p className="text-xl sm:text-2xl font-bold text-dark dark:text-white leading-relaxed">
                {t('mission_desc')}
              </p>
            </div>

            {/* What We Do / Why Tsehay Campus Cards */}
            <div className="mb-20 sm:mb-24">
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-primary mb-8 text-center">
                {t('what_we_do_title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-[#f9b03c]/20 hover:border-[#f9b03c]/40 cursor-pointer">
                  <div className="w-16 h-16 mx-auto bg-[#f9b03c]/10 text-[#f9b03c] rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <h4 className="font-bold text-dark dark:text-white text-lg mb-3 leading-snug">{t('wwd_1_title')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('wwd_1_desc')}</p>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-[#3268ba]/20 hover:border-[#3268ba]/40 cursor-pointer">
                  <div className="w-16 h-16 mx-auto bg-[#3268ba]/10 text-[#3268ba] rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm">
                    <i className="fa-solid fa-people-group"></i>
                  </div>
                  <h4 className="font-bold text-dark dark:text-white text-lg mb-3 leading-snug">{t('wwd_2_title')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('wwd_2_desc')}</p>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-[#f9b03c]/20 hover:border-[#f9b03c]/40 cursor-pointer">
                  <div className="w-16 h-16 mx-auto bg-[#f9b03c]/10 text-[#f9b03c] rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </div>
                  <h4 className="font-bold text-dark dark:text-white text-lg mb-3 leading-snug">{t('wwd_3_title')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t('wwd_3_desc')}</p>
                </div>
              </div>
            </div>

            {/* Our Team */}
            <div className="mb-20 sm:mb-24">
              <h3 className="text-2xl font-bold font-heading text-dark dark:text-white mb-8 text-center">{t('our_team_title')}</h3>
              <div className="flex flex-wrap justify-center gap-6">
                {/* Eyob Sahle */}
                <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                    <img src="/assets/eyob_white.jpg" alt="Eyob Sahle" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Eyob+Sahle&background=000000&color=fff&size=128'; }} />
                  </div>
                  <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ኢዮብ ሳህሌ</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Owner & Lead Instructor</p>
                </div>

                {/* Ribka Teshome */}
                <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                    <img src="/assets/ribka2.jpg" alt="Ribka Teshome" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Ribka+Teshome&background=000000&color=fff&size=128'; }} />
                  </div>
                  <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ርብቃ ተሾመ</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">General Manager</p>
                </div>
              </div>
            </div>

            {/* Video Reels & Team/Community Photo Showcase */}
            <div className="space-y-6">
              {/* Short Vertical Videos with Sleek Floating Corner Sound Controller */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AboutShortVideo src="/assets/videos/Tsehay.mp4" title="Tsehay Campus Life" />
                <AboutShortVideo src="/assets/videos/Marketing%20and%20psyco.mp4" title="Marketing & Practical Training" />
              </div>

              {/* Previous Banner Style Photo */}
              <div className="rounded-3xl overflow-hidden shadow-xl group w-full h-64 md:h-96 bg-black relative border border-gray-100 dark:border-gray-800">
                <img 
                  src="https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-700" 
                  alt="Tsehay Campus Team" 
                  onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop'; }} 
                />
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function AboutHeroYouTube() {
  const [isUnmuted, setIsUnmuted] = useState(false);
  const [iframeSrc, setIframeSrc] = useState(
    'https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1&showinfo=0&autoplay=1&mute=1&vq=hd1080&cc_load_policy=0&cc_lang_pref=off&iv_load_policy=3&playsinline=1&controls=1&hl=en'
  );

  const handleUnmute = () => {
    setIsUnmuted(true);
    setIframeSrc(
      'https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1&showinfo=0&autoplay=1&mute=0&vq=hd1080&cc_load_policy=0&cc_lang_pref=off&iv_load_policy=3&playsinline=1&controls=1&hl=en'
    );
  };

  return (
    <div className="max-w-4xl mx-auto mb-16">
      <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video flex items-center justify-center group">
        <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <iframe 
          id="about-youtube-player" 
          className="w-full h-full relative z-10 rounded-[2rem]" 
          src={iframeSrc}
          title="Tsehay Campus Introduction" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>

        {/* Sleek Non-Intrusive Unmute Island Pill (Floating, Never Blocks the Video!) */}
        {!isUnmuted && (
          <button
            type="button"
            onClick={handleUnmute}
            className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-black/85 hover:bg-[#f9b03c] border border-[#f9b03c]/70 text-white hover:text-black shadow-[0_4px_25px_rgba(0,0,0,0.8),0_0_20px_rgba(249,176,60,0.5)] backdrop-blur-md transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-volume-high text-sm sm:text-base text-[#f9b03c] group-hover:text-black animate-pulse"></i>
            <span className="text-xs sm:text-sm font-black tracking-wide">ድምፅ ክፈት (Click to Unmute)</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AboutShortVideo({ src, title }: { src: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    // Fast immediate autoplay muted
    video.muted = true;
    video.play().catch(() => {});

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          if (entry.isIntersecting) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={toggleSound}
      className="rounded-3xl overflow-hidden shadow-2xl group aspect-[9/16] bg-slate-950 relative cursor-pointer select-none border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-[0_0_35px_rgba(249,176,60,0.3)]"
    >
      {/* HTML5 Video Element (100% Crisp & Visible!) */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Dark Subtle Edge Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none"></div>

      {/* Top Badge */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <span className="bg-black/70 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow">
          <i className="fa-solid fa-play text-primary text-[10px]"></i>
          <span>{title || 'Tsehay Campus'}</span>
        </span>
      </div>

      {/* Center Subtle Play/Sound Indicator on Hover */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-full bg-black/50 border border-white/20 text-[#f9b03c] flex items-center justify-center backdrop-blur-sm shadow-xl">
          <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-lg`}></i>
        </div>
      </div>

      {/* Floating Corner Sound Pill */}
      <div className="absolute bottom-4 right-4 z-20 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-[#f9b03c] border border-[#f9b03c]/60 text-white hover:text-black backdrop-blur-md shadow-lg transition-all flex items-center gap-2">
        <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-[#f9b03c]' : 'fa-volume-high text-green-400'} text-xs animate-pulse`}></i>
        <span className="text-[11px] font-black tracking-wide">
          {isMuted ? 'ድምፅ ክፈት (Unmute)' : 'SOUND ON'}
        </span>
      </div>

      {/* Bottom Brand Watermark */}
      <div className="absolute bottom-4 left-4 flex items-center z-10 pointer-events-none">
        <span className="text-[11px] text-gray-300 font-bold uppercase tracking-wider drop-shadow">
          Tsehay Campus
        </span>
      </div>
    </div>
  );
}
