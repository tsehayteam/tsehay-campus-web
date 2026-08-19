'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface YouTubeItem {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId?: string;
  thumbnail?: string;
  videoSrc?: string;
  order?: number;
}

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

export function getYouTubeThumbnail(youtubeId?: string, customThumb?: string): string {
  if (customThumb && customThumb.trim()) return customThumb;
  if (youtubeId && youtubeId.trim()) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  return '/assets/hero-bg-new.jpg';
}

const DEFAULT_VIDEOS: YouTubeItem[] = [
  {
    id: 'yt-1',
    title: 'ተግባራዊ የቲክቶክ እና የዲጂታል ገበያ ማስተርክላስ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
    youtubeId: 'B-s71n0dHUk',
    videoSrc: '/assets/videos/Marketing and psyco.mp4',
    thumbnail: '/assets/eyob_new.png',
  },
  {
    id: 'yt-2',
    title: 'የስኬት ሚስጥሮች - ከዜሮ ወደ ከፍተኛ ገቢ መድረሻ',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
    youtubeId: 'mgdOMtW6J8k',
    videoSrc: '/assets/videos/Tsehay.mp4',
    thumbnail: '/assets/hero-bg-new.jpg',
  },
  {
    id: 'yt-3',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች እና ገቢ ማግኛ መንገዶች',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
    youtubeId: 'B-s71n0dHUk',
    videoSrc: '/assets/for_landing_page_first.mp4',
    thumbnail: '/assets/eyob_new2.png',
  },
  {
    id: 'yt-4',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ አሰራር',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'yt-5',
    title: 'ዲጂታል ማርኬቲንግ እና AI ለጀማሪዎች',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function YouTubeVideoSlider() {
  const [videos, setVideos] = useState<YouTubeItem[]>(DEFAULT_VIDEOS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isGridView, setIsGridView] = useState(false);
  const [selectedModalVideo, setSelectedModalVideo] = useState<YouTubeItem | null>(null);

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const touchStartX = useRef<number | null>(null);

  // Real-time Firestore sync for dynamic YouTube videos from Admin
  useEffect(() => {
    try {
      const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'youtube_videos'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: YouTubeItem[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            const yId = data.youtubeId || extractYouTubeId(data.youtubeUrl || '');
            return {
              id: doc.id,
              title: data.title || 'ነፃ የዩቲዩብ ስልጠና',
              youtubeUrl: data.youtubeUrl || `https://www.youtube.com/watch?v=${yId}`,
              youtubeId: yId,
              thumbnail: data.thumbnail || getYouTubeThumbnail(yId, data.thumbnail),
              videoSrc: data.videoSrc || '',
              order: data.order ?? 0,
            };
          });
          setVideos(list);
        }
      }, (error) => {
        console.warn("Firestore youtube_videos listener fallback:", error);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore listener init failed:", e);
    }
  }, []);

  const total = videos.length || 1;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Sync HTML5 background video playback if local mp4 exists
  useEffect(() => {
    if (isGridView || !videos[currentIndex]) return;
    Object.keys(videoRefs.current).forEach((key) => {
      const vid = videoRefs.current[key];
      if (vid) {
        if (key === videos[currentIndex].id) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [currentIndex, videos, isGridView]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
    const activeVid = videoRefs.current[videos[currentIndex]?.id];
    if (activeVid) {
      activeVid.muted = !isMuted;
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

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <section id="youtube-section" className="bg-[#050810] py-14 sm:py-24 text-white relative overflow-hidden border-b border-white/5 select-none">
      {/* Background Ambient Glows */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-[#f9b03c]/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Animated Top Header: Title, Luxury Glowing Badge & Animated View-Toggle Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10 sm:mb-14">
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* 3D Animated Glowing YouTube Icon */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 via-[#f9b03c] to-red-600 opacity-75 blur-md group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#1b090a] via-[#101420] to-[#080b14] border border-red-500/40 flex items-center justify-center text-red-500 shadow-xl yt-glow-icon">
                <i className="fa-brands fa-youtube text-2xl sm:text-3xl text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"></i>
              </div>
            </div>

            <div>
              {/* Top Badge with Live Equalizer Animation */}
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/15 border border-red-500/30 text-red-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span>FREE MASTERCLASS</span>
                </span>
                
                {/* Audio wave bars */}
                <div className="hidden sm:flex items-center gap-0.5 h-3 px-1">
                  <span className="w-0.5 bg-[#f9b03c] rounded-full soundwave-bar-1"></span>
                  <span className="w-0.5 bg-[#f9b03c] rounded-full soundwave-bar-2"></span>
                  <span className="w-0.5 bg-[#f9b03c] rounded-full soundwave-bar-3"></span>
                </div>
              </div>

              {/* Title with Shimmering Gradient */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-heading flex items-center gap-2 flex-wrap">
                <span>ነፃ የ</span>
                <span className="yt-gradient-text">
                  ዩቲዩብ
                </span>
                <span>ስልጠናዎቻችን</span>
              </h2>
            </div>
          </div>

          {/* Toggle View: "ሁሉንም እይ" (Animates and Unfolds All Videos in Grid List) */}
          <button
            type="button"
            onClick={() => setIsGridView((prev) => !prev)}
            className="self-start sm:self-center text-gray-200 hover:text-[#f9b03c] transition-all duration-300 text-xs sm:text-sm font-black flex items-center gap-2.5 group shrink-0 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/15 hover:border-[#f9b03c]/50 shadow-md hover:shadow-[0_0_25px_rgba(249,176,60,0.3)] cursor-pointer active:scale-95"
          >
            <span>{isGridView ? 'ወደ ስላይደር መልስ (Slider)' : 'ሁሉንም እይ (ዝርዝር)'}</span>
            <i className={`fa-solid ${isGridView ? 'fa-sliders' : 'fa-table-cells-large'} text-xs sm:text-sm text-[#f9b03c] transition-transform duration-300 group-hover:scale-125`}></i>
          </button>
        </div>

        {/* View 1: ANIMATED FULL GRID / LIST VIEW OF ALL VIDEOS */}
        {isGridView ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in zoom-in-95 duration-500">
            {videos.map((video, idx) => {
              const thumbUrl = video.thumbnail || getYouTubeThumbnail(video.youtubeId, video.thumbnail);
              return (
                <div
                  key={video.id}
                  onClick={() => setSelectedModalVideo(video)}
                  className="group relative bg-[#0c101d] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-[#f9b03c] shadow-xl hover:shadow-[0_0_40px_rgba(249,176,60,0.35)] transition-all duration-400 cursor-pointer flex flex-col hover:-translate-y-2"
                >
                  {/* 16:9 Thumbnail Image Container */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                    <img
                      src={thumbUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        if (video.youtubeId) {
                          e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>

                    {/* Centered Glowing Round Play Icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/80 group-hover:bg-[#f9b03c] border-2 border-[#f9b03c]/90 flex items-center justify-center text-[#f9b03c] group-hover:text-black transition-all duration-300 shadow-[0_0_25px_rgba(249,176,60,0.5)] group-hover:scale-110">
                      <i className="fa-solid fa-play text-lg pl-0.5"></i>
                    </div>

                    {/* Top Index & Tag Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <i className="fa-brands fa-youtube text-[11px]"></i>
                        <span>#{idx + 1}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title & Watch CTA Bar */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#0e1322] to-[#080b13]">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-[#f9b03c] transition-colors duration-300 line-clamp-2 leading-snug">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs">
                      <span className="flex items-center gap-2 text-[#f9b03c] font-black text-xs uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                        ይመልከቱ (Play)
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#f9b03c] text-gray-300 group-hover:text-black flex items-center justify-center transition-all">
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View 2: 16:9 HORIZONTAL 3D COVERFLOW CAROUSEL */
          <div>
            <div 
              className="relative w-full h-[240px] sm:h-[360px] md:h-[430px] lg:h-[480px] flex items-center justify-center perspective-[1200px]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Navigation Arrow: Left */}
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous Video"
                className="absolute left-1 sm:left-4 lg:left-8 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#121722]/90 hover:bg-[#f9b03c] text-white hover:text-black border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 active:scale-90 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-sm sm:text-base"></i>
              </button>

              {/* Navigation Arrow: Right */}
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next Video"
                className="absolute right-1 sm:right-4 lg:right-8 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#121722]/90 hover:bg-[#f9b03c] text-white hover:text-black border border-white/20 hover:border-[#f9b03c] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 active:scale-90 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right text-sm sm:text-base"></i>
              </button>

              {/* 16:9 Video Cards with 3D Pop-up / Coverflow Effect */}
              <div className="relative w-full max-w-[320px] sm:max-w-[540px] md:max-w-[680px] lg:max-w-[780px] aspect-[16/9] flex items-center justify-center">
                {videos.map((video, idx) => {
                  let offset = (idx - currentIndex + total) % total;
                  if (offset > total / 2) {
                    offset -= total;
                  }

                  const isCenter = offset === 0;
                  const isLeft = offset === -1 || (currentIndex === 0 && idx === total - 1);
                  const isRight = offset === 1 || (currentIndex === total - 1 && idx === 0);
                  const isVisible = Math.abs(offset) <= 1;

                  if (!isVisible) return null;

                  const thumbUrl = video.thumbnail || getYouTubeThumbnail(video.youtubeId, video.thumbnail);

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
                      className={`absolute inset-0 aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
                        isCenter
                          ? 'z-20 scale-100 opacity-100 border-2 border-[#f9b03c] shadow-[0_0_45px_rgba(249,176,60,0.45),0_15px_40px_rgba(0,0,0,0.8)] translate-x-0 rotate-y-0'
                          : isLeft
                          ? 'z-10 scale-[0.82] opacity-35 brightness-50 -translate-x-[55%] sm:-translate-x-[58%] -rotate-y-[10deg] shadow-2xl hover:opacity-60'
                          : 'z-10 scale-[0.82] opacity-35 brightness-50 translate-x-[55%] sm:translate-x-[58%] rotate-y-[10deg] shadow-2xl hover:opacity-60'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      {/* Background 16:9 Thumbnail Image */}
                      <img
                        src={thumbUrl}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          if (video.youtubeId) {
                            e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                          }
                        }}
                      />

                      {/* HTML5 Video Element if direct video file provided */}
                      {video.videoSrc && (
                        <video
                          ref={(el) => { videoRefs.current[video.id] = el; }}
                          src={video.videoSrc}
                          poster={thumbUrl}
                          playsInline
                          muted={isMuted}
                          loop
                          autoPlay={isCenter}
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            isCenter ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      )}

                      {/* Subtle Dark Vignette for Cinematic Glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"></div>

                      {/* Center Audio / Unmute Toggle for Active Card (Clean & Prominent) */}
                      {isCenter && (
                        <div 
                          onClick={video.videoSrc ? toggleMute : () => setSelectedModalVideo(video)}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 group/btn cursor-pointer"
                        >
                          {/* Pulsing Round Action Button */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/75 hover:bg-[#f9b03c] border-2 border-[#f9b03c]/80 hover:border-[#f9b03c] backdrop-blur-md flex items-center justify-center text-white hover:text-black transition-all duration-300 shadow-[0_0_30px_rgba(249,176,60,0.5)] group-hover/btn:scale-110">
                            {video.videoSrc ? (
                              <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-lg sm:text-xl pl-0.5`}></i>
                            ) : (
                              <i className="fa-solid fa-play text-lg sm:text-xl text-[#f9b03c] group-hover/btn:text-black pl-1"></i>
                            )}
                          </div>

                          {/* Pill Badge: CLICK TO UNMUTE / ቪዲዮውን ክፈት */}
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/85 border border-[#f9b03c]/50 text-white backdrop-blur-md shadow-lg transition-transform group-hover/btn:scale-105">
                            <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-ping"></span>
                            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-[#f9b03c]">
                              {video.videoSrc ? (isMuted ? 'CLICK TO UNMUTE' : 'ድምፅ ተከፍቷል') : 'ይመልከቱ (CLICK TO PLAY)'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carousel Pill Pagination Dots */}
            <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
              {videos.map((_, i) => (
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
        )}
      </div>

      {/* Fullscreen Video Modal for Deep Viewing (Ultra-Clean, Luxury Standard, No Captions/Clutter) */}
      {selectedModalVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedModalVideo(null)}
        >
          <div
            className="bg-[#080b13] border border-white/15 rounded-3xl w-full max-w-4xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_40px_rgba(249,176,60,0.15)] relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Clean Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-black/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <i className="fa-brands fa-youtube text-base"></i>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                  {selectedModalVideo.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalVideo(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="ዝጋ (Close)"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Video Player Embed / Direct MP4 (Captions Disabled by Default: cc_load_policy=0 & iv_load_policy=3) */}
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
                  src={`https://www.youtube.com/embed/${selectedModalVideo.youtubeId || extractYouTubeId(selectedModalVideo.youtubeUrl)}?autoplay=1&rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3&playsinline=1&controls=1`}
                  title={selectedModalVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              )}
            </div>

            {/* Luxury Minimalist Modal Footer */}
            <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-black via-[#0a0d17] to-black border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c]"></span>
                <span className="font-medium text-gray-300">Tsehay Campus Masterclass</span>
              </div>
              <a
                href={selectedModalVideo.youtubeUrl || `https://www.youtube.com/watch?v=${selectedModalVideo.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm rounded-full shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_rgba(249,176,60,0.6)] border border-white/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <i className="fa-brands fa-youtube text-base text-white drop-shadow"></i>
                <span>በዩቲዩብ ይመልከቱ</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-0.5 opacity-80"></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes for Luxury Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .yt-gradient-text {
          background: linear-gradient(90deg, #f9b03c 0%, #ffe6a3 25%, #ff5252 50%, #f9b03c 75%, #ffe6a3 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ytShimmer 4s linear infinite;
        }
        @keyframes ytShimmer {
          to {
            background-position: 200% center;
          }
        }
        .yt-glow-icon {
          animation: ytPulse 3s ease-in-out infinite;
        }
        @keyframes ytPulse {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), 0 0 30px rgba(249, 176, 60, 0.2);
          }
          50% {
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.7), 0 0 45px rgba(249, 176, 60, 0.4);
          }
        }
        .soundwave-bar-1 {
          animation: soundwave 1s ease-in-out infinite;
        }
        .soundwave-bar-2 {
          animation: soundwave 1.2s ease-in-out infinite 0.2s;
        }
        .soundwave-bar-3 {
          animation: soundwave 0.9s ease-in-out infinite 0.4s;
        }
        @keyframes soundwave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}} />
    </section>
  );
}
