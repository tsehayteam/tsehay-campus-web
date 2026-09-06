'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 🌟 Lusion.co-Level Solar Gravity Particle Engine & Synesthetic Audio (SSR Disabled)
const TsehayAtmosphere = dynamic(
  () => import('@/components/experience/TsehayAtmosphere'),
  { ssr: false }
);

const TsehayAudio = dynamic(
  () => import('@/components/experience/TsehayAudio'),
  { ssr: false }
);

export default function TsehayExperienceProvider() {
  return (
    <>
      {/* Interactive Solar Gravity Canvas (Fixed -z-10 Lusion-Grade Atmosphere) */}
      <TsehayAtmosphere />

      {/* Synesthetic Sound System (Web Audio API Synthesizer & Floating Controller) */}
      <TsehayAudio />
    </>
  );
}
