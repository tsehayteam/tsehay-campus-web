'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import * as THREE from 'three';

/**
 * TsehayAtmosphere - Solar Gravity Particle Engine (Lusion.co Inspired)
 * 20,000 glowing micro-particles floating in an obsidian void (#070709).
 * Features:
 * - Radiant solar gold (#FFB800), electric white, and cosmic violet (#4D0A8F)
 * - Dynamic cursor gravity with elastic spring physics attractor
 * - Route-aware dynamics:
 *     * Landing (/): Swirling solar storm driven by cursor velocity & scroll
 *     * Tickets & Checkout (/events, /tickets, /checkout): Inward focal magnetic compression
 *     * Dashboard & Classroom (/dashboard, /classroom): Tranquil slow-drift with 40% reduced opacity
 * - Interactive particle flares on button/card clicks
 */
export default function TsehayAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();

  // Mode based on route
  const getRouteMode = (path: string | null): number => {
    if (!path) return 0.0;
    if (path.startsWith('/dashboard') || path.startsWith('/classroom')) return 2.0; // Calm Drift
    if (path.startsWith('/events') || path.startsWith('/tickets') || path.startsWith('/checkout')) return 1.0; // Focus Compression
    return 0.0; // Dynamic Solar Storm (Landing & default)
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070709);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 3000);
    camera.position.set(0, 0, 750);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // Performance optimization for 20,000 particles
      powerPreference: 'high-performance',
      alpha: true,
      stencil: false,
      depth: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. 20,000 Particles Buffer Attributes Generation
    const PARTICLE_COUNT = 20000;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    // Color definitions
    const colorGold = new THREE.Color('#FFB800');
    const colorWhite = new THREE.Color('#FFFFFF');
    const colorViolet = new THREE.Color('#4D0A8F');
    const colorAmber = new THREE.Color('#FFA000');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Distributed in deep spherical nebula shell with core concentration
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 80 + Math.pow(Math.random(), 2.2) * 850;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.75; // Elliptical disk
      const z = (radius * Math.cos(phi)) * 0.85;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      originalPositions[i3] = x;
      originalPositions[i3 + 1] = y;
      originalPositions[i3 + 2] = z;

      // Color distribution: 65% Solar Gold/Amber, 20% Electric White, 15% Deep Cosmic Violet
      const colorRand = Math.random();
      let chosenColor: THREE.Color;
      if (colorRand < 0.50) {
        chosenColor = colorGold;
      } else if (colorRand < 0.72) {
        chosenColor = colorAmber;
      } else if (colorRand < 0.87) {
        chosenColor = colorWhite;
      } else {
        chosenColor = colorViolet;
      }

      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;

      // Varying particle scales with a few larger primary embers
      scales[i] = Math.random() < 0.08 ? 3.5 + Math.random() * 2.5 : 1.2 + Math.random() * 2.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOriginalPos', new THREE.BufferAttribute(originalPositions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    // 3. Custom GLSL Shader Material for Solar Atmosphere
    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseSpring: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0.0 },
      uRouteMode: { value: getRouteMode(pathname) },
      uOpacityFactor: { value: getRouteMode(pathname) === 2.0 ? 0.4 : 1.0 },
      uFlarePos: { value: new THREE.Vector2(999, 999) },
      uFlareTime: { value: 99.0 },
      uScrollVelocity: { value: 0.0 },
    };

    const vertexShader = `
      uniform float uTime;
      uniform vec2 uMouseSpring;
      uniform float uMouseStrength;
      uniform float uRouteMode;
      uniform float uOpacityFactor;
      uniform vec2 uFlarePos;
      uniform float uFlareTime;
      uniform float uScrollVelocity;

      attribute vec3 aOriginalPos;
      attribute vec3 aColor;
      attribute float aScale;
      attribute float aPhase;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = aColor;
        vec3 pos = aOriginalPos;

        // 1. Natural Solar Core Breathing & Orbit
        float t = uTime * 0.4 + aPhase;
        float slowOrbitSpeed = (uRouteMode == 2.0) ? 0.08 : 0.25;
        float angle = uTime * slowOrbitSpeed * (0.5 + fract(aPhase * 7.13));
        
        float cosA = cos(angle);
        float sinA = sin(angle);
        float nx = pos.x * cosA - pos.z * sinA;
        float nz = pos.x * sinA + pos.z * cosA;
        pos.x = nx;
        pos.z = nz;

        // Vertical harmonic oscillation
        pos.y += sin(t * 1.5 + pos.x * 0.005) * 18.0;

        // 2. Elastic Cursor Gravity Attractor
        // Map 3D particle to normalized viewport coordinates
        vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        vec2 normCoord = screenPos.xy / screenPos.w;

        float distToMouse = distance(normCoord, uMouseSpring);
        if (distToMouse < 0.65) {
          float pullFactor = (1.0 - (distToMouse / 0.65));
          pullFactor = pow(pullFactor, 1.8) * uMouseStrength;

          // Pull towards cursor with gentle vortex swirl
          vec2 dir = normalize(uMouseSpring - normCoord);
          vec2 swirlDir = vec2(-dir.y, dir.x);
          
          float swirlAmount = (uRouteMode == 0.0) ? 140.0 : 40.0;
          pos.x += (dir.x * 200.0 + swirlDir.x * swirlAmount) * pullFactor;
          pos.y += (dir.y * 200.0 + swirlDir.y * swirlAmount) * pullFactor;
          pos.z += 80.0 * pullFactor; // Pull forward in 3D
        }

        // 3. Route-Aware Behaviors
        if (uRouteMode == 1.0) {
          // Tickets & Checkout: Inward focal compression
          pos.x *= 0.68;
          pos.y *= 0.68;
          pos.z += sin(uTime * 1.2 + aPhase) * 25.0;
        } else if (uRouteMode == 2.0) {
          // Dashboard: Tranquil slow drift, wide spread
          pos.x *= 1.35;
          pos.y *= 1.25;
          pos.y += sin(uTime * 0.2 + aPhase) * 8.0;
        }

        // 4. Click Particle Flare Shockwave
        if (uFlareTime < 1.6) {
          float flareDist = distance(normCoord, uFlarePos);
          float waveFront = uFlareTime * 0.8;
          float waveDelta = abs(flareDist - waveFront);
          if (waveDelta < 0.15) {
            float flareImpulse = (1.0 - (waveDelta / 0.15)) * (1.0 - (uFlareTime / 1.6));
            pos.z += flareImpulse * 120.0;
            pos.x += normalize(normCoord.x - uFlarePos.x) * flareImpulse * 80.0;
            pos.y += normalize(normCoord.y - uFlarePos.y) * flareImpulse * 80.0;
          }
        }

        // 5. Scroll Velocity Reaction
        pos.y -= uScrollVelocity * 35.0 * (1.0 + fract(aPhase * 3.7));

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Dynamic Point Size with camera depth attenuation
        float baseScale = (uRouteMode == 2.0) ? aScale * 0.75 : aScale;
        gl_PointSize = baseScale * (380.0 / -mvPosition.z);
        gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);

        // Alpha calculation
        float depthAlpha = smoothstep(1800.0, 200.0, -mvPosition.z);
        vAlpha = depthAlpha * uOpacityFactor * (0.4 + 0.6 * sin(t * 2.0));
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        // High-End Radial Gaussian Emissive Falloff
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        // Intense glowing core with feathered soft halo
        float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
        intensity = pow(intensity, 1.9);

        // Core hotspot spark
        float core = 1.0 - smoothstep(0.0, 0.12, dist);
        vec3 finalColor = mix(vColor, vec3(1.0, 1.0, 1.0), core * 0.75);

        gl_FragColor = vec4(finalColor, intensity * vAlpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 4. Elastic Spring Physics Mouse Tracking
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseCurrentX = 0;
    let mouseCurrentY = 0;
    let mouseVelocityX = 0;
    let mouseVelocityY = 0;
    let lastMouseMoveTime = Date.now();

    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTargetY = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMouseMoveTime = Date.now();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Scroll Velocity Tracker
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = (currentScrollY - lastScrollY) / window.innerHeight;
      scrollVelocity = THREE.MathUtils.clamp(delta * 4.0, -2.0, 2.0);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 6. Particle Flare Listener on Button Clicks
    let flareStartTime = -99.0;
    const handleParticleFlare = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { normX, normY } = customEvent.detail;
        uniforms.uFlarePos.value.set(normX, normY);
        flareStartTime = performance.now() / 1000;
      }
    };
    window.addEventListener('tsehay-particle-flare', handleParticleFlare);

    // 7. Window Resize
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // 8. High-Performance Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;

      // Elastic Spring Physics for cursor tracking
      const springStiffness = 0.08;
      const springDamping = 0.82;

      const forceX = (mouseTargetX - mouseCurrentX) * springStiffness;
      const forceY = (mouseTargetY - mouseCurrentY) * springStiffness;
      mouseVelocityX = (mouseVelocityX + forceX) * springDamping;
      mouseVelocityY = (mouseVelocityY + forceY) * springDamping;
      mouseCurrentX += mouseVelocityX;
      mouseCurrentY += mouseVelocityY;

      uniforms.uMouseSpring.value.set(mouseCurrentX, mouseCurrentY);

      // Active mouse strength decays if mouse stays still
      const timeSinceMove = Date.now() - lastMouseMoveTime;
      const targetStrength = timeSinceMove < 2500 ? 1.0 : 0.35;
      uniforms.uMouseStrength.value = THREE.MathUtils.lerp(
        uniforms.uMouseStrength.value,
        targetStrength,
        0.05
      );

      // Flare time progression
      if (flareStartTime > 0) {
        const timeSinceFlare = (performance.now() / 1000) - flareStartTime;
        uniforms.uFlareTime.value = timeSinceFlare;
      }

      // Smooth scroll velocity damping
      scrollVelocity *= 0.90;
      uniforms.uScrollVelocity.value = scrollVelocity;

      // Subtle slow scene tilt towards mouse
      scene.rotation.y = mouseCurrentX * 0.12;
      scene.rotation.x = -mouseCurrentY * 0.08;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('tsehay-particle-flare', handleParticleFlare);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Route Mode dynamically on Next.js page transitions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mode = getRouteMode(pathname);
    const targetOpacity = mode === 2.0 ? 0.38 : 1.0;

    // Dispatch event or update uniforms if needed
    const event = new CustomEvent('tsehay-canvas-route-update', {
      detail: { mode, opacity: targetOpacity },
    });
    window.dispatchEvent(event);
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      id="tsehay-solar-atmosphere"
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -10,
      }}
    />
  );
}
