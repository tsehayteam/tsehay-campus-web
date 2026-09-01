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
      className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-3 sm:p-6 lg:p-10 select-none animate-in fade-in duration-300"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)' }}
    >
      {/* Minimal Top-Right Close (X) Button - Zero other text overlays */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[1000000] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all duration-300 border border-white/20 hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-md cursor-pointer pointer-events-auto"
        title="ዝጋ (Close - Esc)"
        aria-label="Close video player"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Pure 16:9 Immersive Video Container - Maximizing Viewport */}
      <div
        className="relative w-full max-w-6xl max-h-[88vh] aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1),0_0_60px_rgba(249,176,60,0.25)] border border-white/15 bg-black flex items-center justify-center"
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
            title="Tsehay Campus Video Player"
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
