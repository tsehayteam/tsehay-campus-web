'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { parseVideoEmbedUrl } from '@/lib/videoParser';
import { formatDriveImageUrl, getCourseSlug } from '@/lib/courseCache';

interface CoursePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  onGoToClassroom?: (course: any) => void;
  onBuyCourse?: (course: any) => void;
}

export default function CoursePreviewModal({
  isOpen,
  onClose,
  course,
  onGoToClassroom,
  onBuyCourse
}: CoursePreviewModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const isFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;
  const rawVideoUrl = course.video || course.previewVideo || (course.lessons && course.lessons[0]?.video) || 'https://www.youtube.com/watch?v=mgdOMtW6J8k';
  const parsedVideo = parseVideoEmbedUrl(rawVideoUrl, true);
  const slug = getCourseSlug(course) || course.id;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-3xl bg-[#080d1a] border border-[#f9b03c]/40 rounded-3xl sm:rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(249,176,60,0.2)] z-10 animate-in zoom-in-95 duration-300 overflow-hidden text-white"
        style={{
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
        }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#f9b03c]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 relative z-20 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-[#f9b03c]">
              የኮርስ ማስተዋወቂያ ቪዲዮ (Course Preview)
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="ዝጋ (Close)"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black overflow-hidden select-none border-b border-white/10">
          {parsedVideo.type === 'embed' ? (
            <iframe
              src={parsedVideo.src}
              title={course.title || 'Course Preview'}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={parsedVideo.src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Course Info & Direct Actions */}
        <div className="p-5 sm:p-7 space-y-5 relative z-10">
          {/* Title & Price */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isFree ? 'bg-[#3268ba] text-white' : 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950'
                }`}>
                  {isFree ? 'FREE COURSE' : 'PREMIUM MASTERCLASS'}
                </span>
                {course.category && (
                  <span className="text-[10px] font-bold text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {course.category}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black font-heading text-white line-clamp-2">
                {course.title}
              </h3>
            </div>

            <div className="text-left sm:text-right shrink-0">
              {isFree ? (
                <span className="text-2xl font-black text-[#f9b03c]">100% ነፃ (Free)</span>
              ) : (
                <div>
                  <span className="text-2xl font-black text-white">
                    {Number(course.price).toLocaleString()} ብር
                  </span>
                  {course.originalPrice && (
                    <span className="block text-xs text-gray-400 line-through">
                      {Number(course.originalPrice).toLocaleString()} ብር
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Meta Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-1">
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <i className="fa-solid fa-chalkboard-user text-[#f9b03c]"></i>
              <span>{course.instructor || 'Eyoub Sahle'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <i className="fa-regular fa-clock text-[#f9b03c]"></i>
              <span>{course.duration || '00:50:00'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <i className="fa-solid fa-star text-[#f9b03c]"></i>
              <span>{course.ratingAvg || '4.9'}</span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {isFree ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onGoToClassroom) onGoToClassroom(course);
                }}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-400 text-slate-950 font-black text-sm transition shadow-[0_0_25px_rgba(249,176,60,0.4)] hover:shadow-[0_0_35px_rgba(249,176,60,0.6)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:brightness-110"
              >
                <i className="fa-solid fa-graduation-cap text-base"></i>
                <span>ወደ ክፍል ሂድ (Start Learning)</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onBuyCourse) onBuyCourse(course);
                }}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-400 text-slate-950 font-black text-sm transition shadow-[0_0_30px_rgba(249,176,60,0.5)] hover:shadow-[0_0_40px_rgba(249,176,60,0.7)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:brightness-110"
              >
                <i className="fa-solid fa-cart-shopping text-base"></i>
                <span>አሁኑኑ ይግዙ (Buy Now - {Number(course.price).toLocaleString()} ብር)</span>
                <i className="fa-solid fa-bolt text-xs"></i>
              </button>
            )}

            <Link
              href={`/courses/${slug}`}
              onClick={onClose}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-circle-info text-[#f9b03c]"></i>
              <span>ሙሉ ዝርዝር ይመልከቱ (Full Details)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
