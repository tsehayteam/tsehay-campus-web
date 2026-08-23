'use client';

import React, { useState, useEffect } from 'react';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button only when user scrolls down beyond 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility(); // Check initial position

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="ወደ ላይ እጠፍ (Scroll to top)"
      title="ወደ ላይ እጠፍ (Scroll to top)"
      className={`fixed bottom-[30px] right-[30px] z-[1000] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] select-none group focus:outline-none ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_15px_rgba(249,176,60,0.2)] hover:shadow-[0_0_25px_rgba(249,176,60,0.55),0_12px_35px_rgba(0,0,0,0.8)] hover:scale-110 active:scale-95'
          : 'opacity-0 translate-y-6 scale-75 pointer-events-none'
      }`}
      style={{
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        background: 'rgba(3, 5, 9, 0.75)',
        border: '1px solid rgba(249, 176, 60, 0.3)',
      }}
    >
      {/* Ambient Inner Golden Pulse */}
      <span className="absolute inset-0 rounded-full bg-[#f9b03c]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Golden Yellow Icon */}
      <i className="fa-solid fa-chevron-up text-sm sm:text-base text-[#f9b03c] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-white" />

      {/* Tooltip on hover */}
      <span className="absolute right-full mr-3 px-2.5 py-1 rounded-xl bg-[#030509]/90 border border-[#f9b03c]/30 text-[#f9b03c] text-[11px] font-bold font-heading whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 shadow-lg hidden sm:block">
        ወደ ላይ (Top)
      </span>
    </button>
  );
}
