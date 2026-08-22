// @ts-nocheck
'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { parseVideoEmbedUrl, extractYouTubeId, parseImageUrl } from '@/lib/videoParser';

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

            {/* Main Video Presentation: Dynamic Player Connected to Admin Settings */}
            <AboutHeroPlayer />

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
            <div className="space-y-8 mt-16 sm:mt-24">
              <div className="text-center mb-8 sm:mb-12">
                <h3 className="text-2xl sm:text-3xl font-black text-dark dark:text-white mb-2 font-heading">
                  የተማሪዎቻችን እና የካምፓሳችን ቅንጭብ ቪዲዮዎች
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  አጫጭር የቪዲዮ ሪልሶች • Short Campus Life & Training Reels
                </p>
              </div>

              {/* Short Vertical Videos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <AboutShortVideo src="/assets/videos/Tsehay.mp4" />
                <AboutShortVideo src="/assets/videos/Marketing%20and%20psyco.mp4" />
              </div>

              {/* Banner Style Team Photo */}
              <div className="rounded-3xl overflow-hidden shadow-xl group w-full h-64 md:h-96 bg-black relative border border-gray-100 dark:border-gray-800 max-w-4xl mx-auto mt-8">
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
  const [isLoaded, setIsLoaded] = useState(false);

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
        setIsLoaded(true);
      }, (err) => {
        console.warn("About video listener error:", err);
        setIsLoaded(true);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("About video listener setup error:", e);
      setIsLoaded(true);
    }
  }, []);

  const parsed = parseVideoEmbedUrl(videoData.videoUrl, true);
  const yId = extractYouTubeId(videoData.videoUrl);
  const customThumb = videoData.thumbnail?.trim();
  
  const activeThumbnail = customThumb 
    ? parseImageUrl(customThumb) 
    : (yId ? `https://img.youtube.com/vi/${yId}/maxresdefault.jpg` : '');

  return (
    <div className="max-w-4xl mx-auto mb-16">
      <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video flex items-center justify-center group">
        <div className="absolute -inset-2 bg-gradient-to-r from-secondary to-primary rounded-[2.5rem] blur-xl opacity-25 group-hover:opacity-50 transition duration-500 pointer-events-none"></div>

        {!isPlaying ? (
          /* Clean Minimalist Thumbnail Card Screen */
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
            {/* Poster / Thumbnail Image with Instant Fallback */}
            {activeThumbnail ? (
              <img 
                src={activeThumbnail} 
                alt="Tsehay Campus Video" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
              </div>
            )}

            {/* Subtle Vignette Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:bg-black/10 transition-colors duration-500"></div>

            {/* Glowing Interactive Play Button (Clean & Centered) */}
            <div className="relative z-20 flex items-center justify-center pointer-events-none">
              <div className="relative flex items-center justify-center">
                {/* Ping ring */}
                <span className="absolute -inset-3 rounded-full bg-[#f9b03c]/35 animate-ping pointer-events-none"></span>
                <span className="absolute -inset-1.5 rounded-full bg-[#f9b03c]/25"></span>
                {/* Main Play Circle */}
                <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_40px_rgba(249,176,60,0.75)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(249,176,60,0.95)] transition-all duration-300">
                  <i className="fa-solid fa-play ml-1.5"></i>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Playing Video / Iframe */
          <div className="relative w-full h-full z-10">
            {parsed.type === 'video' ? (
              <video 
                id="about-html5-player"
                className="w-full h-full rounded-[2rem] object-cover" 
                src={parsed.src}
                autoPlay
                controls
                preload="auto"
                playsInline
                webkit-playsinline="true"
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
            ) : (
              <iframe 
                id="about-youtube-player" 
                className="w-full h-full rounded-[2rem]" 
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
  );
}

function AboutShortVideo({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Manual Play / Pause toggle on click/touch (NO automatic scroll autoplay)
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.muted = false;
      video.volume = 1.0;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback for browsers requiring muted initial interaction
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
      className="rounded-3xl overflow-hidden shadow-2xl group aspect-[9/16] bg-slate-950 relative cursor-pointer select-none border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-[0_0_35px_rgba(249,176,60,0.3)] active:scale-[0.99]"
      title={isPlaying ? "ለማቆም ይጫኑ (Click to Pause)" : "ለማጫወት ይጫኑ (Click to Play)"}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload noremoteplayback"
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
          }
        }}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Dark Subtle Edge Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none"></div>

      {/* Sleek Center Play/Pause Button */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 transform ${
        isPlaying 
          ? 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100' 
          : 'opacity-100 scale-100'
      }`}>
        <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center shadow-[0_0_35px_rgba(249,176,60,0.6)] backdrop-blur-md transition-all duration-300 ${
          isPlaying 
            ? 'bg-black/70 border-2 border-[#f9b03c] text-[#f9b03c]' 
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
