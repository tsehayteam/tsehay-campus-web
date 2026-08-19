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
    if (!videos[currentIndex]) return;
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
  }, [currentIndex, videos]);

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
    <section className="bg-[#050810] py-14 sm:py-20 text-white relative overflow-hidden border-b border-white/5 select-none">
      {/* Background Ambient Glows */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-[#f9b03c]/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header: Title & YouTube Channel Link */}
        <div className="flex items-center justify-between gap-4 mb-8 sm:mb-12">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-inner">
              <i className="fa-brands fa-youtube text-xl sm:text-2xl"></i>
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
            className="text-gray-300 hover:text-[#f9b03c] transition-colors duration-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 group shrink-0 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10"
          >
            <span>ሁሉንም እይ</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>

        {/* 16:9 Horizontal Long-Form 3D Coverflow Carousel Container */}
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
                      ? 'z-20 scale-100 opacity-100 border-2 border-[#f9b03c] shadow-[0_0_40px_rgba(249,176,60,0.4),0_15px_40px_rgba(0,0,0,0.8)] translate-x-0 rotate-y-0'
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

      {/* Fullscreen Video Modal for Deep Viewing */}
      {selectedModalVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedModalVideo(null)}
        >
          <div
            className="bg-[#0c101d] border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative"
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
                  src={`https://www.youtube.com/embed/${selectedModalVideo.youtubeId || extractYouTubeId(selectedModalVideo.youtubeUrl)}?autoplay=1&rel=0&modestbranding=1`}
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
                href={selectedModalVideo.youtubeUrl || `https://www.youtube.com/watch?v=${selectedModalVideo.youtubeId}`}
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
