'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'active'>('active');
  const prevPathRef = useRef(pathname);
  const isPopStateRef = useRef(false);

  // 🌟 Detect browser back / forward navigation (popstate) & BFCache restore (pageshow)
  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
      setTransitionStage('active');
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        isPopStateRef.current = true;
        setTransitionStage('active');
      }
    };

    window.addEventListener('popstate', handlePopState, { passive: true });
    window.addEventListener('pageshow', handlePageShow, { passive: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;

      // 🌟 On Browser Back / Forward, render INSTANTLY with 0ms delay and zero blank flash!
      if (isPopStateRef.current) {
        isPopStateRef.current = false;
        setTransitionStage('active');
        setDisplayChildren(children);
        return;
      }

      // Normal link navigation: snappy subtle reveal
      setTransitionStage('enter');
      setDisplayChildren(children);

      const timer = setTimeout(() => {
        setTransitionStage('active');
      }, 30);

      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div
      className={`w-full min-h-screen relative z-10 transition-opacity duration-200 ease-out ${
        transitionStage === 'enter'
          ? 'opacity-0'
          : 'opacity-100'
      }`}
      style={{
        willChange: 'opacity',
      }}
    >
      {displayChildren}
    </div>
  );
}
