'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ContentProtection() {
  const { user } = useAuth();
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [screenshotDetected, setScreenshotDetected] = useState(false);

  useEffect(() => {
    // 1. Intercept PrintScreen key to prevent screen capturing
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

    // 3. Disable Right-Click Context Menu Globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 4. Disable Dragging of Images & Media
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('dragstart', handleDragStart);

    // 5. Disable Copy/Cut of protected content
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

    // 6. Block Web-based getDisplayMedia (Extension screen recording)
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

      {/* 🔐 Dynamic Floating DRM Watermark */}
      <DynamicWatermark user={user} />
    </>
  );
}

function DynamicWatermark({ user }: { user: any }) {
  const [position, setPosition] = useState({ top: '20%', left: '20%' });
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateWatermark = () => {
      const topRandom = Math.floor(Math.random() * 65) + 15;
      const leftRandom = Math.floor(Math.random() * 65) + 15;
      setPosition({ top: `${topRandom}%`, left: `${leftRandom}%` });
      
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateWatermark();
    const interval = setInterval(updateWatermark, 10000);
    return () => clearInterval(interval);
  }, []);

  const identifier = user?.displayName || user?.email || user?.phoneNumber || 'Tsehay Campus Student';

  return (
    <div 
      className="fixed pointer-events-none select-none z-[99999] text-white/[0.08] dark:text-white/[0.06] text-xs font-mono font-bold tracking-widest transition-all duration-1000 transform -rotate-12"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex flex-col items-center">
        <span>TSEHAY CAMPUS • PROTECTED</span>
        <span>{identifier}</span>
        {timeStr && <span className="text-[10px]">{timeStr}</span>}
      </div>
    </div>
  );
}
