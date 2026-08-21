'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function ContentProtection() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [screenshotDetected, setScreenshotDetected] = useState(false);

  // Only apply strict protections inside private classroom/lesson dashboard
  const isProtectedArea = pathname?.startsWith('/dashboard');

  useEffect(() => {
    // 1. Intercept PrintScreen / Screenshot shortcuts to prevent capturing
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen (PrtScn) key
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        e.preventDefault();
        setScreenshotDetected(true);
        setIsShieldActive(true);

        // Instantly wipe the system clipboard
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (err) {}

        setTimeout(() => {
          setScreenshotDetected(false);
          if (document.hasFocus() && !document.hidden) {
            setIsShieldActive(false);
          }
        }, 1500);
        return false;
      }

      // Block Ctrl+P (Print), Ctrl+S (Save), Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ['p', 'P', 's', 'S', 'u', 'U'].includes(e.key)) {
        e.preventDefault();
        return false;
      }

      // Block DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+S)
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'S', 's'].includes(e.key))
      ) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (err) {}
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // 2. Disable Right-Click Context Menu Globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 3. Disable Dragging of Images & Media
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('dragstart', handleDragStart);

    // 4. Disable Copy/Cut of protected content
    const handleCopyCut = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (!isEditable) {
        e.preventDefault();
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', '');
        }
      }
    };
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);

    // 5. Block Web-based getDisplayMedia (Extension screen recording)
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = async function() {
          setIsShieldActive(true);
          throw new Error("Screen recording is strictly prohibited on Tsehay Campus.");
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
    };
  }, []);

  if (!isProtectedArea) return null;

  return (
    <>
      {/* 🛡️ Pitch Black Anti-Screen Recording & Anti-Screenshot Shield (Telegram & Banking Style) */}
      <div 
        id="tsehay-privacy-screen-shield"
        aria-hidden="true"
        className={`fixed inset-0 z-[999999999] bg-black flex flex-col items-center justify-center select-none pointer-events-none transition-opacity duration-100 ${
          isShieldActive || screenshotDetected 
            ? 'opacity-100 visible' 
            : 'opacity-0 invisible'
        }`}
      >
        <div className="text-center p-6 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f9b03c]/10 border border-[#f9b03c]/30 flex items-center justify-center text-[#f9b03c] text-2xl animate-pulse">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h3 className="text-white font-bold text-lg mb-1 tracking-wide">
            ይዘቱ ጥበቃ የተደረገለት ነው (Protected Content)
          </h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            ስክሪን ሪከርድ ማድረግ ወይም ፎቶ ማንሳት በጥብቅ የተከለከለ ነው።
          </p>
        </div>
      </div>
    </>
  );
}
