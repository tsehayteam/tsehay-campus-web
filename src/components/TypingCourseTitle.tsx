'use client';

import React, { useState, useEffect } from 'react';

interface TypingCourseTitleProps {
  title: string;
  className?: string;
}

export default function TypingCourseTitle({
  title,
  className = ''
}: TypingCourseTitleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isDoneTyping, setIsDoneTyping] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setIsDoneTyping(false);
    setCharIndex(0);
  }, [title]);

  useEffect(() => {
    if (!title) return;

    if (charIndex <= title.length) {
      const timer = setTimeout(() => {
        setDisplayedText(title.slice(0, charIndex));
        setCharIndex((prev) => prev + 1);
      }, 55);
      return () => clearTimeout(timer);
    } else {
      setIsDoneTyping(true);
    }
  }, [charIndex, title]);

  return (
    <span className={`inline-block relative ${className}`}>
      <span 
        className={`transition-all duration-700 ${
          isDoneTyping 
            ? 'course-title-glow-pulse text-white' 
            : 'text-white'
        }`}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {displayedText || title}
      </span>
      {!isDoneTyping && (
        <span className="inline-block w-[3px] sm:w-[4px] h-[0.85em] bg-[#f9b03c] rounded-full shadow-[0_0_12px_#f9b03c] animate-pulse ml-1.5 align-middle" />
      )}
    </span>
  );
}
