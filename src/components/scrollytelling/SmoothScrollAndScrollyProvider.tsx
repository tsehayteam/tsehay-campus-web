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
    interface TrackedElement {
      el: HTMLElement;
      currentProgress: number;
      targetProgress: number;
      order: number;
      isScrub: boolean;
    }

    let trackedElements: TrackedElement[] = [];

    const refreshElements = () => {
      const domElements = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.scrolly-reveal, .scrolly-scrub, [data-scrolly], .scrolly-card, .scrolly-stagger-1, .scrolly-stagger-2, .scrolly-stagger-3, .scrolly-stagger-4, .scrolly-stagger-5, .scrolly-stagger-6'
        )
      );

      trackedElements = domElements.map((el) => {
        let order = 0;
        if (el.classList.contains('scrolly-stagger-1')) order = 1;
        else if (el.classList.contains('scrolly-stagger-2')) order = 2;
        else if (el.classList.contains('scrolly-stagger-3')) order = 3;
        else if (el.classList.contains('scrolly-stagger-4')) order = 4;
        else if (el.classList.contains('scrolly-stagger-5')) order = 5;
        else if (el.classList.contains('scrolly-stagger-6')) order = 6;
        else if (el.hasAttribute('data-scrolly-order')) {
          order = parseInt(el.getAttribute('data-scrolly-order') || '0', 10);
        }

        const isScrub = el.classList.contains('scrolly-scrub');

        return {
          el,
          currentProgress: 0,
          targetProgress: 0,
          order,
          isScrub,
        };
      });
    };

    refreshElements();

    let animId: number;
    let isRunning = true;

    // Bi-directional ScrollTrigger Engine (Scrub: 1 interpolation)
    const update = () => {
      if (!isRunning) return;

      const viewportHeight = window.innerHeight;

      for (let i = 0; i < trackedElements.length; i++) {
        const item = trackedElements[i];
        if (!item.el || !item.el.isConnected) continue;

        const rect = item.el.getBoundingClientRect();
        const elementTop = rect.top;
        const elementHeight = rect.height || 120;

        // Calculate staggered trigger based on sequential order (one-by-one reveal)
        const orderOffset = item.order * 90; // Each sequential card requires an extra 90px of scroll
        const startTrigger = viewportHeight * 0.90 - orderOffset;
        const endTrigger = -elementHeight * 0.3;

        // Compute normalized progress [0 -> 1]
        let rawProgress = (startTrigger - elementTop) / (startTrigger - endTrigger);
        item.targetProgress = Math.max(0, Math.min(1, rawProgress));

        // Scrub: 1 lerp dampening (0.12 speed per frame for buttery smoothness)
        item.currentProgress += (item.targetProgress - item.currentProgress) * 0.12;

        if (item.isScrub) {
          // Direct scrub mode
          const translateY = (1 - item.currentProgress) * 45;
          const scale = 0.94 + item.currentProgress * 0.06;
          const opacity = Math.min(1, item.currentProgress * 1.25);

          item.el.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
          item.el.style.opacity = `${opacity}`;
        } else {
          // Sequential bi-directional thresholding
          if (item.currentProgress > 0.08) {
            if (!item.el.classList.contains('is-visible')) {
              item.el.classList.add('is-visible');
            }
          } else {
            // Smoothly reverse when scrolling up
            if (item.el.classList.contains('is-visible')) {
              item.el.classList.remove('is-visible');
            }
          }
        }
      }

      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);

    const onResize = () => {
      refreshElements();
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Mutation observer for dynamically rendered course cards
    const observer = new MutationObserver(() => {
      refreshElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [pathname]);

  return (
    <ScrollyContext.Provider value={{ scrollTo }}>
      {children}
    </ScrollyContext.Provider>
  );
}
