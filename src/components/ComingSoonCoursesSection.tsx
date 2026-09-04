'use client';

import React, { useState } from 'react';
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import WaitlistModal from '@/components/WaitlistModal';
import { COMING_SOON_COURSES, ComingSoonCourse } from '@/lib/courseCache';

interface ComingSoonCoursesSectionProps {
  id?: string;
  className?: string;
  showTitle?: boolean;
}

export default function ComingSoonCoursesSection({
  id = 'coming-soon',
  className = '',
  showTitle = true
}: ComingSoonCoursesSectionProps) {
  const [selectedWaitlistCourse, setSelectedWaitlistCourse] = useState<ComingSoonCourse | null>(null);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);

  const handleOpenWaitlist = (course: ComingSoonCourse) => {
    setSelectedWaitlistCourse(course);
    setIsWaitlistModalOpen(true);
  };

  return (
    <section id={id} className={`py-20 sm:py-28 bg-transparent border-b border-white/[0.08] relative overflow-hidden ${className}`}>
      {/* 3D Atmospheric Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#f9b03c]/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#3268ba]/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {showTitle && (
          <div className="flex flex-col items-center text-center mb-14 sm:mb-18 gap-3 scrolly-reveal">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400/15 via-[#f9b03c]/10 to-[#3268ba]/15 border border-[#f9b03c]/30 px-5 py-2 rounded-full shadow-[0_0_25px_rgba(249,176,60,0.2)] backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-ping"></span>
              <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">
                ✨ አዳዲስ ስልጠናዎች • COMING SOON ✨
              </span>
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f9b03c] to-[#5a93e8] drop-shadow-[0_5px_25px_rgba(249,176,60,0.3)]">
                በቅርቡ የሚወጡ ኮርሶች
              </span>
            </h2>
            <div className="w-28 h-1.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_15px_rgba(249,176,60,0.8)]"></div>
            <p className="text-[#a0aec0] font-body text-base sm:text-lg max-w-2xl mt-1">
              ተፈላጊ እና ከፍተኛ ገቢ የሚያስገኙ አዳዲስ ስልጠናዎች ዝግጅታቸው በመጠናቀቅ ላይ ይገኛል። ቅድሚያ ተመዝግበው ልዩ ቅናሽ ያግኙ።
            </p>
          </div>
        )}

        {/* 4 Coming Soon Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {COMING_SOON_COURSES.map((course, index) => (
            <Tilt3DCard
              key={course.id}
              maxTilt={10}
              scale={1.02}
              perspective={1000}
              glare={true}
              onClick={() => handleOpenWaitlist(course)}
              className="cursor-pointer group h-full"
            >
              <div 
                data-scrolly-order={index + 1}
                className="h-full terafab-glass-card overflow-hidden flex flex-col justify-between relative border border-white/[0.08] hover:border-[#f9b03c]/60 shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.25)] transition-all duration-500"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div>
                  {/* Thumbnail Image Container */}
                  <div 
                    className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center m-0"
                    style={{ transform: 'translateZ(25px)' }}
                  >
                    <img 
                      src={course.image} 
                      alt="" 
                      aria-hidden="true" 
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none" 
                    />
                    <img 
                      src={course.image} 
                      alt={course.title} 
                      className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Glowing Golden Yellow Top-Right Badge: በቅርቡ (Coming Soon) */}
                    <div 
                      className="absolute top-3 right-3 z-20 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 text-[10.5px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_20px_rgba(249,176,60,0.6)] border border-amber-200/60 animate-pulse" 
                      style={{ transform: 'translateZ(40px)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                      <span>በቅርቡ (Coming Soon)</span>
                    </div>

                    {/* Category Pill */}
                    <div 
                      className="absolute bottom-3 left-3 z-20 bg-[#030509]/85 backdrop-blur-md text-[#f9b03c] border border-white/15 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md"
                      style={{ transform: 'translateZ(35px)' }}
                    >
                      {course.tag}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6">
                    <h3 
                      className="text-lg sm:text-xl font-black text-white mb-2 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading"
                      style={{ transform: 'translateZ(20px)' }}
                    >
                      {course.title}
                    </h3>

                    {/* Instructor Info */}
                    <div className="flex items-center gap-2 text-xs text-[#8a95a5] font-semibold mb-3">
                      <i className="fa-solid fa-chalkboard-user text-[#f9b03c]"></i>
                      <span>{course.instructor}</span>
                    </div>

                    {/* Description */}
                    <p 
                      className="text-[#a0aec0] text-xs leading-relaxed line-clamp-3 mb-4 font-body"
                      style={{ transform: 'translateZ(15px)' }}
                    >
                      {course.description}
                    </p>

                    {/* Meta Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-gray-300 flex items-center gap-1">
                        <i className="fa-regular fa-clock text-[#f9b03c] text-[10px]"></i>
                        <span>{course.duration}</span>
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-gray-300 flex items-center gap-1">
                        <i className="fa-solid fa-signal text-[#f9b03c] text-[10px]"></i>
                        <span>{course.level}</span>
                      </span>
                    </div>

                    {/* Key Highlights Bullet points */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      {course.benefits.slice(0, 3).map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2 text-[11.5px] text-gray-300">
                          <i className="fa-solid fa-circle-check text-[#f9b03c] text-[10px] shrink-0"></i>
                          <span className="truncate">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary CTA: ተጠባባቂ ዝርዝር ውስጥ ግባ (Join Waitlist) */}
                <div 
                  className="p-5 sm:p-6 pt-0 mt-auto"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenWaitlist(course);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#f9b03c]/20 via-[#f9b03c]/15 to-[#3268ba]/20 hover:from-[#f9b03c] hover:via-amber-400 hover:to-[#f9b03c] text-[#f9b03c] hover:text-slate-950 font-black text-xs sm:text-sm border border-[#f9b03c]/40 hover:border-transparent transition-all duration-300 shadow-[0_0_20px_rgba(249,176,60,0.2)] hover:shadow-[0_0_35px_rgba(249,176,60,0.6)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 group/btn"
                  >
                    <i className="fa-solid fa-bell text-xs group-hover/btn:animate-bounce"></i>
                    <span>ተጠባባቂ ዝርዝር ውስጥ ግባ</span>
                  </button>
                </div>
              </div>
            </Tilt3DCard>
          ))}
        </div>
      </div>

      {/* Interactive Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => {
          setIsWaitlistModalOpen(false);
          setSelectedWaitlistCourse(null);
        }}
        course={selectedWaitlistCourse}
      />
    </section>
  );
}
