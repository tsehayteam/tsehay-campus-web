'use client';

import React, { useState, useEffect } from 'react';

interface TypingCoursesHeadlineProps {
  text?: string;
  className?: string;
}

export default function TypingCoursesHeadline({
  text = 'በብዛት የሚፈለጉ ኮርሶች',
  className = ''
}: TypingCoursesHeadlineProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting && charIndex <= text.length) {
      // Typing forward
      setDisplayedText(text.slice(0, charIndex));
      timeout = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 100);
    } else if (!isDeleting && charIndex > text.length) {
      // Completed phrase - pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 4500);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      setDisplayedText(text.slice(0, charIndex - 1));
      timeout = setTimeout(() => {
        setCharIndex((prev) => prev - 1);
      }, 50);
    } else if (isDeleting && charIndex === 0) {
      // Restart loop
      setIsDeleting(false);
      timeout = setTimeout(() => {
        setCharIndex(1);
      }, 400);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, text]);

  return (
    <span className={`inline-flex items-center tracking-tight font-black ${className}`}>
      <span className="text-white drop-shadow-[0_0_25px_rgba(249,176,60,0.45)]">
        {displayedText || '\u00A0'}
      </span>
      <span className="ml-1 inline-block w-[3px] sm:w-[4px] h-[0.9em] bg-[#f9b03c] rounded-full shadow-[0_0_12px_#f9b03c] animate-pulse align-middle" />
    </span>
  );
}
