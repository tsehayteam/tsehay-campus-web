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
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

  const handleInstallClick = async () => {
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
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('tsehay_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:left-6 z-[9999] flex items-end sm:items-auto justify-center p-3 sm:p-0 pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-300">
      
      {/* Background dim on mobile only */}
      <div 
        onClick={handleDismiss} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs sm:hidden pointer-events-auto transition-opacity"
      />

      {/* 🌟 3D FLOATING CARD CONTAINER WITH ROTATING BEAM LIGHT BORDER */}
      <div className="relative w-full max-w-[340px] sm:w-[350px] p-[2px] rounded-3xl overflow-hidden pointer-events-auto select-none shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(249,176,60,0.25)] transition-all duration-300 hover:scale-[1.02]">
        
        {/* ⚡ ROTATING BEAM OF LIGHT (Conic Gradient Beam circling the 4 corners) */}
        <div className="absolute -inset-[150%] bg-[conic-gradient(from_0deg,transparent_0_300deg,#f9b03c_330deg,#ffffff_350deg,#f9b03c_360deg)] animate-[spin_3.5s_linear_infinite] pointer-events-none" />

        {/* Ambient Glowing Aura Behind */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-[#f9b03c]/40 rounded-3xl blur-md -z-10 pointer-events-none" />

        {/* Inner Card Body with High-End Glassmorphic Texture */}
        <div className="relative bg-[#070b14]/95 dark:bg-[#050811]/95 backdrop-blur-2xl rounded-[22px] p-4 sm:p-4.5 text-white border border-white/15 overflow-hidden">
          
          {/* Subtle 3D Top Reflection Line */}
          <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer active:scale-90 z-20"
            title="ዝጋ (Close)"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          {isInstalledSuccess ? (
            /* Success Screen */
            <div className="text-center py-4 space-y-2 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 text-2xl flex items-center justify-center mx-auto shadow-lg border border-emerald-500/30 animate-bounce">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h3 className="text-sm font-black text-white font-heading">በተሳካ ሁኔታ ተጭኗል! 🎉</h3>
              <p className="text-[11px] text-gray-300">
                ፀሐይ ካምፓስ ወደ ስልክዎ ተጨምሯል። በቀጥታ ከስክሪንዎ መክፈት ይችላሉ።
              </p>
            </div>
          ) : (
            /* Compact High-Converting Install Prompt */
            <div className="space-y-3">
              
              {/* 3D App Icon + Title Header */}
              <div className="flex items-center gap-3 pr-6">
                <div className="relative shrink-0 group">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 p-[2px] shadow-[0_8px_20px_rgba(249,176,60,0.45)] transform group-hover:rotate-6 transition-transform">
                    <img 
                      src="/tc-logo.jpg" 
                      alt="Tsehay Campus" 
                      className="w-full h-full rounded-[14px] object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/favicon.png';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center border-2 border-[#070b14] shadow font-black">
                    <i className="fa-solid fa-check"></i>
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-heading font-black text-white text-sm tracking-wide truncate">
                      ፀሐይ ካምፓስ አፕ
                    </h3>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-[#f9b03c] font-bold mt-0.5 flex items-center gap-1">
                    <span>⚡ በ 1-ክሊክ ይማሩ • ዳታ ቆጣቢ</span>
                  </p>
                </div>
              </div>

              {/* Compact Benefits Bar */}
              <div className="grid grid-cols-2 gap-1.5 py-1 text-[10px] text-gray-300">
                <div className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-[#f9b03c] text-xs"></i>
                  <span className="font-bold">ፈጣን መዳረሻ</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-bell text-emerald-400 text-xs"></i>
                  <span className="font-bold">የፈተና ማሳወቂያ</span>
                </div>
              </div>

              {/* Platform-Specific Action */}
              {isIOS ? (
                /* iOS Safari Micro-Guide */
                <div className="space-y-2 pt-0.5">
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 text-[11px] space-y-1.5 text-gray-200">
                    <p className="font-bold text-[#f9b03c] text-[10px] flex items-center gap-1">
                      <i className="fa-brands fa-apple"></i>
                      <span>በ iPhone ለመጫን 3 ቀላል ደረጃዎች፦</span>
                    </p>
                    <div className="space-y-1 text-[10px] pl-1 text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                        <span>የ <strong>Share</strong> ምልክት ይጫኑ <i className="fa-solid fa-arrow-up-from-bracket text-[#f9b03c] ml-1"></i></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                        <span><strong>"Add to Home Screen"</strong> ይምረጡ <i className="fa-regular fa-square-plus text-[#f9b03c] ml-1"></i></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                        <span>ከላይ በቀኝ <strong>"Add"</strong> ይጫኑ</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleDismiss}
                    className="w-full bg-white/10 hover:bg-white/20 text-gray-200 font-bold py-2 rounded-xl text-xs transition cursor-pointer text-center active:scale-95"
                  >
                    ገባኝ (Got it)
                  </button>
                </div>
              ) : (
                /* Android / Chrome / Desktop 1-Click Install Button */
                <div className="space-y-1.5 pt-0.5">
                  <button 
                    type="button"
                    onClick={handleInstallClick}
                    className="group w-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 text-slate-950 font-black py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(249,176,60,0.5)] flex items-center justify-center gap-2 text-xs transition-all duration-200 active:scale-90 cursor-pointer"
                  >
                    <i className="fa-solid fa-download text-xs animate-bounce"></i>
                    <span>አፕሊኬሽኑን ጫን (Install App)</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={handleDismiss}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-gray-200 font-bold py-1 transition cursor-pointer"
                  >
                    ለጊዜው ይቆየን (Maybe Later)
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
