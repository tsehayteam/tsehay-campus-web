'use client';

import React, { createContext, useContext } from 'react';

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

  return (
    <ScrollyContext.Provider value={{ scrollTo }}>
      {children}
    </ScrollyContext.Provider>
  );
}
