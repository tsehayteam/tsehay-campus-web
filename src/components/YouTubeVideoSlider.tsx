'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  youtubeId: string;
  youtubeUrl: string;
}

const FREE_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    title: 'የዩቲዩብ ስኬት ሚስጥሮች (ክፍል 1)',
    thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1200&q=80',
    duration: '24:15',
    views: '45K+ እይታ',
    youtubeId: 'B-s71n0dHUk',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-2',
    title: 'የሼን (Shein) ኢምፖርት ቢዝነስ',
    thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
    duration: '18:40',
    views: '82K+ እይታ',
    youtubeId: 'mgdOMtW6J8k',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
  {
    id: 'vid-3',
    title: 'ዲጂታል ማርኬቲንግ ለጀማሪዎች',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    duration: '31:10',
    views: '60K+ እይታ',
    youtubeId: 'B-s71n0dHUk',
    youtubeUrl: 'https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X',
  },
];

export default function YouTubeVideoSlider() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="bg-[#050810] py-14 sm:py-20 text-white relative overflow-hidden border-b border-white/5">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 -left-20 w-72 h-72 bg-[#f9b03c]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute top-1/2 -right-20 w-72 h-72 bg-[#3268ba]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Header: Flex container with Title on left and "See all ->" on right */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 shadow-inner">
              <i className="fa-brands fa-youtube text-lg sm:text-xl"></i>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight font-heading">
              ነፃ የ <span className="text-[#f9b03c]">ዩቲዩብ</span> ስልጠናዎቻችን
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Navigation Arrows */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                aria-label="Previous videos"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                aria-label="Next videos"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all active:scale-90 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>

            {/* "See all ->" link: Light gray turning yellow on hover */}
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
        </div>

        {/* Carousel Container: Horizontal scrolling, scroll-snap enabled, scrollbar hidden */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FREE_VIDEOS.map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group cursor-pointer shrink-0 snap-start transition-all duration-300 ease hover:-translate-y-1.5 w-[85%] sm:w-[calc(50%-12px)] lg:w-[calc((100%-3rem)/3)]"
            >
              {/* 16:9 Aspect Ratio Thumbnail */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 shadow-lg border border-white/10">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 ease group-hover:scale-105"
                />

                {/* Dark gradient overlay for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>

                {/* Duration Badge */}
                {video.duration && (
                  <span className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                    {video.duration}
                  </span>
                )}

                {/* YouTube Red Corner Tag */}
                <span className="absolute top-2.5 left-2.5 bg-red-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                  <i className="fa-brands fa-youtube text-[10px]"></i> FREE
                </span>

                {/* Thumbnail Overlay: Circular Play Button in absolute center */}
                <div className="absolute inset-0 m-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#f9b03c]/85 flex items-center justify-center shadow-[0_0_20px_rgba(249,176,60,0.4)] transition-all duration-300 ease group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:opacity-100">
                  <i className="fa-solid fa-play text-black text-base sm:text-lg pl-0.5"></i>
                </div>
              </div>

              {/* Video Title: Clean white/light gray text, font size 15px, medium weight, turning to Golden Yellow on hover */}
              <h3 className="mt-3 text-[15px] font-medium text-gray-100 group-hover:text-[#f9b03c] transition-colors duration-300 line-clamp-2 leading-snug">
                {video.title}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveVideo(null)}
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
                  {activeVideo.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Video Player Embed */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/30">
              <div className="text-xs text-gray-400 text-center sm:text-left">
                ተጨማሪ ነፃ የቢዝነስ እና የቴክኖሎጂ ስልጠናዎችን በዩቲዩብ ቻናላችን ይከታተሉ።
              </div>
              <a
                href={activeVideo.youtubeUrl}
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
