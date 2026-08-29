'use client';

import React, { useRef, useState, useCallback } from 'react';

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
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, isHovered: false });
  const rafId = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxTilt = 18;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setTilt({
        rotateX,
        rotateY,
        glareX,
        glareY,
        isHovered: true,
      });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      isHovered: false,
    });
  }, []);

  return (
    <div style={{ perspective: '1000px', transformStyle: 'preserve-3d' }} className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative group px-4 sm:px-5 py-2 sm:py-2.2 rounded-full font-heading font-black text-xs sm:text-[13px] text-slate-950 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] shadow-[0_0_25px_rgba(249,176,60,0.45),0_8px_20px_rgba(0,0,0,0.8)] border border-amber-300/60 hover:border-white/80 active:scale-95 cursor-pointer select-none transition-shadow duration-300 overflow-hidden flex items-center gap-2 ${className}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: tilt.isHovered
            ? `rotateX(${tilt.rotateX.toFixed(2)}deg) rotateY(${tilt.rotateY.toFixed(2)}deg) scale3d(1.06, 1.06, 1.06)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
        }}
      >
        {/* Specular Light Flare Overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered ? 0.7 : 0,
            background: `radial-gradient(circle 80px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.85) 0%, rgba(249,176,60,0.3) 50%, transparent 80%)`,
            mixBlendMode: 'screen',
            transform: 'translateZ(2px)',
          }}
        />

        {/* Ambient Pulsing Glow behind */}
        <span className="absolute -inset-1 rounded-full bg-[#f9b03c]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />

        {/* Login Icon with 3D Depth */}
        <div 
          className="w-4 h-4 rounded-full bg-slate-950 text-[#f9b03c] flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm group-hover:rotate-12 transition-transform duration-300"
          style={{ transform: 'translateZ(6px)' }}
        >
          <i className="fa-solid fa-arrow-right-to-bracket"></i>
        </div>

        {/* Label */}
        <span 
          className="tracking-wide uppercase font-black drop-shadow-xs whitespace-nowrap"
          style={{ transform: 'translateZ(8px)' }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
