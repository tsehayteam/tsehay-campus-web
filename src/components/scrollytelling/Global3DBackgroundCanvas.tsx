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

    // 1. Three.js Scene, Fog & Camera Setup
    const scene = new THREE.Scene();
    // Deep void black atmosphere (#030509)
    scene.background = new THREE.Color(0x030509);
    scene.fog = new THREE.FogExp2(0x030509, 0.0012);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 3500);
    camera.position.set(0, 0, 500);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. High-Performance Glowing Particle Circular Texture Generator
    const createGlowTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        const gradient = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.25, 'rgba(249, 176, 60, 0.9)');
        gradient.addColorStop(0.55, 'rgba(50, 104, 186, 0.45)');
        gradient.addColorStop(1, 'rgba(3, 5, 9, 0)');
        pCtx.fillStyle = gradient;
        pCtx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleTexture = createGlowTexture();

    // 3. Deep Cinematic Cosmic Particle Tunnel (1,200+ Nodes)
    const PARTICLE_COUNT = 1200;
    const TUNNEL_DEPTH = 3200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Color Palette: Golden Yellow (#f9b03c), Royal Blue (#3268ba), Pure Diamond (#ffffff)
    const colorGold = new THREE.Color('#f9b03c');
    const colorBlue = new THREE.Color('#3268ba');
    const colorWhite = new THREE.Color('#ffffff');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Cylindrical distribution around camera pathway
      const radius = 120 + Math.random() * 850;
      const theta = Math.random() * Math.PI * 2;
      
      positions[i * 3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.sin(theta) * radius * 0.75 + (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TUNNEL_DEPTH;

      // Color distribution: 50% Gold, 35% Royal Blue, 15% Bright Star
      const rand = Math.random();
      let chosenColor = colorGold;
      if (rand > 0.65) chosenColor = colorBlue;
      else if (rand > 0.50) chosenColor = colorWhite;

      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;

      sizes[i] = Math.random() * 8 + 3.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 9,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 4. Digital Neural Pathways (Plexus Line Segments)
    const lineCount = 180;
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 6);
    const lineColors = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const idxA = Math.floor(Math.random() * (PARTICLE_COUNT / 2));
      const idxB = Math.floor(Math.random() * (PARTICLE_COUNT / 2));

      linePositions[i * 6] = positions[idxA * 3];
      linePositions[i * 6 + 1] = positions[idxA * 3 + 1];
      linePositions[i * 6 + 2] = positions[idxA * 3 + 2];

      linePositions[i * 6 + 3] = positions[idxB * 3];
      linePositions[i * 6 + 4] = positions[idxB * 3 + 1];
      linePositions[i * 6 + 5] = positions[idxB * 3 + 2];

      const c = (i % 2 === 0) ? colorGold : colorBlue;
      lineColors[i * 6] = c.r;
      lineColors[i * 6 + 1] = c.g;
      lineColors[i * 6 + 2] = c.b;

      lineColors[i * 6 + 3] = c.r;
      lineColors[i * 6 + 4] = c.g;
      lineColors[i * 6 + 5] = c.b;
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // 5. Orbital Gyroscope Rings (Gold & Royal Blue)
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringMatGold = new THREE.MeshBasicMaterial({
      color: 0xf9b03c,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const ringMatBlue = new THREE.MeshBasicMaterial({
      color: 0x3268ba,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(320, 1.2, 8, 48), ringMatGold);
    ring1.rotation.x = Math.PI / 2.8;
    ringGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(460, 1.2, 8, 56), ringMatBlue);
    ring2.rotation.y = Math.PI / 3.2;
    ringGroup.add(ring2);

    // 6. Scroll & Mouse Tracking for Cinematic Fly-Through
    let targetScrollY = 0;
    let currentScrollY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const onScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset || 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 70;
      targetMouseY = -(e.clientY / window.innerHeight - 0.5) * 50;
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

    // 7. Render Loop with Smooth Camera Fly-Through Animation
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth interpolation for scroll and mouse
      currentScrollY += (targetScrollY - currentScrollY) * 0.06;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Calculate max page scroll height
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollProgress = currentScrollY / maxScroll;

      // 🚀 SCROLL FLY-THROUGH: Camera flies forward deep into the 3D particle space
      const baseZ = 500;
      const flyDistance = 2400;
      const targetCamZ = baseZ - (scrollProgress * flyDistance);

      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (mouseY - camera.position.y) * 0.05;

      // Center ring group relative to camera depth
      ringGroup.position.z = camera.position.z - 450;
      ring1.rotation.z += 0.002;
      ring2.rotation.x += 0.0015;

      // Subtle particle slow rotation
      particles.rotation.y = elapsedTime * 0.02;
      lineMesh.rotation.y = elapsedTime * 0.02;

      // Ensure particles wrap around camera position for infinite tunnel feeling
      const posArray = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let z = posArray[i * 3 + 2];
        // If particle has passed behind camera, push it forward into the deep distance
        if (z > camera.position.z + 100) {
          posArray[i * 3 + 2] -= TUNNEL_DEPTH;
        } else if (z < camera.position.z - TUNNEL_DEPTH + 100) {
          posArray[i * 3 + 2] += TUNNEL_DEPTH;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      // Look slightly ahead into the portal
      camera.lookAt(0, 0, camera.position.z - 500);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
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
