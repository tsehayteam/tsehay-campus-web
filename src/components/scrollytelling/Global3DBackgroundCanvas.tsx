'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';

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

  useEffect(() => {
    if (!mounted || isClassroomOrDashboard) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Three.js Scene, Void Fog & Camera Setup (Lusion.co Inspired Deep Obsidian Depth)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030509);
    scene.fog = new THREE.FogExp2(0x030509, 0.0010);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 4000);
    camera.position.set(0, 0, 600);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. High-Performance Glowing Radial Particle Texture Generator
    const createParticleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        const gradient = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(249, 176, 60, 0.95)');
        gradient.addColorStop(0.5, 'rgba(0, 210, 255, 0.4)');
        gradient.addColorStop(0.8, 'rgba(50, 104, 186, 0.15)');
        gradient.addColorStop(1, 'rgba(3, 5, 9, 0)');
        pCtx.fillStyle = gradient;
        pCtx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleTexture = createParticleTexture();

    // 3. Cosmic Particle Tunnel & Floating Organic Lattice (1,400 Nodes)
    const PARTICLE_COUNT = 1400;
    const TUNNEL_DEPTH = 3600;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    const colorGold = new THREE.Color('#f9b03c');
    const colorCyan = new THREE.Color('#00d2ff');
    const colorBlue = new THREE.Color('#3268ba');
    const colorWhite = new THREE.Color('#ffffff');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 100 + Math.random() * 950;
      const theta = Math.random() * Math.PI * 2;

      const px = Math.cos(theta) * radius + (Math.random() - 0.5) * 120;
      const py = Math.sin(theta) * radius * 0.72 + (Math.random() - 0.5) * 120;
      const pz = (Math.random() - 0.5) * TUNNEL_DEPTH;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      initialPositions[i * 3] = px;
      initialPositions[i * 3 + 1] = py;
      initialPositions[i * 3 + 2] = pz;

      // Rich chromatic distribution (Gold 45%, Cyan 30%, Blue 15%, Pure White 10%)
      const rand = Math.random();
      let chosenColor = colorGold;
      if (rand > 0.85) chosenColor = colorWhite;
      else if (rand > 0.55) chosenColor = colorCyan;
      else if (rand > 0.40) chosenColor = colorBlue;

      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;

      sizes[i] = Math.random() * 8.5 + 4.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 9.5,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 4. Lusion-Style Organic Morphing Ribbon Surface (Fluid Parametric Mesh)
    const ribbonSegmentsU = 48;
    const ribbonSegmentsV = 24;
    const ribbonGeometry = new THREE.PlaneGeometry(1600, 1600, ribbonSegmentsU, ribbonSegmentsV);
    const ribbonPositions = ribbonGeometry.attributes.position;

    const ribbonMaterial = new THREE.MeshBasicMaterial({
      color: 0xf9b03c,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const ribbonMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    ribbonMesh.position.set(0, -250, -400);
    ribbonMesh.rotation.x = -Math.PI / 2.4;
    scene.add(ribbonMesh);

    // 5. Orbital Kinetic Rings (Gold, Cyan & Indigo)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringMatGold = new THREE.MeshBasicMaterial({
      color: 0xf9b03c,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });

    const ringMatCyan = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    const ringMatBlue = new THREE.MeshBasicMaterial({
      color: 0x3268ba,
      wireframe: true,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(340, 1.4, 8, 52), ringMatGold);
    ring1.rotation.x = Math.PI / 2.6;
    ringGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(480, 1.2, 8, 64), ringMatCyan);
    ring2.rotation.y = Math.PI / 3.0;
    ringGroup.add(ring2);

    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(620, 1.0, 8, 72), ringMatBlue);
    ring3.rotation.z = Math.PI / 4.0;
    ringGroup.add(ring3);

    // 6. Interactive Mouse Velocity & Scroll Inertia Engine
    let targetScrollY = 0;
    let currentScrollY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let mouseVelX = 0;
    let mouseVelY = 0;
    let lastClientX = 0;
    let lastClientY = 0;

    const onScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset || 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const onMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = -(e.clientY / window.innerHeight - 0.5) * 2;

      mouseVelX = e.clientX - lastClientX;
      mouseVelY = e.clientY - lastClientY;
      lastClientX = e.clientX;
      lastClientY = e.clientY;

      targetMouseX = normX * 85;
      targetMouseY = normY * 65;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', onResize, { passive: true });

    // 7. Render Loop with Fluid Lusion Physics & Reactive Morphing
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Fluid dampening for mouse and scroll
      currentScrollY += (targetScrollY - currentScrollY) * 0.055;
      mouseX += (targetMouseX - mouseX) * 0.045;
      mouseY += (targetMouseY - mouseY) * 0.045;
      mouseVelX *= 0.92;
      mouseVelY *= 0.92;

      // Max page scroll height
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollProgress = Math.min(1, Math.max(0, currentScrollY / maxScroll));

      // 🚀 Fly-Through Camera Journey
      const baseZ = 600;
      const flyDistance = 2600;
      const targetCamZ = baseZ - (scrollProgress * flyDistance);

      camera.position.z += (targetCamZ - camera.position.z) * 0.07;
      camera.position.x += (mouseX - camera.position.x) * 0.045;
      camera.position.y += (mouseY - camera.position.y) * 0.045;

      // Keep kinetic rings floating ahead of the camera
      ringGroup.position.z = camera.position.z - 480;
      ring1.rotation.z += 0.0022;
      ring1.rotation.y += 0.0012;
      ring2.rotation.x += 0.0018;
      ring2.rotation.z -= 0.0014;
      ring3.rotation.y += 0.0011;

      // 🌊 Lusion Fluid Ribbon Wave Distortion
      const posAttr = ribbonGeometry.attributes.position;
      const timeOffset = elapsedTime * 0.8;
      for (let i = 0; i < posAttr.count; i++) {
        const u = (i % (ribbonSegmentsU + 1)) / ribbonSegmentsU;
        const v = Math.floor(i / (ribbonSegmentsU + 1)) / ribbonSegmentsV;
        const wave = Math.sin(u * 7 + timeOffset) * 45 + Math.cos(v * 6 + timeOffset * 1.2) * 35;
        const mouseDistort = (mouseX * 0.15) * Math.sin(u * Math.PI) + (mouseY * 0.15) * Math.cos(v * Math.PI);
        posAttr.setZ(i, wave + mouseDistort);
      }
      posAttr.needsUpdate = true;
      ribbonMesh.rotation.z = Math.sin(elapsedTime * 0.2) * 0.08;

      // ✨ Infinite Particle Tunnel Wrapping with Mouse Magnetic Deflection
      const posArray = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let z = posArray[i * 3 + 2];
        if (z > camera.position.z + 120) {
          posArray[i * 3 + 2] -= TUNNEL_DEPTH;
        } else if (z < camera.position.z - TUNNEL_DEPTH + 120) {
          posArray[i * 3 + 2] += TUNNEL_DEPTH;
        }

        // Gentle cosmic ambient breathing
        const initX = initialPositions[i * 3];
        const initY = initialPositions[i * 3 + 1];
        const breath = Math.sin(elapsedTime * 0.5 + i) * 8;
        posArray[i * 3] = initX + breath + (mouseVelX * 0.02);
        posArray[i * 3 + 1] = initY + breath + (mouseVelY * 0.02);
      }
      particleGeometry.attributes.position.needsUpdate = true;

      camera.lookAt(0, 0, camera.position.z - 500);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      particleGeometry.dispose();
      particleMaterial.dispose();
      ribbonGeometry.dispose();
      ribbonMaterial.dispose();
      ring1.geometry.dispose();
      ring2.geometry.dispose();
      ring3.geometry.dispose();
      ringMatGold.dispose();
      ringMatCyan.dispose();
      ringMatBlue.dispose();
      particleTexture.dispose();
      renderer.dispose();
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
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 transition-opacity duration-700"
      style={{
        backgroundColor: '#030509',
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    />
  );
}
