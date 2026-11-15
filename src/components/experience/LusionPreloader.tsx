'use client';

import { useEffect } from 'react';

/**
 * LusionPreloader - Permanently disabled to prevent initial page-load blur/blocking overlays.
 * Immediately signals completion so 3D and hero animations run without delay.
 */
export default function LusionPreloader() {
  useEffect(() => {
    try {
      document.documentElement.classList.remove('tsehay-loading');
      document.body.style.overflow = '';
      sessionStorage.setItem('tsehay_preloader_seen', '1');
      sessionStorage.setItem('tsehay_preloader_seen_v3', 'true');
      localStorage.setItem('tsehay_preloader_seen', '1');
      window.dispatchEvent(new CustomEvent('tsehay-preloader-complete'));
      window.dispatchEvent(new CustomEvent('tsehay_preloader_complete'));
    } catch (_) {}
  }, []);

  return null;
}
