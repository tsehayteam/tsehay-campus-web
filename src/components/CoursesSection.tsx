'use client';

import React from 'react';
import Link from 'next/link';

export default function CoursesSection() {
  return (
    <div className="w-full text-center py-8">
      <Link 
        href="/courses"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black text-sm shadow-lg hover:scale-105 transition"
      >
        <span>የፀሐይ ካምፓስ ኮርሶች (View All Courses)</span>
        <i className="fa-solid fa-arrow-right text-xs"></i>
      </Link>
    </div>
  );
}
