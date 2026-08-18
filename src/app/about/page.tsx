// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';

export default function About() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  return (
    <>
    <main>
    <section id="about" className="py-24 relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-dark dark:to-darkCard border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
                <h2 className="font-heading font-black text-4xl sm:text-5xl text-dark dark:text-white mb-4">{t('about_us_page')}</h2>
                <div className="w-20 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>

            
            <div className="max-w-4xl mx-auto mb-16">
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video flex items-center justify-center group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <iframe id="about-youtube-player" className="w-full h-full relative z-10 rounded-[2rem]" src="https://www.youtube.com/embed/mgdOMtW6J8k?rel=0&modestbranding=1&showinfo=0&autoPlay=1&mute=1&vq=hd1080" title="Tsehay Campus Introduction" frameBorder="0" allow="accelerometer; autoPlay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
            </div>

            
            <div className="max-w-4xl mx-auto mb-24">
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

            
            <div className="max-w-3xl mx-auto mb-24 text-center">
                <h3 className="text-2xl font-bold font-heading text-primary mb-4">{t('mission_title')}</h3>
                <p className="text-xl sm:text-2xl font-bold text-dark dark:text-white leading-relaxed">
                    {t('mission_desc')}
                </p>
            </div>

            
            <div className="mb-24">
                <h3 className="text-2xl font-bold font-heading text-dark dark:text-white mb-8 text-center">{t('what_we_do_title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-900/20 text-secondary dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-laptop-code"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_1_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_1_desc')}</p>
                    </div>
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-orange-50 dark:bg-orange-900/20 text-primary rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-users-rays"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_2_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_2_desc')}</p>
                    </div>
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer">
                        <div className="w-16 h-16 mx-auto bg-green-50 dark:bg-green-900/20 text-success rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fa-solid fa-robot"></i></div>
                        <h4 className="font-bold text-dark dark:text-white text-lg mb-2">{t('wwd_3_title')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('wwd_3_desc')}</p>
                    </div>
                </div>
            </div>

            
            <div className="mb-24">
                <h3 className="text-2xl font-bold font-heading text-dark dark:text-white mb-8 text-center">{t('our_team_title')}</h3>
                <div className="flex flex-wrap justify-center gap-6">
                    
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                            <img src="/assets/eyob_new2.png" alt="Eyob Sahle" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Eyob+Sahle&background=000000&color=fff&size=128' }} />
                        </div>
                        <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ኢዮብ ሳህሌ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Owner & Lead Instructor</p>
                    </div>
                    {/* Ribka Teshome */}
                    <div className="bg-white dark:bg-dark border border-gray-100 dark:border-gray-800 p-8 rounded-2xl text-center hover:-translate-y-3 transition-all duration-500 shadow-md hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 cursor-pointer w-full sm:w-64">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                            <img src="/assets/ribka2.jpg" alt="Ribka Teshome" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=Ribka+Teshome&background=000000&color=fff&size=128' }} />
                        </div>
                        <h4 className="font-bold text-dark dark:text-white text-lg notranslate">ርብቃ ተሾመ</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">General Manager</p>
                    </div>
                </div>
            </div>

            
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <AboutShortVideo src="/assets/videos/Tsehay.mp4" />
                    <AboutShortVideo src="/assets/videos/Marketing%20and%20psyco.mp4" />
                </div>
                <div className="rounded-3xl overflow-hidden shadow-xl group w-full h-64 md:h-96 bg-black relative">
                    <img src="https://i.postimg.cc/qvqt1bJK/about-photo-1.jpg" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Team" onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop' }} />
                </div>
            </div>
        </div>
    </section>
    </main>
    </>
  );
}

function AboutShortVideo({ src }: { src: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isUnmuted, setIsUnmuted] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Auto-play on mobile when in viewport, auto-pause when scrolled away
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          if (entry.isIntersecting) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {});
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.45 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!videoRef.current) return;
    videoRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {});
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!videoRef.current) return;
    // On desktop, pause on mouse leave unless user explicitly unmuted and wants to keep watching
    if (!isUnmuted) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlaybackAndSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (!isUnmuted) {
      // Unmute and ensure it's playing
      videoRef.current.muted = false;
      videoRef.current.play().then(() => {
        setIsUnmuted(true);
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video play error:', err);
      });
    } else {
      // Toggle mute
      videoRef.current.muted = true;
      setIsUnmuted(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={togglePlaybackAndSound}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rounded-3xl overflow-hidden shadow-2xl group aspect-[9/16] bg-slate-950 relative cursor-pointer select-none border border-slate-800 hover:border-amber-400/50 transition-all duration-500 hover:shadow-amber-400/10"
    >
      {/* Top Floating Sound Status Pill */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto">
        <button
          onClick={togglePlaybackAndSound}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all duration-300 cursor-pointer shadow-lg ${
            isUnmuted 
              ? 'bg-amber-400 text-dark font-black scale-105 shadow-amber-400/30' 
              : 'bg-black/60 text-white/90 border border-white/20 hover:bg-black/80'
          }`}
        >
          <i className={`fa-solid ${isUnmuted ? 'fa-volume-high text-dark animate-pulse' : 'fa-volume-xmark text-amber-400'}`}></i>
          <span>{isUnmuted ? 'ድምፅ በርቷል' : 'ድምፅ ክፈት'}</span>
        </button>
      </div>

      {/* Center Interactive Overlay (Fades out cleanly when playing or hovered) */}
      <div 
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-500 bg-black/35 ${
          isPlaying && (isHovered || isUnmuted)
            ? 'opacity-0 pointer-events-none' 
            : 'opacity-100'
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-amber-400/90 text-dark flex items-center justify-center text-2xl mb-3 shadow-xl shadow-amber-400/30 group-hover:scale-110 transition-transform duration-300">
          <i className={`fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play pl-1'}`}></i>
        </div>
        <span className="text-white font-black text-sm sm:text-base drop-shadow-lg tracking-wide bg-black/60 px-4 py-1.5 rounded-full border border-white/10">
          {isPlaying ? 'ድምፅ ለማብራት ይጫኑ' : 'ለመመልከት ይጫኑ'}
        </span>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        loop
        muted={!isUnmuted}
        playsInline
        webkit-playsinline="true"
        preload="metadata"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 relative z-10"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Bottom Progress Glow Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-primary to-yellow-300 z-20 opacity-75"></div>
    </div>
  );
}
