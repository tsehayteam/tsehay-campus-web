'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_COURSES, getCachedCourses } from '@/lib/courseCache';

export default function ClassroomCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    const targetId = resolvedParams?.id;
    if (targetId) {
      try {
        const all = getCachedCourses().length > 0 ? getCachedCourses() : DEFAULT_COURSES;
        const matched = all.find(c => c.id === targetId || c.slug === targetId) ||
                        DEFAULT_COURSES.find(c => c.id === targetId || c.slug === targetId) ||
                        all[0];
        if (matched) {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(matched));
          if (matched.lessons && matched.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(matched.lessons[0]));
          }
        }
        localStorage.setItem('tsehay_dashboard_last_view', 'classroom');
      } catch (e) {}

      const dest = `/dashboard?view=classroom&courseId=${encodeURIComponent(targetId)}&lesson=0`;
      if (typeof window !== 'undefined') {
        window.location.replace(dest);
      } else {
        router.replace(dest);
      }
    } else {
      if (typeof window !== 'undefined') {
        window.location.replace('/dashboard?view=classroom');
      } else {
        router.replace('/dashboard?view=classroom');
      }
    }
  }, [resolvedParams, router]);

  return (
    <div className="min-h-screen bg-[#030509] flex items-center justify-center text-white font-body">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-3 border-[#f9b03c]/20 border-t-[#f9b03c] rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-slate-300 font-bold">ወደ መማሪያ ክፍል በማስተላለፍ ላይ...</p>
      </div>
    </div>
  );
}
