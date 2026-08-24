'use client';

import React from 'react';

interface CourseCardSkeletonProps {
  count?: number;
}

export function CourseCardSkeletonItem() {
  return (
    <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col justify-between border border-gray-200/80 dark:border-white/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-pulse">
      <div>
        {/* Thumbnail Shimmer */}
        <div className="relative aspect-video w-full bg-slate-200 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent"></div>
          <i className="fa-solid fa-graduation-cap text-3xl text-slate-300 dark:text-slate-700/50"></i>
          
          {/* Badge Placeholder */}
          <div className="absolute top-3 right-3 w-20 h-6 bg-slate-300 dark:bg-slate-700/60 rounded-full"></div>
        </div>

        {/* Content Details */}
        <div className="p-6 sm:p-7 space-y-3">
          {/* Category Tag */}
          <div className="w-24 h-3 bg-amber-400/20 dark:bg-amber-400/10 rounded-md"></div>

          {/* Title */}
          <div className="space-y-2">
            <div className="w-full h-5 bg-slate-200 dark:bg-slate-700/60 rounded-lg"></div>
            <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700/40 rounded-lg"></div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded"></div>
            <div className="w-5/6 h-3 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>

          {/* Instructor & Rating Meta */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/60 shrink-0"></div>
              <div className="w-24 h-3.5 bg-slate-200 dark:bg-slate-700/50 rounded"></div>
            </div>
            <div className="w-12 h-3.5 bg-amber-400/20 rounded"></div>
          </div>
        </div>
      </div>

      {/* Card Footer Price & Button */}
      <div className="p-6 sm:p-7 pt-0 flex items-center justify-between mt-2">
        <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700/60 rounded-lg"></div>
        <div className="w-28 h-10 bg-amber-400/20 dark:bg-[#f9b03c]/20 rounded-xl"></div>
      </div>
    </div>
  );
}

export default function CourseCardSkeleton({ count = 3 }: CourseCardSkeletonProps) {
  return (
    <div 
      className="grid gap-7 sm:gap-8 w-full" 
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeletonItem key={i} />
      ))}
    </div>
  );
}
