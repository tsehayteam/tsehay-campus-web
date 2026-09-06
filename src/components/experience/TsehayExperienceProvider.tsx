'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 🌟 Lusion.co-Level Solar Gravity Particle Engine, Preloader & Synesthetic Audio (SSR Disabled)
const TsehayAtmosphere = dynamic(
  () => import('@/components/experience/TsehayAtmosphere'),
  { ssr: false }
);

const TsehayAudio = dynamic(
  () => import('@/components/experience/TsehayAudio'),
  { ssr: false }
);

const LusionPreloader = dynamic(
  () => import('@/components/experience/LusionPreloader'),
  { ssr: false }
);

export default function TsehayExperienceProvider() {
  return (
    <>
      {/* 1. Lusion.co Style Preloader Screen with Asset Orchestration */}
      <LusionPreloader />

      {/* 2. Interactive Solar Gravity Canvas (Fixed -z-10 Lusion-Grade Atmosphere) */}
      <TsehayAtmosphere />

      {/* 3. Synesthetic Sound System (Web Audio API Synthesizer & Ethiopian Beats) */}
      <TsehayAudio />
    </>
  );
}
