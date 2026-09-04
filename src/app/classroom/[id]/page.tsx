'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassroomCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    if (resolvedParams?.id) {
      try {
        localStorage.setItem('tsehay_user_active_course', resolvedParams.id);
      } catch (e) {}
      router.replace(`/dashboard?view=classroom&courseId=${encodeURIComponent(resolvedParams.id)}&lesson=0`);
    } else {
      router.replace('/dashboard?view=classroom');
    }
  }, [resolvedParams, router]);

  return (
    <div className="min-h-screen bg-[#030509] flex items-center justify-center text-white">
      <div className="text-center">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#f9b03c] mb-3"></i>
        <p className="text-xs text-slate-400">ኮርሱን በማዘጋጀት ላይ...</p>
      </div>
    </div>
  );
}
