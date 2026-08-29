'use client';

import React from 'react';
import Hero3DPopoutStage from '@/components/3d/Hero3DPopoutStage';

interface HeroProps {
  videoSrc?: string;
}

export default function Hero({
  videoSrc = '/assets/for_landing_page_first.mp4',
}: HeroProps) {
  return <Hero3DPopoutStage videoSrc={videoSrc} />;
}

export { Hero3DPopoutStage };
