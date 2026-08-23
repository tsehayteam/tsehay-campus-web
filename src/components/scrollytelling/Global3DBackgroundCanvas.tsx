'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function Global3DBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();

  // Distraction-free route detection: Classroom / Dashboard / Admin / Settings
  const isClassroomOrDashboard = 
    pathname?.startsWith('/dashboard') || 
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/classroom') ||
    pathname?.startsWith('/settings');

  const isDarkAppModeRef = useRef(isClassroomOrDashboard);
  useEffect(() => {
    isDarkAppModeRef.current = isClassroomOrDashboard;
  }, [isClassroomOrDashboard]);

  useEffect(() => {
    // If inside dashboard or classroom, don't run particle animation loop
    if (isClassroomOrDashboard) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // 3D Particle Space
    const PARTICLE_COUNT = 115;
    const FOV = 390;
    const DEPTH = 1900;

    interface Node3D {
      x: number;
      y: number;
      z: number;
      baseZ: number;
      size: number;
      color: string;
      glowColor: string;
      speedX: number;
      speedY: number;
      speedZ: number;
    }

    const nodes: Node3D[] = [];
    const colors = [
      { fill: '#f9b03c', glow: 'rgba(249, 176, 60, 0.85)' },
      { fill: '#3268ba', glow: 'rgba(50, 104, 186, 0.85)' },
      { fill: '#f9b03c', glow: 'rgba(249, 176, 60, 0.85)' },
      { fill: '#5a93e8', glow: 'rgba(90, 147, 232, 0.8)' },
      { fill: '#ffffff', glow: 'rgba(255, 255, 255, 0.7)' },
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const col = colors[i % colors.length];
      const zVal = (Math.random() * DEPTH) - DEPTH / 2;
      nodes.push({
        x: (Math.random() - 0.5) * width * 2.2,
        y: (Math.random() - 0.5) * height * 2.2,
        z: zVal,
        baseZ: zVal,
        size: Math.random() * 2.2 + 1.2,
        color: col.fill,
        glowColor: col.glow,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: (Math.random() - 0.5) * 0.35,
        speedZ: (Math.random() - 0.5) * 0.2,
      });
    }

    let scrollProgress = 0;
    let targetScrollProgress = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScrollProgress = window.scrollY / maxScroll;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 35;
      targetMouseY = (e.clientY / height - 0.5) * 35;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const render = () => {
      if (isDarkAppModeRef.current) return;

      // Smooth camera interpolation
      scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Detect current theme
      const isDark = typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true;

      if (isDark) {
        // Deep void black clear (#030509)
        ctx.fillStyle = '#030509';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Ultra-luxurious pearl background with subtle ambient depth for Light Mode
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.5, '#f1f5f9');
        grad.addColorStop(1, '#e8eef6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Camera Z fly-through based on scroll
      const cameraFlySpeed = scrollProgress * DEPTH * 1.6;
      const cx = width / 2 + mouseX;
      const cy = height / 2 + mouseY;

      // Project all nodes
      const projectedNodes: Array<{ px: number; py: number; scale: number; alpha: number; node: Node3D } | null> = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.speedX;
        node.y += node.speedY;

        // Wrap boundaries in X and Y
        if (node.x < -width * 1.1) node.x = width * 1.1;
        if (node.x > width * 1.1) node.x = -width * 1.1;
        if (node.y < -height * 1.1) node.y = height * 1.1;
        if (node.y > height * 1.1) node.y = -height * 1.1;

        // Compute effective Z with fly-through
        let effZ = (node.baseZ - cameraFlySpeed) % DEPTH;
        if (effZ < -DEPTH / 2) effZ += DEPTH;
        if (effZ > DEPTH / 2) effZ -= DEPTH;

        const distanceZ = effZ + FOV;
        if (distanceZ <= 15) {
          projectedNodes.push(null);
          continue;
        }

        const scale = FOV / distanceZ;
        const px = cx + node.x * scale;
        const py = cy + node.y * scale;

        // Depth fading
        const depthRatio = 1 - Math.abs(effZ) / (DEPTH / 2);
        const alpha = Math.max(0, Math.min(1, depthRatio * 1.25));

        projectedNodes.push({ px, py, scale, alpha, node });
      }

      // Draw connecting digital pathways / neon lines
      for (let i = 0; i < projectedNodes.length; i++) {
        const p1 = projectedNodes[i];
        if (!p1 || p1.alpha <= 0.02) continue;

        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p2 = projectedNodes[j];
          if (!p2 || p2.alpha <= 0.02) continue;

          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 135 * p1.scale;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * Math.min(p1.alpha, p2.alpha) * 0.42;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = p1.node.color === '#f9b03c' 
              ? `rgba(249, 176, 60, ${lineAlpha})` 
              : `rgba(50, 104, 186, ${lineAlpha})`;
            ctx.lineWidth = Math.max(0.5, 1.2 * p1.scale);
            ctx.stroke();
          }
        }
      }

      // Draw glowing particle nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        if (!p || p.alpha <= 0.02) continue;

        const radius = Math.max(1, p.node.size * p.scale);

        // Ambient glow halo
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius * 2.3, 0, Math.PI * 2);
        ctx.fillStyle = p.node.glowColor.replace('0.85', (p.alpha * 0.28).toString()).replace('0.8', (p.alpha * 0.28).toString());
        ctx.fill();

        // Core particle dot
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.node.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isClassroomOrDashboard]);

  // If inside Learning Dashboard/Classroom: render static deep void background with subtle static corner mesh gradients
  if (isClassroomOrDashboard) {
    return (
      <div 
        id="global-static-dashboard-background" 
        className="fixed inset-0 w-full h-full pointer-events-none -z-20 bg-[#030509]"
      >
        {/* Subtle static blurred mesh gradients in corners (5-7% opacity for distraction-free learning) */}
        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-[#f9b03c]/[0.05] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#3268ba]/[0.07] rounded-full blur-[150px] pointer-events-none" />
      </div>
    );
  }

  // Marketing Pages (Landing, About, Courses, Preview): Render interactive 3D particle canvas
  return (
    <canvas
      ref={canvasRef}
      id="global-3d-background-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none -z-20 transition-opacity duration-700"
      style={{
        backgroundColor: '#030509',
        willChange: 'transform, opacity',
      }}
    />
  );
}
