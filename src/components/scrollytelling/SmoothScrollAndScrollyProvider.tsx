'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ScrollyContextType {
  scrollTo: (target: string | number, offset?: number) => void;
}

const ScrollyContext = createContext<ScrollyContextType>({
  scrollTo: () => {},
});

export const useScrolly = () => useContext(ScrollyContext);

export default function SmoothScrollAndScrollyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Scroll Target and Smooth Inertia State
  const state = useRef({
    currentY: 0,
    targetY: 0,
    isScrolling: false,
    maxScroll: 0,
    animFrame: 0,
    isTouch: false,
  });

  const scrollTo = (target: string | number, offset = 0) => {
    let targetPosition = 0;
    if (typeof target === 'number') {
      targetPosition = target;
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (el) {
        const rect = el.getBoundingClientRect();
        targetPosition = window.scrollY + rect.top + offset;
      }
    }
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    // Detect touch devices where native momentum is preferred
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    state.current.isTouch = isTouchDevice;

    let elementsToObserve: HTMLElement[] = [];

    const refreshElements = () => {
      elementsToObserve = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.scrolly-reveal, .scrolly-scrub, [data-scrolly], .scrolly-scale, .scrolly-parallax'
        )
      );
    };

    refreshElements();

    // GSAP-style Bi-directional ScrollTrigger Engine with scrub interpolation
    const updateScrollyElements = () => {
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;

      for (let i = 0; i < elementsToObserve.length; i++) {
        const el = elementsToObserve[i];
        if (!el || !el.isConnected) continue;

        const rect = el.getBoundingClientRect();
        const elementTop = rect.top;
        const elementHeight = rect.height || 100;

        // Trigger start when top enters 92% of viewport; trigger end when bottom leaves 8% of viewport
        const startTrigger = viewportHeight * 0.92;
        const endTrigger = -elementHeight * 0.4;

        // Progress from 0 (offscreen below) to 1 (fully revealed in viewport)
        let rawProgress = (startTrigger - elementTop) / (startTrigger - endTrigger);
        let progress = Math.max(0, Math.min(1, rawProgress));

        // Smooth cubic ease for progress
        const easedProgress = Math.pow(progress, 1.4);

        if (el.classList.contains('scrolly-scrub')) {
          // Continuous bi-directional scrub: smoothly interpolate transform & opacity
          const translateY = (1 - easedProgress) * 50;
          const scale = 0.94 + easedProgress * 0.06;
          const opacity = Math.min(1, easedProgress * 1.3);

          el.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          el.style.opacity = `${opacity}`;
        } else if (el.classList.contains('scrolly-parallax')) {
          // Parallax depth calculation
          const speed = parseFloat(el.getAttribute('data-speed') || '0.2');
          const offset = (elementTop - viewportHeight / 2) * speed;
          el.style.transform = `translate3d(0, ${offset}px, 0)`;
        } else {
          // Standard Bi-directional reveal with smooth exit on reverse scroll
          if (progress > 0.08) {
            if (!el.classList.contains('is-visible')) {
              el.classList.add('is-visible');
            }
          } else {
            if (el.classList.contains('is-visible')) {
              el.classList.remove('is-visible');
            }
          }
        }
      }
    };

    // Lenis-style momentum smooth scroll RAF loop
    let lastScrollY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateScrollyElements();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      refreshElements();
      updateScrollyElements();
    });

    // Initial pass
    updateScrollyElements();

    // Re-observe after route change or DOM mutation
    const observer = new MutationObserver(() => {
      refreshElements();
      updateScrollyElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <ScrollyContext.Provider value={{ scrollTo }}>
      {children}
    </ScrollyContext.Provider>
  );
}
