'use client';

import React, { useRef, useCallback } from 'react';

interface Tilt3DLoginButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export default function Tilt3DLoginButton({
  onClick,
  label = "ይግቡ (Login)",
  className = "",
}: Tilt3DLoginButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);

  // Direct, zero-lag click handler (sub-10ms response, no state re-renders)
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Smooth direct DOM manipulation for tilt (zero React component re-renders)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxTilt = 14;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    btnRef.current.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`;
    if (glareRef.current) {
      glareRef.current.style.opacity = '0.4';
      glareRef.current.style.background = `radial-gradient(circle 70px at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255,255,255,0.9) 0%, transparent 80%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, []);

  return (
    <div 
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }} 
      className={className.includes('w-full') ? 'w-full block' : 'inline-block'}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative group px-4 sm:px-5 py-2 sm:py-2.2 rounded-full font-heading font-black text-xs sm:text-[13px] text-slate-950 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] shadow-[0_0_30px_rgba(249,176,60,0.5),0_10px_25px_rgba(0,0,0,0.85)] border border-amber-300/80 hover:border-white active:scale-95 cursor-pointer select-none transition-shadow duration-300 overflow-hidden flex items-center gap-2 touch-manipulation ${className}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Continuous Animated Shimmer Sweep */}
        <div 
          className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"
          style={{ transform: 'skewX(-20deg) translateZ(1px)' }}
        />

        {/* Dynamic Specular Light Glare Overlay */}
        <div 
          ref={glareRef}
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-0 transition-opacity duration-200 rounded-full"
          style={{
            transform: 'translateZ(2px)',
          }}
        />

        {/* Icon & Label */}
        <div 
          className="relative z-10 flex items-center gap-2 pointer-events-none select-none"
          style={{ transform: 'translateZ(10px)' }}
        >
          <div className="w-5 h-5 rounded-full bg-slate-950/15 flex items-center justify-center text-slate-950 text-xs pointer-events-none">
            <i className="fa-solid fa-arrow-right-to-bracket text-[11px] group-hover:translate-x-0.5 transition-transform" />
          </div>
          <span className="tracking-wide pointer-events-none">{label}</span>
        </div>
      </button>
    </div>
  );
}
