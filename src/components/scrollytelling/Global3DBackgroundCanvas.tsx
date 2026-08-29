'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Global3DBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (!mounted || isClassroomOrDashboard) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = document.documentElement.clientWidth || window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = document.documentElement.clientWidth || window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // 3D Particle Space
    const PARTICLE_COUNT = 135;
    const FOV = 400;
    const DEPTH = 2000;

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
      { fill: '#f9b03c', glow: 'rgba(249, 176, 60, 0.9)' },
      { fill: '#3268ba', glow: 'rgba(50, 104, 186, 0.9)' },
      { fill: '#f9b03c', glow: 'rgba(249, 176, 60, 0.9)' },
      { fill: '#5a93e8', glow: 'rgba(90, 147, 232, 0.85)' },
      { fill: '#ffffff', glow: 'rgba(255, 255, 255, 0.8)' },
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const col = colors[i % colors.length];
      const zVal = (Math.random() * DEPTH) - DEPTH / 2;
      nodes.push({
        x: (Math.random() - 0.5) * width * 2.2,
        y: (Math.random() - 0.5) * height * 2.2,
        z: zVal,
        baseZ: zVal,
        size: Math.random() * 2.4 + 1.2,
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
    handleScroll();

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

      // =========================================================================
      // 🛰️ 3D REVOLVING SATELLITE & CELESTIAL ORBITAL GYROSCOPE RINGS
      // =========================================================================
      const time = Date.now() * 0.0012;
      const satCenterX = cx;
      const satCenterY = cy * 0.85;

      const ORBIT_RINGS = [
        { radius: Math.min(width * 0.32, 290), rotX: 1.15 + Math.sin(time * 0.4) * 0.2, rotY: time * 0.5, color: 'rgba(249, 176, 60, 0.65)', satColor: '#f9b03c', satGlow: 'rgba(249, 176, 60, 0.95)', satSpeed: time * 1.4, satSize: 6 },
        { radius: Math.min(width * 0.42, 380), rotX: 0.7, rotY: -time * 0.4 + 1.2, color: 'rgba(90, 147, 232, 0.55)', satColor: '#5a93e8', satGlow: 'rgba(90, 147, 232, 0.95)', satSpeed: -time * 1.1 + 2.0, satSize: 7 },
        { radius: Math.min(width * 0.22, 200), rotX: 1.5, rotY: time * 0.7 + 0.8, color: 'rgba(255, 200, 100, 0.5)', satColor: '#ffffff', satGlow: 'rgba(255, 255, 255, 1)', satSpeed: time * 2.0 + 0.5, satSize: 5 },
      ];

      // Draw subtle luminous core pulse at center of satellite system
      const corePulse = (Math.sin(time * 2.5) + 1) * 0.5;
      const coreGrad = ctx.createRadialGradient(satCenterX, satCenterY, 0, satCenterX, satCenterY, 120 + corePulse * 35);
      coreGrad.addColorStop(0, 'rgba(249, 176, 60, 0.25)');
      coreGrad.addColorStop(0.4, 'rgba(50, 104, 186, 0.12)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(satCenterX, satCenterY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Render each 3D orbital ring & revolving satellite
      ORBIT_RINGS.forEach((ring) => {
        const SEGMENTS = 72;
        ctx.beginPath();

        for (let s = 0; s <= SEGMENTS; s++) {
          const theta = (s / SEGMENTS) * Math.PI * 2;
          const x0 = Math.cos(theta) * ring.radius;
          const y0 = 0;
          const z0 = Math.sin(theta) * ring.radius;

          // Rotate by rotX and rotY
          const y1 = y0 * Math.cos(ring.rotX) - z0 * Math.sin(ring.rotX);
          const z1 = y0 * Math.sin(ring.rotX) + z0 * Math.cos(ring.rotX);

          const x2 = x0 * Math.cos(ring.rotY) + z1 * Math.sin(ring.rotY);
          const z2 = -x0 * Math.sin(ring.rotY) + z1 * Math.cos(ring.rotY);

          const projZ = z2 + 800;
          const scale = 800 / projZ;
          const px = satCenterX + x2 * scale;
          const py = satCenterY + y1 * scale;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Revolving Satellite Node on this ring
        const satTheta = ring.satSpeed;
        const sx0 = Math.cos(satTheta) * ring.radius;
        const sy0 = 0;
        const sz0 = Math.sin(satTheta) * ring.radius;

        const sy1 = sy0 * Math.cos(ring.rotX) - sz0 * Math.sin(ring.rotX);
        const sz1 = sy0 * Math.sin(ring.rotX) + sz0 * Math.cos(ring.rotX);

        const sx2 = sx0 * Math.cos(ring.rotY) + sz1 * Math.sin(ring.rotY);
        const sz2 = -sx0 * Math.sin(ring.rotY) + sz1 * Math.cos(ring.rotY);

        const satProjZ = sz2 + 800;
        const satScale = 800 / satProjZ;
        const satPx = satCenterX + sx2 * satScale;
        const satPy = satCenterY + sy1 * satScale;
        const satRadius = Math.max(3, ring.satSize * satScale);

        // Satellite glowing aura
        const satGrad = ctx.createRadialGradient(satPx, satPy, 0, satPx, satPy, satRadius * 5);
        satGrad.addColorStop(0, ring.satGlow);
        satGrad.addColorStop(0.5, ring.satColor);
        satGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = satGrad;
        ctx.beginPath();
        ctx.arc(satPx, satPy, satRadius * 5, 0, Math.PI * 2);
        ctx.fill();

        // Satellite solid core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(satPx, satPy, satRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < projectedNodes.length; i++) {
        const p = projectedNodes[i];
        if (!p || p.alpha <= 0.02) continue;

        const radius = Math.max(1, p.node.size * p.scale);

        ctx.beginPath();
        ctx.arc(p.px, p.py, radius * 2.3, 0, Math.PI * 2);
        ctx.fillStyle = p.node.glowColor.replace('0.85', (p.alpha * 0.28).toString()).replace('0.8', (p.alpha * 0.28).toString());
        ctx.fill();

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mounted, isClassroomOrDashboard]);

  if (isClassroomOrDashboard) {
    return (
      <div 
        id="global-static-dashboard-background" 
        className="fixed inset-0 w-full h-full pointer-events-none -z-20 bg-[#030509]"
      >
        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-[#f9b03c]/[0.05] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#3268ba]/[0.07] rounded-full blur-[150px] pointer-events-none" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      id="global-3d-background-canvas"
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700"
      style={{
        backgroundColor: '#030509',
        willChange: 'transform, opacity',
      }}
    />
  );
}
