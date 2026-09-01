'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import CinematicVideoModal from '@/components/CinematicVideoModal';

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
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (matchWatch && matchWatch[1]) return matchWatch[1];
  const matchYoutu = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (matchYoutu && matchYoutu[1]) return matchYoutu[1];
  const matchPath = trimmed.match(/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/i);
  if (matchPath && matchPath[1]) return matchPath[1];
  const matchAny11 = trimmed.match(/(?:[=/&?]|^)([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
  if (matchAny11 && matchAny11[1]) return matchAny11[1];
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
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
  },
  {
    id: 'yt-2',
    title: 'የስኬት ሚስጥሮች - ከዜሮ ወደ ከፍተኛ ገቢ መድረሻ',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
  },
  {
    id: 'yt-3',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች እና ገቢ ማግኛ መንገዶች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
  },
  {
    id: 'yt-4',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ አሰራር',
    youtubeUrl: 'https://www.youtube.com/watch?v=mgdOMtW6J8k',
    youtubeId: 'mgdOMtW6J8k',
    thumbnail: 'https://img.youtube.com/vi/mgdOMtW6J8k/hqdefault.jpg',
  },
  {
    id: 'yt-5',
    title: 'ዲጂታል ማርኬቲንግ እና AI ለጀማሪዎች',
    youtubeUrl: 'https://www.youtube.com/watch?v=B-s71n0dHUk',
    youtubeId: 'B-s71n0dHUk',
    thumbnail: 'https://img.youtube.com/vi/B-s71n0dHUk/hqdefault.jpg',
  },
];

export default function YouTubeVideoSlider() {
  const [videos, setVideos] = useState<YouTubeItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_youtube_videos_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {}
    }
    return DEFAULT_VIDEOS;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isGridView, setIsGridView] = useState(false);
  const [selectedModalVideo, setSelectedModalVideo] = useState<YouTubeItem | null>(null);

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const touchStartX = useRef<number | null>(null);

  // Real-time Firestore sync and server API fetch for dynamic YouTube videos from Admin
  useEffect(() => {
    // 1. Fail-Safe Server API Fetch
    const fetchApiVideos = async () => {
      try {
        const res = await fetch('/api/admin/youtube-videos');
        if (res.ok) {
          const data = await res.json();
          if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
            const list: YouTubeItem[] = data.videos.map((item: any) => {
              const yId = item.youtubeId || extractYouTubeId(item.youtubeUrl || '');
              return {
                id: item.id,
                title: item.title || 'ነፃ የዩቲዩብ ስልጠና',
                youtubeUrl: item.youtubeUrl || (yId ? `https://www.youtube.com/watch?v=${yId}` : ''),
                youtubeId: yId,
                thumbnail: item.thumbnail || getYouTubeThumbnail(yId, item.thumbnail),
                videoSrc: item.videoSrc || '',
                order: item.order ?? 0,
              };
            });
            setVideos(list);
            try {
              localStorage.setItem('tsehay_youtube_videos_cache', JSON.stringify(list));
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn("API YouTube fallback error:", e);
      }
    };
    fetchApiVideos();

    // 2. Real-time Firestore snapshot listener
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
              youtubeUrl: data.youtubeUrl || (yId ? `https://www.youtube.com/watch?v=${yId}` : ''),
              youtubeId: yId,
              thumbnail: data.thumbnail || getYouTubeThumbnail(yId, data.thumbnail),
              videoSrc: data.videoSrc || '',
              order: data.order ?? 0,
            };
          });
          setVideos(list);
          try {
            localStorage.setItem('tsehay_youtube_videos_cache', JSON.stringify(list));
          } catch (e) {}
        }
      }, (error) => {
        console.warn("Firestore youtube_videos listener fallback:", error);
        fetchApiVideos();
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
    <section id="youtube-section" className="bg-[#050810]/75 backdrop-blur-xs py-14 sm:py-24 text-white relative overflow-hidden border-b border-white/5 select-none">
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
        
        {/* Animated Top Header: Title & Luxury Glowing Clickable YouTube Badge */}
        <div className="flex items-center justify-between gap-5 mb-10 sm:mb-14">
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* 3D Animated Glowing YouTube Icon (Clickable -> Opens YouTube Channel) */}
            <a
              href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X"
              target="_blank"
              rel="noopener noreferrer"
              title="የእዮብ ሳህለ ይፋዊ የዩቲዩብ ቻናልን ይጎብኙ (Visit YouTube Channel)"
              className="relative group cursor-pointer shrink-0 block hover:scale-105 active:scale-95 transition-transform duration-300"
            >
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 via-[#f9b03c] to-red-600 opacity-75 blur-md group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#1b090a] via-[#101420] to-[#080b14] border border-red-500/40 flex items-center justify-center text-red-500 shadow-xl yt-glow-icon group-hover:border-red-500">
                <i className="fa-brands fa-youtube text-2xl sm:text-3xl text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)] group-hover:scale-110 transition-transform"></i>
              </div>
            </a>

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
                <a 
                  href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="yt-gradient-text hover:opacity-85 transition-opacity"
                  title="ወደ ዩቲዩብ ቻናል ይሂዱ"
                >
                  ዩቲዩብ
                </a>
                <span>ስልጠናዎቻችን</span>
              </h2>
            </div>
          </div>
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
                  {/* 16:9 Thumbnail Image Container (100% Crisp & Visible!) */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                    <img
                      src={thumbUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        if (video.youtubeId) {
                          e.currentTarget.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none"></div>

                    {/* Centered Sleek Glowing Play Icon: Reveals on hover/interaction only */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 group-hover:bg-[#f9b03c] border-2 border-[#f9b03c]/90 flex items-center justify-center text-[#f9b03c] group-hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_25px_rgba(249,176,60,0.5)] transform scale-90 group-hover:scale-100 pointer-events-none">
                      <i className="fa-solid fa-play text-base sm:text-lg pl-0.5"></i>
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
          /* View 2: 16:9 HORIZONTAL 3D COVERFLOW CAROUSEL (Thumbnail 100% Visible & Clear!) */
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
                      className={`group absolute inset-0 aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
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
                      {/* Background 16:9 Thumbnail Image (100% Sharp & Unobscured!) */}
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

                      {/* Subtle Dark Vignette at edges only for high contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none"></div>

                      {/* Play Button: Auto-hides when video is playing/centered, reveals smoothly on hover/touch */}
                      {isCenter && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 hover:bg-[#f9b03c] border-2 border-[#f9b03c]/90 text-[#f9b03c] hover:text-black flex items-center justify-center shadow-[0_0_30px_rgba(249,176,60,0.6)] backdrop-blur-md transition-all duration-300">
                            <i className="fa-solid fa-play text-lg sm:text-xl pl-1"></i>
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

      {/* Fullscreen Pure Cinematic Video Modal */}
      <CinematicVideoModal
        isOpen={Boolean(selectedModalVideo)}
        onClose={() => setSelectedModalVideo(null)}
        videoUrl={selectedModalVideo ? (selectedModalVideo.youtubeUrl || (selectedModalVideo.youtubeId ? `https://www.youtube.com/watch?v=${selectedModalVideo.youtubeId}` : selectedModalVideo.videoSrc)) : ''}
        title={selectedModalVideo?.title || 'YouTube Video'}
      />

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
