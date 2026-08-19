'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ShowcaseVideo {
  id: string;
  title: string;
  badge: string;
  author: string;
  videoSrc?: string;
  youtubeId?: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  youtubeUrl: string;
}

const SHOWCASE_VIDEOS: ShowcaseVideo[] = [
  {
    id: 'vid-1',
    title: 'ተግባራዊ የቲክቶክ እና የዲጂታል ገበያ ማስተርክላስ',
    badge: 'TIKTOK WORKSHOP IN HAWASSA',
    author: 'Eyob Sahle • Tsehay Campus',
    videoSrc: '/assets/videos/Marketing and psyco.mp4',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: '/assets/eyob_new.png',
    duration: '14:20',
    views: '85K+ እይታ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-2',
    title: 'የስኬት ሚስጥሮች - ከዜሮ ወደ ከፍተኛ ገቢ መድረሻ',
    badge: 'TSEHAY CAMPUS EXCLUSIVE',
    author: 'Tsehay Campus Masterclass',
    videoSrc: '/assets/videos/Tsehay.mp4',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: '/assets/hero-bg-new.jpg',
    duration: '22:45',
    views: '120K+ እይታ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-3',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች እና ገቢ ማግኛ መንገዶች',
    badge: 'YOUTUBE SECRETS (ክፍል 1)',
    author: 'Eyob Sahle',
    videoSrc: '/assets/for_landing_page_first.mp4',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: '/assets/eyob_new2.png',
    duration: '18:10',
    views: '94K+ እይታ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-4',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ አሰራር',
    badge: 'SHEIN IMPORT MASTERCLASS',
    author: 'Tsehay Team',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
    duration: '26:30',
    views: '67K+ እይታ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-5',
    title: 'ዲጂታል ማርኬቲንግ እና AI ለጀማሪዎች',
    badge: 'DIGITAL MARKETING & AI',
    author: 'Eyob Sahle & AI Master',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    duration: '31:15',
    views: '110K+ እይታ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
];

export default function YouTubeVideoSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedModalVideo, setSelectedModalVideo] = useState<ShowcaseVideo | null>(null);
  
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const touchStartX = useRef<number | null>(null);

  const total = SHOWCASE_VIDEOS.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Sync video play/pause on index change
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const vid = videoRefs.current[key];
      if (vid) {
        if (key === SHOWCASE_VIDEOS[currentIndex].id) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [currentIndex]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
    const activeVid = videoRefs.current[SHOWCASE_VIDEOS[currentIndex].id];
    if (activeVid) {
      activeVid.muted = !isMuted;
    }
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const activeVid = videoRefs.current[SHOWCASE_VIDEOS[currentIndex].id];
    if (activeVid) {
      if (activeVid.paused) {
        activeVid.play();
        setIsPlaying(true);
      } else {
        activeVid.pause();
        setIsPlaying(false);
      }
    } else {
      setSelectedModalVideo(SHOWCASE_VIDEOS[currentIndex]);
    }
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section className="bg-[#050810] py-16 sm:py-24 text-white relative overflow-hidden border-b border-white/5 select-none">
      {/* Background Matrix Dots & Ambient Glows */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f9b03c]/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-[#3268ba]/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header: Title & YouTube Channel Link */}
        <div className="flex items-center justify-between gap-4 mb-8 sm:mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-inner">
              <i className="fa-brands fa-youtube text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-heading">
                ነፃ የ <span className="text-[#f9b03c]">ዩቲዩብ</span> ስልጠናዎቻችን
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                በኢዮብ ሳህሌ እና በፀሐይ ካምፓስ የተዘጋጁ ልዩ የተመረጡ ቪዲዮዎች
              </p>
            </div>
          </div>

          <a
            href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-[#f9b03c] transition-colors duration-300 text-sm sm:text-[15px] font-bold flex items-center gap-1.5 group shrink-0"
          >
            <span>ሁሉንም እይ</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>

        {/* 3D Coverflow Carousel Container */}
        <div 
          className="relative w-full h-[520px] sm:h-[600px] md:h-[650px] flex items-center justify-center perspective-[1200px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation Arrow: Left */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Video"
            className="absolute left-2 sm:left-6 lg:left-12 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#121722]/90 hover:bg-[#f9b03c] text-white hover:text-black border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 active:scale-90 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
          </button>

          {/* Navigation Arrow: Right */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Video"
            className="absolute right-2 sm:right-6 lg:right-12 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#121722]/90 hover:bg-[#f9b03c] text-white hover:text-black border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 active:scale-90 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-right text-sm sm:text-base"></i>
          </button>

          {/* Video Cards with 3D Pop-up / Coverflow Effect */}
          <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-[480px] sm:h-[570px] md:h-[620px] flex items-center justify-center">
            {SHOWCASE_VIDEOS.map((video, idx) => {
              // Calculate offset relative to current index
              let offset = (idx - currentIndex + total) % total;
              if (offset > total / 2) {
                offset -= total;
              }

              const isCenter = offset === 0;
              const isLeft = offset === -1 || (currentIndex === 0 && idx === total - 1);
              const isRight = offset === 1 || (currentIndex === total - 1 && idx === 0);
              const isVisible = Math.abs(offset) <= 1;

              if (!isVisible) return null;

              return (
                <div
                  key={video.id}
                  onClick={() => {
                    if (isCenter) {
                      setSelectedModalVideo(video);
                    } else {
                      goToSlide(idx);
                    }
                  }}
                  className={`absolute inset-0 rounded-[28px] overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
                    isCenter
                      ? 'z-20 scale-100 opacity-100 border-2 border-[#f9b03c] shadow-[0_0_45px_rgba(249,176,60,0.45),0_15px_40px_rgba(0,0,0,0.8)] translate-x-0 rotate-y-0'
                      : isLeft
                      ? 'z-10 scale-[0.84] opacity-35 brightness-50 -translate-x-[65%] sm:-translate-x-[68%] -rotate-y-[12deg] shadow-2xl hover:opacity-60'
                      : 'z-10 scale-[0.84] opacity-35 brightness-50 translate-x-[65%] sm:translate-x-[68%] rotate-y-[12deg] shadow-2xl hover:opacity-60'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Background Image / Poster */}
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* HTML5 Video Element if available & active */}
                  {video.videoSrc && (
                    <video
                      ref={(el) => { videoRefs.current[video.id] = el; }}
                      src={video.videoSrc}
                      poster={video.thumbnail}
                      playsInline
                      muted={isMuted}
                      loop
                      autoPlay={isCenter}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        isCenter ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  )}

                  {/* Dark Gradient Overlay for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/40 pointer-events-none"></div>

                  {/* Top Bar: Badges & View Count */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <span className="bg-red-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow flex items-center gap-1.5 backdrop-blur-xs">
                      <i className="fa-brands fa-youtube text-[11px]"></i>
                      <span>MASTERCLASS</span>
                    </span>

                    {video.views && (
                      <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10">
                        {video.views}
                      </span>
                    )}
                  </div>

                  {/* Center Audio / Unmute Toggle for Active Card */}
                  {isCenter && (
                    <div 
                      onClick={toggleMute}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 group/btn cursor-pointer"
                    >
                      <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-black/60 hover:bg-[#f9b03c] border border-white/20 hover:border-[#f9b03c] backdrop-blur-md flex items-center justify-center text-white hover:text-black transition-all duration-300 shadow-[0_0_25px_rgba(0,0,0,0.7)] group-hover/btn:scale-110">
                        <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-lg sm:text-xl pl-0.5`}></i>
                      </div>
                      <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-gray-200 backdrop-blur-md">
                        {isMuted ? 'CLICK TO UNMUTE' : 'MUTED'}
                      </span>
                    </div>
                  )}

                  {/* Bottom Video Information & Badges matching Screenshot */}
                  <div className="absolute bottom-5 left-4 right-4 z-10">
                    {/* Badge / Workshop Tag */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 bg-[#f9b03c]/20 border border-[#f9b03c]/40 px-2 py-0.5 rounded-md text-[#f9b03c] text-[10px] font-black tracking-wide">
                        <i className="fa-solid fa-bolt text-[9px]"></i>
                        <span>{video.badge}</span>
                      </div>
                      
                      {/* Brand Logo Watermark */}
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Tsehay Campus
                      </span>
                    </div>

                    {/* Main Title */}
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                      {video.title}
                    </h3>

                    {/* Author & Full Play CTA */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
                      <span className="line-clamp-1 text-[11px] text-gray-400">
                        {video.author}
                      </span>
                      <span className="text-[#f9b03c] font-black text-[11px] flex items-center gap-1 shrink-0">
                        <span>ሙሉውን እይ</span>
                        <i className="fa-solid fa-play text-[9px]"></i>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Pill Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
          {SHOWCASE_VIDEOS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToSlide(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentIndex
                  ? 'w-8 bg-[#f9b03c] shadow-[0_0_10px_rgba(249,176,60,0.6)]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen Video Modal for Deep Viewing */}
      {selectedModalVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedModalVideo(null)}
        >
          <div
            className="bg-[#0c101d] border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-2.5">
                <i className="fa-brands fa-youtube text-red-500 text-lg"></i>
                <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                  {selectedModalVideo.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Video Player Embed / Direct MP4 */}
            <div className="relative aspect-video w-full bg-black">
              {selectedModalVideo.videoSrc ? (
                <video
                  src={selectedModalVideo.videoSrc}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedModalVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={selectedModalVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/30">
              <div className="text-xs text-gray-400 text-center sm:text-left">
                ተጨማሪ ነፃ የቢዝነስ፣ የቲክቶክ እና የቴክኖሎጂ ስልጠናዎችን በዩቲዩብ ቻናላችን ይከታተሉ።
              </div>
              <a
                href={selectedModalVideo.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all duration-200 active:scale-95"
              >
                <i className="fa-brands fa-youtube"></i>
                <span>በዩቲዩብ ይመልከቱ</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
