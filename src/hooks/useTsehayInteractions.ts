'use client';

import { useEffect, useRef } from 'react';

/**
 * Non-Invasive Interaction Hook
 * Uses MutationObserver to attach crystalline hover sounds, pulse clicks,
 * and 3D particle flares to existing buttons, interactive cards, and links
 * without modifying any existing component JSX.
 */
export function useTsehayInteractions() {
  const observedNodesRef = useRef<WeakSet<Element>>(new WeakSet());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const INTERACTIVE_SELECTOR = [
      'button',
      '[role="button"]',
      'a',
      '[data-interactive]',
      '.course-card',
      '.ticket-card',
      '.btn-buy-now-vibe',
      '.tab-btn',
      'input[type="submit"]',
    ].join(',');

    const isPrimaryTarget = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      try {
        if (el.matches('.btn-buy-now-vibe, [data-primary="true"], button[type="submit"], .bg-amber-400, .bg-primary')) {
          return true;
        }
      } catch (e) {}
      const className = typeof el.className === 'string' ? el.className : '';
      return className.includes('bg-[#f9b03c]') || className.includes('bg-primary') || className.includes('bg-amber-400');
    };

    let lastHoverTime = 0;

    const handleMouseEnter = (e: Event) => {
      const now = Date.now();
      // Debounce hover audio slightly to prevent audio congestion on fast sweeps
      if (now - lastHoverTime < 50) return;
      lastHoverTime = now;

      const target = e.currentTarget as HTMLElement | null;
      if (!target) return;

      window.dispatchEvent(
        new CustomEvent('tsehay-audio-hover', {
          detail: {
            tagName: target.tagName,
            isPrimary: isPrimaryTarget(target),
          },
        })
      );
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement | null;
      if (!target) return;

      const isPrimary = isPrimaryTarget(target);
      const rect = target.getBoundingClientRect();

      // Click location in normalized screen coordinates (-1 to 1 for 3D Three.js canvas)
      const x = ((e.clientX || rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const y = -(((e.clientY || rect.top + rect.height / 2) / window.innerHeight) * 2 - 1);

      // Dispatch synthesized audio trigger
      window.dispatchEvent(
        new CustomEvent('tsehay-audio-pulse', {
          detail: {
            isPrimary,
            x: e.clientX,
            y: e.clientY,
          },
        })
      );

      // Dispatch canvas particle flare trigger
      window.dispatchEvent(
        new CustomEvent('tsehay-particle-flare', {
          detail: {
            normX: x,
            normY: y,
            clientX: e.clientX,
            clientY: e.clientY,
            width: rect.width,
            height: rect.height,
            isPrimary,
          },
        })
      );
    };

    const bindInteractions = (root: Element | Document = document) => {
      const elements = root.querySelectorAll(INTERACTIVE_SELECTOR);
      elements.forEach((el) => {
        if (observedNodesRef.current.has(el)) return;
        observedNodesRef.current.add(el);

        el.addEventListener('mouseenter', handleMouseEnter as EventListener, { passive: true });
        el.addEventListener('click', handleClick as EventListener, { passive: true });
      });
    };

    // Initial binding
    bindInteractions(document);

    // Dynamic binding for newly mounted modals, cards, and tabs
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              if (node.matches(INTERACTIVE_SELECTOR)) {
                if (!observedNodesRef.current.has(node)) {
                  observedNodesRef.current.add(node);
                  node.addEventListener('mouseenter', handleMouseEnter as EventListener, { passive: true });
                  node.addEventListener('click', handleClick as EventListener, { passive: true });
                }
              }
              bindInteractions(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}
