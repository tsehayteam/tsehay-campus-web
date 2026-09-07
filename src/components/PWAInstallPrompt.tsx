'use client';
import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update().catch(() => {});
      }).catch(() => {});
    }

    // 2. Check if already running in standalone / installed mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) return;

      // 3. Detect iOS Device
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(isIosDevice);

      // 4. Capture native beforeinstallprompt (Android / Chrome / Edge / Desktop PC)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);

        const dismissedAt = localStorage.getItem('tsehay_pwa_dismissed');
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (!dismissedAt || now - Number(dismissedAt) > threeDaysMs) {
          setTimeout(() => {
            setShowPrompt(true);
          }, 3500);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // If iOS, check dismissal and show prompt politely
      if (isIosDevice) {
        const dismissedAt = localStorage.getItem('tsehay_pwa_dismissed');
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (!dismissedAt || now - Number(dismissedAt) > threeDaysMs) {
          setTimeout(() => {
            setShowPrompt(true);
          }, 4000);
        }
      }

      // 5. Global custom event to open prompt manually from any button (e.g. Navbar / Footer)
      const handleManualOpen = () => {
        setShowPrompt(true);
      };
      window.addEventListener('open-pwa-install', handleManualOpen);

      // 6. Detect successful installation
      window.addEventListener('appinstalled', () => {
        setIsInstalledSuccess(true);
        setDeferredPrompt(null);
        setTimeout(() => setShowPrompt(false), 3000);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('open-pwa-install', handleManualOpen);
      };
    }
  }, []);

  const [showIosTip, setShowIosTip] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosTip(prev => !prev);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalledSuccess(true);
          setTimeout(() => setShowPrompt(false), 2500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      // Fallback: trigger general instructions
      setShowIosTip(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('tsehay_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 z-[9999] flex justify-center sm:justify-end pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-400">
      {/* 🌟 ULTRA-COMPACT FLOATING PILL CONTAINER WITH GENTLE BREATHING PULSE */}
      <div 
        className="relative w-full max-w-sm p-[1.5px] rounded-2xl overflow-hidden pointer-events-auto select-none pwa-compact-pulse transition-all duration-300 hover:scale-[1.01]"
        style={{
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.9), 0 0 20px rgba(249, 176, 60, 0.25)'
        }}
      >
        {/* Subtle border glow */}
        <div className="absolute -inset-[150%] bg-[conic-gradient(from_0deg,transparent_0_300deg,#f9b03c_330deg,#ffffff_350deg,#f9b03c_360deg)] animate-[spin_5s_linear_infinite] pointer-events-none opacity-60" />

        {/* Inner Card Body */}
        <div 
          className="relative text-white border border-white/15 overflow-hidden px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-[15px]"
          style={{
            backdropFilter: 'blur(25px)',
            WebkitBackdropFilter: 'blur(25px)',
            background: 'rgba(4, 8, 20, 0.94)'
          }}
        >
          {isInstalledSuccess ? (
            /* Mini Success Banner */
            <div className="flex items-center gap-2.5 py-1 px-1 text-emerald-400">
              <i className="fa-solid fa-circle-check text-base text-emerald-400 animate-bounce" />
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs font-black text-white font-heading">በተሳካ ሁኔታ ተጭኗል! 🎉</p>
                <p className="text-[10px] text-gray-300 truncate">አፑ ወደ ስልክዎ ተጨምሯል</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* Horizontal Ultra-Compact Bar */}
              <div className="flex items-center gap-2.5">
                {/* Mini Logo Icon */}
                <div className="relative shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 p-[1.5px] shadow-[0_0_12px_rgba(249,176,60,0.4)]">
                  <img 
                    src="/tc-logo.jpg" 
                    alt="Tsehay Campus" 
                    className="w-full h-full object-cover rounded-[9px]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/favicon.png';
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center border border-[#040814] font-black">
                    ✓
                  </span>
                </div>

                {/* Minimalist & Action-Driven Copy */}
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="font-heading font-black text-white text-xs tracking-tight truncate flex items-center gap-1">
                    <span>ፀሐይ ካምፓስ አፕ</span>
                    <span className="text-[7.5px] bg-[#f9b03c]/20 text-[#f9b03c] px-1 py-0.2 rounded border border-[#f9b03c]/30 font-bold">
                      PRO
                    </span>
                  </h4>
                  <p className="text-[10px] text-amber-300/90 font-bold truncate mt-0.5 flex items-center gap-1">
                    <span>⚡ ፈጣን ትምህርት • ከመስመር ውጭ</span>
                  </p>
                </div>

                {/* Action Button: ጫን (Install) */}
                <button 
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs shadow-[0_0_14px_rgba(249,176,60,0.45)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-transform"
                >
                  <i className="fa-solid fa-download text-[10px] animate-bounce"></i>
                  <span>ጫን</span>
                </button>

                {/* Close Button */}
                <button 
                  type="button"
                  onClick={handleDismiss}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-[10px] shrink-0 transition cursor-pointer active:scale-90 border border-white/10 ml-0.5"
                  title="ዝጋ (Close)"
                  aria-label="Close"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {/* Minimalist iOS 1-Line Tip (Only expands if on iOS and user taps) */}
              {isIOS && showIosTip && (
                <div className="pt-1.5 border-t border-white/10 text-[10px] text-gray-200 flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <span className="truncate">
                    የ <strong>Share</strong> <i className="fa-solid fa-arrow-up-from-bracket text-[#f9b03c] text-[10px] mx-0.5" /> ነክተው <strong>"Add to Home Screen"</strong> ይጫኑ
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIosTip(false)}
                    className="px-2 py-0.5 text-[9px] font-bold bg-[#f9b03c]/20 text-[#f9b03c] rounded border border-[#f9b03c]/30 shrink-0"
                  >
                    እሺ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
