'use client';

import React, { useRef, useCallback } from 'react';

interface Tilt3DCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  glare?: boolean;
  onClick?: (e?: any) => void;
  style?: React.CSSProperties;
}

export default function Tilt3DCard({
  children,
  className = '',
  maxTilt = 12,
  perspective = 1000,
  scale = 1.02,
  glare = true,
  onClick,
  style = {},
}: Tilt3DCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !innerRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      }
      if (glareRef.current) {
        glareRef.current.style.opacity = '0.35';
        glareRef.current.style.background = `radial-gradient(circle 320px at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255,255,255,0.4) 0%, rgba(249,176,60,0.15) 40%, transparent 80%)`;
      }
    });
  }, [maxTilt, scale]);

  const handleMouseLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (innerRef.current) {
      innerRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none ${className}`}
      style={{
        perspective: `${perspective}px`,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      <div
        ref={innerRef}
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{
          transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}

        {/* Specular 3D Glare Sheen */}
        {glare && (
          <div
            ref={glareRef}
            className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300 overflow-hidden opacity-0"
            style={{
              background: 'radial-gradient(circle 320px at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(249,176,60,0.15) 40%, transparent 80%)',
              mixBlendMode: 'overlay',
              transform: 'translateZ(1px)',
            }}
          />
        )}
      </div>
    </div>
  );
}
