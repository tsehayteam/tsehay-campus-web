'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const hideTimerRef = useRef<any>(null);

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
      return;
    }

    // 2. iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 3. Helper to trigger 6-second visible toast
    const triggerToast = () => {
      setShowToast(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowToast(false);
      }, 6000);
    };

    // 4. Native BeforeInstallPrompt Listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Initial toast after 5 seconds
      setTimeout(() => {
        triggerToast();
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS or browsers without event, trigger initial reminder after 6s
    const initialTimer = setTimeout(() => {
      triggerToast();
    }, 6000);

    // 5. Periodic Reminder every 3 minutes if not installed
    const recurringInterval = setInterval(() => {
      triggerToast();
    }, 3 * 60 * 1000);

    // 6. Manual Open Trigger (e.g. from Navbar or Footer button)
    const handleManualOpen = () => {
      triggerToast();
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    // 7. Successful installation event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowToast(false);
      localStorage.setItem('pwa_installed', 'true');
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringInterval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
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
          setShowToast(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isIOS) {
      alert("በ Safari ላይ 'Share' (📤) ምልክትን ተጭነው 'Add to Home Screen' (➕) ይምረጡ።");
    } else {
      alert("አፑን ለመጫን በብራውዘርዎ ሜኑ (⋮) ላይ 'Install app' ወይም 'Add to Home screen' የሚለውን ይጫኑ።");
    }
  };

  useEffect(() => {
    const handleDirectInstall = () => {
      handleInstall();
    };
    window.addEventListener('tsehay_trigger_install_now', handleDirectInstall);
    return () => window.removeEventListener('tsehay_trigger_install_now', handleDirectInstall);
  }, [deferredPrompt, isIOS]);

  const handleDismiss = () => {
    setShowToast(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const pathname = usePathname();
  if (isInstalled || pathname?.startsWith('/maintenance')) return null;

  return (
    <aside 
      aria-label="Install Tsehay Campus App"
      className={`fixed bottom-6 left-4 sm:left-6 z-[9990] transition-all duration-500 ease-out max-w-sm sm:max-w-md ${
        showToast 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      {/* Compact Rectangular Glassmorphic Card with Attractive Amber Border */}
      <div 
        className="relative p-3.5 sm:p-4 border border-[#f9b03c]/50 rounded-2xl flex items-center gap-3.5 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.25)] select-none backdrop-blur-2xl bg-[#03060d]/95"
      >
        {/* App Icon */}
        <div className="relative shrink-0">
          <img 
            src="/tc-logo.jpg" 
            alt="Tsehay Campus" 
            className="w-11 h-11 sm:w-12 sm:h-12 object-cover rounded-xl shadow-md border border-[#f9b03c]/40"
          />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f9b03c]"></span>
          </span>
        </div>

        {/* Short, Attractive & Action-Oriented Text Details (Mobile & Desktop) */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-white font-heading truncate tracking-wide">
              የፀሐይ ካምፓስ አፕሊኬሽን
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/35 whitespace-nowrap">
              📱💻 PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium leading-snug">
            🚀 በ1 ክሊክ ፈጣን ትምህርት፣ ከመስመር ውጭ ዝግጁነት እና የቀጥታ ማሳወቂያዎች ያግኙ!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10 text-[11px]"
            title="ዝጋ (Close)"
            aria-label="Close install notification"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs transition shadow-[0_0_15px_rgba(249,176,60,0.5)] cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <i className="fa-solid fa-download text-[11px] animate-bounce"></i>
            <span>ጫን (Install)</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
