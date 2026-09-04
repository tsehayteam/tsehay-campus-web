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

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setTransitionStage('enter');
      setDisplayChildren(children);

      const timer = setTimeout(() => {
        setTransitionStage('active');
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div
      key={pathname}
      className={`w-full min-h-screen relative z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        transitionStage === 'enter'
          ? 'opacity-0 translate-y-3'
          : 'opacity-100 translate-y-0'
      }`}
      style={{
        willChange: 'opacity, transform',
      }}
    >
      {displayChildren}
    </div>
  );
}
