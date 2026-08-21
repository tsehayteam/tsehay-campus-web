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
  const [isManualTrigger, setIsManualTrigger] = useState(false);

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

        // Check if recently dismissed
        const dismissedAt = localStorage.getItem('tsehay_pwa_dismissed');
        const now = Date.now();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (!dismissedAt || now - Number(dismissedAt) > threeDaysMs) {
          // Polite smooth delay before popping up (4 seconds)
          setTimeout(() => {
            setShowPrompt(true);
          }, 4000);
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
          }, 4500);
        }
      }

      // 5. Global custom event to open prompt manually from any button (e.g. Navbar / Footer)
      const handleManualOpen = () => {
        setIsManualTrigger(true);
        setShowPrompt(true);
      };
      window.addEventListener('open-pwa-install', handleManualOpen);

      // 6. Detect successful installation
      window.addEventListener('appinstalled', () => {
        setIsInstalledSuccess(true);
        setDeferredPrompt(null);
        setTimeout(() => setShowPrompt(false), 3500);
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
          setTimeout(() => setShowPrompt(false), 3000);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Snooze for 3 days
    localStorage.setItem('tsehay_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[9999] flex items-end sm:items-auto justify-center p-3 sm:p-0 pointer-events-none animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Background dim on mobile only */}
      <div 
        onClick={handleDismiss} 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:hidden pointer-events-auto transition-opacity"
      />

      {/* Main Luxury Modal Card */}
      <div className="relative w-full max-w-sm sm:w-[390px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-400/50 dark:border-[#f9b03c]/40 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(249,176,60,0.15)] pointer-events-auto select-none">
        {/* Glowing ambient aura */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-[#f9b03c]/30 rounded-3xl blur-xl -z-10 pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center justify-center text-xs transition cursor-pointer active:scale-95"
          title="ዝጋ"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {isInstalledSuccess ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 text-3xl flex items-center justify-center mx-auto shadow-lg border border-emerald-500/30 animate-bounce">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h3 className="text-lg font-black text-dark dark:text-white">በተሳካ ሁኔታ ተጭኗል!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              ፀሐይ ካምፓስ ወደ ስልክዎ / ኮምፒተርዎ ተጨምሯል። በቀጥታ ከስክሪንዎ መክፈት ይችላሉ።
            </p>
          </div>
        ) : (
          /* Standard Install Prompt Screen */
          <div className="space-y-4">
            {/* Header with App Logo & Verified Badge */}
            <div className="flex items-center gap-3.5 pr-6">
              <div className="relative shrink-0">
                <img 
                  src="/tc-logo.jpg" 
                  alt="Tsehay Campus" 
                  className="w-13 h-13 rounded-2xl object-cover shadow-md border-2 border-[#f9b03c]/40"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/favicon.png';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center border-2 border-white dark:border-slate-900 shadow">
                  <i className="fa-solid fa-check"></i>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-dark dark:text-white text-base leading-tight">
                    ፀሐይ ካምፓስ (App)
                  </h3>
                </div>
                <p className="text-[11px] text-[#f9b03c] font-bold mt-0.5 flex items-center gap-1">
                  <i className="fa-solid fa-mobile-screen-button text-[10px]"></i>
                  <span>ኦፊሴላዊ መተግበሪያ • Official App</span>
                </p>
                <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-0.5">
                  <span>★★★★★</span>
                  <span className="text-gray-400 text-[9px] font-normal">• 500+ ተማሪዎች</span>
                </div>
              </div>
            </div>

            {/* Quick Benefits Pills */}
            <div className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-gray-100 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                <div className="w-5 h-5 rounded-lg bg-[#f9b03c]/20 text-[#f9b03c] flex items-center justify-center text-[10px] shrink-0">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <span className="font-medium text-[11px]">በ 1 ክሊክ ፈጣን መዳረሻ (ያለ ዩአርኤል)</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] shrink-0">
                  <i className="fa-solid fa-gauge-high"></i>
                </div>
                <span className="font-medium text-[11px]">ፈጣን አሰሳ እና አነስተኛ ዳታ ቁጠባ</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200">
                <div className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] shrink-0">
                  <i className="fa-solid fa-bell"></i>
                </div>
                <span className="font-medium text-[11px]">አዳዲስ ትምህርቶች እና ማሳወቂያዎች</span>
              </div>
            </div>

            {/* Platform-Specific Action / Guide */}
            {isIOS ? (
              /* iOS Safari Visual Guide */
              <div className="space-y-3 pt-1">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-[11px] text-dark dark:text-gray-200 space-y-2">
                  <p className="font-bold text-[#f9b03c] flex items-center gap-1.5">
                    <i className="fa-brands fa-apple text-sm"></i>
                    <span>በ iPhone / iPad ላይ ለመጫን፦</span>
                  </p>
                  <div className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      <span>ከስር የ <strong>Share (ማጋሪያ)</strong> ምልክቱን ይጫኑ</span>
                      <i className="fa-solid fa-arrow-up-from-bracket text-primary text-xs ml-1"></i>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                      <span>ዝቅ ብለው <strong>"Add to Home Screen"</strong> የሚለውን ይምረጡ</span>
                      <i className="fa-regular fa-square-plus text-primary text-xs ml-1"></i>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                      <span>ከላይ በቀኝ በኩል <strong>"Add"</strong> የሚለውን ይጫኑ</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleDismiss}
                  className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  ገባኝ (Got it)
                </button>
              </div>
            ) : (
              /* Android / Desktop / Chrome 1-Click Install Button */
              <div className="space-y-2 pt-1">
                <button 
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:from-amber-400 hover:to-[#f9b03c] text-slate-950 font-black py-3 px-5 rounded-2xl shadow-lg hover:shadow-[0_0_25px_rgba(249,176,60,0.6)] flex items-center justify-center gap-2 text-sm transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-download text-base animate-bounce"></i>
                  <span>አፕሊኬሽኑን ጫን (Install App)</span>
                </button>

                <button 
                  type="button"
                  onClick={handleDismiss}
                  className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold py-1.5 transition cursor-pointer"
                >
                  ለጊዜው ይቆየን (Maybe Later)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
