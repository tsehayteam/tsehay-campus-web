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

  const handleDismiss = () => {
    setShowToast(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const pathname = usePathname();
  if (isInstalled || pathname?.startsWith('/maintenance')) return null;

  return (
    <div 
      className={`fixed bottom-6 left-4 sm:left-6 z-[9990] transition-all duration-500 ease-out max-w-sm sm:max-w-md ${
        showToast 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : 'translate-y-12 opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#0c1017]/95 backdrop-blur-2xl border border-[#f9b03c]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(249,176,60,0.3)] flex items-center gap-3">
        
        {/* App Icon */}
        <div className="relative shrink-0">
          <img 
            src="/tc-logo.jpg" 
            alt="Tsehay Campus" 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#f9b03c]/50 object-cover shadow-md"
          />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
          </span>
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs sm:text-sm font-black text-white font-heading truncate">
              📱 Tsehay Campus App
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1 font-body">
            የ Tsehay Campus አፕሊኬሽንን በስልክዎ ላይ ይጫኑ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs transition active:scale-95 shadow-[0_0_15px_rgba(249,176,60,0.4)] cursor-pointer whitespace-nowrap"
          >
            ጫን (Install)
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10 text-xs"
            title="ዝጋ"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
