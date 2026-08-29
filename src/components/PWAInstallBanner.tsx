'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Smart Detection: Check if already installed
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('pwa_installed') === 'true';

    if (isStandalone) {
      setIsInstalled(true);
      return; // 🚫 Completely suppress prompt if already installed
    }

    // 2. iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 3. Native BeforeInstallPrompt Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if previously dismissed recently
      const dismissedAt = localStorage.getItem('tsehay_pwa_dismissed');
      const now = Date.now();
      const cooldownMs = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (!dismissedAt || now - Number(dismissedAt) > cooldownMs) {
        // 🌟 6-second initial delay after page visit
        setTimeout(() => {
          setShowBanner(true);
        }, 6000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS prompt after 6 seconds if not dismissed
    if (isIosDevice) {
      const dismissedAt = localStorage.getItem('tsehay_pwa_dismissed');
      const now = Date.now();
      const cooldownMs = 7 * 24 * 60 * 60 * 1000;

      if (!dismissedAt || now - Number(dismissedAt) > cooldownMs) {
        setTimeout(() => {
          setShowBanner(true);
        }, 6000);
      }
    }

    // 4. Manual Open Trigger (e.g. from Navbar or Footer button)
    const handleManualOpen = () => {
      setShowBanner(true);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // 5. Successful installation event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.setItem('pwa_installed', 'true');
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleManualOpen);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          localStorage.setItem('pwa_installed', 'true');
          setIsInstalled(true);
          setShowBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isIOS) {
      alert("በ Safari ላይ 'Share' (📤) ምልክትን ተጭነው 'Add to Home Screen' (➕) ይምረጡ።");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('tsehay_pwa_dismissed', Date.now().toString());
    } catch (e) {}
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-[9990] animate-in slide-in-from-bottom duration-500">
      <div className="relative p-4 sm:p-5 rounded-3xl bg-[#0c1017]/95 backdrop-blur-2xl border border-[#f9b03c]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.25)] flex items-center gap-3.5 sm:gap-4">
        
        {/* App Icon */}
        <div className="relative shrink-0">
          <img 
            src="/tc-logo.jpg" 
            alt="Tsehay Campus" 
            className="w-12 h-12 rounded-2xl border border-[#f9b03c]/40 object-cover shadow-md"
          />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f9b03c]"></span>
          </span>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-xs sm:text-sm font-black text-white font-heading truncate">
              Tsehay Campus App
            </h4>
            <span className="px-1.5 py-0.5 rounded-full bg-[#f9b03c]/15 text-[#f9b03c] text-[9px] font-black uppercase">
              Fast
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 font-body">
            ለፈጣን ትምህርት አፑን በስልክዎ ይጫኑ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs transition active:scale-95 shadow-[0_0_15px_rgba(249,176,60,0.4)] cursor-pointer whitespace-nowrap"
          >
            ጫን (Install)
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10"
            title="ዝጋ"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
