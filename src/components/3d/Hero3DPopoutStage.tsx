'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface Hero3DPopoutStageProps {
  videoSrc?: string;
}

export default function Hero3DPopoutStage({
  videoSrc = '/assets/for_landing_page_first.mp4',
}: Hero3DPopoutStageProps) {
  const { t } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);
  
  // 3D Gyroscopic & Mouse Tilt State
  const [rotate, setRotate] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [studentCount, setStudentCount] = useState(500);
  const animationFrameRef = useRef<number | null>(null);

  // Live student counter pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setStudentCount(prev => (prev >= 540 ? 500 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Idle floating 3D breathing motion when cursor isn't active
  useEffect(() => {
    if (isInteracting) return;
    let angle = 0;
    const idleLoop = () => {
      angle += 0.02;
      setRotate({
        x: Math.sin(angle) * 3.5,
        y: Math.cos(angle * 0.8) * 4.5,
        glareX: 50 + Math.sin(angle) * 20,
        glareY: 50 + Math.cos(angle) * 20,
      });
      animationFrameRef.current = requestAnimationFrame(idleLoop);
    };

    animationFrameRef.current = requestAnimationFrame(idleLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isInteracting]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    setIsInteracting(true);
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotX = ((y - cy) / cy) * -9.5;
    const rotY = ((x - cx) / cx) * 11.5;
    const gX = (x / rect.width) * 100;
    const gY = (y / rect.height) * 100;

    setRotate({ x: rotX, y: rotY, glareX: gX, glareY: gY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsInteracting(false);
  }, []);

  return (
    <div 
      className="w-full max-w-4xl relative select-none py-6 sm:py-8"
      style={{ perspective: '1400px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 🌟 3D Holographic Backdrop Aura (Radiates out in 3D space) */}
      <div 
        className="absolute -inset-6 sm:-inset-10 rounded-[3rem] opacity-70 pointer-events-none transition-transform duration-500 ease-out"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(249,176,60,0.22) 0%, rgba(50,104,186,0.25) 45%, transparent 75%)',
          filter: 'blur(35px)',
          transform: `translate3d(0, 0, -40px) scale(${isInteracting ? 1.06 : 1})`,
        }}
      />

      {/* 🚀 Main 3D Anamorphic Tilt Rig (Preserves 3D depth coordinates) */}
      <div
        ref={stageRef}
        className="relative w-full rounded-[2rem] sm:rounded-[2.4rem] transition-transform duration-300 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotate.x.toFixed(2)}deg) rotateY(${rotate.y.toFixed(2)}deg)`,
        }}
      >
        {/* Layer 1: Frame Glass Housing with Cyber Neon Bezel */}
        <div 
          className="relative w-full h-[220px] sm:h-[320px] md:h-[390px] lg:h-[430px] rounded-[1.8rem] sm:rounded-[2.2rem] shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-2 border-white/20 dark:border-[#f9b03c]/40 overflow-hidden bg-black/90"
          style={{ transform: 'translateZ(0px)' }}
        >
          {/* Main High-Definition Video Feed */}
          <video 
            id="hero-video" 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto" 
            disablePictureInPicture 
            controlsList="nodownload noremoteplayback" 
            onContextMenu={(e) => e.preventDefault()} 
            className="w-full h-full object-cover scale-102"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>

          {/* Dynamic 3D Specular Light Glare (Follows mouse cursor) */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-40 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 380px at ${rotate.glareX}% ${rotate.glareY}%, rgba(255,255,255,0.7) 0%, rgba(249,176,60,0.2) 50%, transparent 80%)`,
            }}
          />

          {/* Video bottom subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 🎆 ANAMORPHIC DEPTH BADGES (Floating smoothly outside the frame)   */}
        {/* ------------------------------------------------------------------ */}

        {/* 1. BOTTOM-LEFT POP-OUT: ACCREDITED CERTIFICATE BADGE */}
        <div 
          className="hidden sm:flex absolute -bottom-6 -left-6 lg:-left-10 z-30 p-3.5 sm:p-4 rounded-2xl items-center gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-black/95 border-2 border-[#f9b03c]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.35)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto"
          style={{
            transform: 'translate3d(0, 0, 75px)',
          }}
        >
          {/* Holographic Glowing Seal */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(249,176,60,0.6)] shrink-0 animate-pulse">
            <i className="fa-solid fa-award"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_#34d399]" />
          </div>
          <div className="text-left pr-2">
            <p className="text-[10px] text-amber-300/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              {t('practical_learning_badge') || '🎓 ከተግባራዊ ትምህርት ጋር'}
            </p>
            <p className="text-white font-black text-sm tracking-tight drop-shadow-md">
              {t('recognized_cert') || 'እውቅና ያለው ሰርተፍኬት'}
            </p>
          </div>
        </div>

        {/* 2. TOP-RIGHT POP-OUT: ACTIVE STUDENTS COUNTER WITH RADAR WAVES */}
        <div 
          className="hidden sm:flex absolute -top-6 -right-6 lg:-right-10 z-30 p-3.5 sm:p-4 rounded-2xl items-center gap-3.5 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-[#071328]/95 border-2 border-[#3268ba]/70 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(50,104,186,0.45)] backdrop-blur-2xl transition-transform duration-300 group hover:scale-105 pointer-events-auto"
          style={{
            transform: 'translate3d(0, 0, 80px)',
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1e4585] via-[#3268ba] to-[#3a75d2] text-white flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(50,104,186,0.6)] shrink-0">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div className="text-left pr-2">
            <p className="text-[10px] text-blue-200/90 font-mono font-bold uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {t('students') || 'ተማሪዎች'}
            </p>
            <p className="text-white font-black text-sm tracking-tight font-mono drop-shadow-md flex items-center gap-1.5">
              <span>{studentCount}+ ሰልጣኞች</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
