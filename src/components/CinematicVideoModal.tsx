'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseVideoEmbedUrl } from '@/lib/videoParser';

interface CinematicVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
}

export default function CinematicVideoModal({
  isOpen,
  onClose,
  videoUrl,
  title = 'የፀሐይ ካምፓስ ቪዲዮ (Tsehay Campus Video)'
}: CinematicVideoModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !videoUrl) return null;

  const parsed = parseVideoEmbedUrl(videoUrl, true);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-3 sm:p-6 lg:p-10 animate-in fade-in duration-300 select-none"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      {/* Top Floating Bar with Title Badge & Prominent Close Button */}
      <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 z-[1000000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-pulse"></span>
          <span className="text-xs sm:text-sm font-bold text-white max-w-[200px] sm:max-w-md truncate font-heading">
            {title}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-300 border border-white/25 hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-md cursor-pointer pointer-events-auto"
          title="ዝጋ (Close - Esc)"
          aria-label="Close video player"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Centered Highly-Responsive 16:9 Cinema Container */}
      <div
        className="relative w-full max-w-6xl max-h-[85vh] aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1),0_0_60px_rgba(249,176,60,0.35)] border border-white/20 bg-black flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {parsed.type === 'video' ? (
          <video
            src={parsed.src}
            autoPlay
            controls
            playsInline
            controlsList="nodownload"
            className="w-full h-full object-contain"
          />
        ) : (
          <iframe
            src={parsed.src}
            title={title}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>,
    document.body
  );
}
