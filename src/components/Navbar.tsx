'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";
import SmartSearchInput from "./SmartSearchInput";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { getCachedCourses } from "@/lib/courseCache";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isCurtainOpen, setIsCurtainOpen] = useState(true);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const { lang, toggleLanguage, t } = useLanguage();

  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('tsehay_auth_user_cache');
      return cached ? JSON.parse(cached)?.photoURL || null : null;
    } catch (e) { return null; }
  });
  const [customName, setCustomName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('tsehay_auth_user_cache');
      return cached ? JSON.parse(cached)?.displayName || null : null;
    } catch (e) { return null; }
  });

  const [allCourses, setAllCourses] = useState<any[]>(() => getCachedCourses());
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const navUserName = customName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const navUserPhoto = customPhoto || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.photoURL !== undefined) {
        setCustomPhoto(e.detail.photoURL || null);
      }
      if (e.detail?.displayName !== undefined) {
        setCustomName(e.detail.displayName || null);
      }
    };
    window.addEventListener('tsehay_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('tsehay_profile_updated', handleProfileUpdate);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;
    if (diff > 50) {
      setIsCurtainOpen(true);
    } else if (diff < -50) {
      setIsCurtainOpen(false);
    }
    setTouchStartY(null);
  };

  useEffect(() => {
    const handleOpenCurtain = () => setIsCurtainOpen(true);
    const handleCloseCurtain = () => setIsCurtainOpen(false);
    const handleToggleCurtain = () => setIsCurtainOpen(prev => !prev);

    window.addEventListener('open-nav-curtain', handleOpenCurtain);
    window.addEventListener('close-nav-curtain', handleCloseCurtain);
    window.addEventListener('toggle-nav-curtain', handleToggleCurtain);

    return () => {
      window.removeEventListener('open-nav-curtain', handleOpenCurtain);
      window.removeEventListener('close-nav-curtain', handleCloseCurtain);
      window.removeEventListener('toggle-nav-curtain', handleToggleCurtain);
    };
  }, []);

  const navigateTo = (url: string) => {
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);

    if (url.startsWith('/#') || url.startsWith('#')) {
      const hash = url.replace('/#', '').replace('#', '');
      if (pathname === '/') {
        const el = document.getElementById(hash);
        if (el) {
          const offset = 80;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
        }
      } else {
        router.push('/#' + hash);
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
          }
        }, 350);
      }
      return;
    }

    if (pathname === url) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(url);
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleOpenAuth = (e: any) => {
      setIsSignupMode(e.detail?.isSignupMode ?? e.detail?.isSignUp ?? false);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);

    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const fetchCourses = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const querySnapshot = await getDocs(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
        setAllCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error('Failed to fetch courses for search');
      }
    };
    fetchCourses();

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const openAuthModal = (signup: boolean) => {
    setIsSignupMode(signup);
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Signout warning:", e);
    } finally {
      try {
        localStorage.removeItem('tsehay_auth_user_cache');
        localStorage.removeItem('tsehay_auth_is_admin');
        localStorage.removeItem('tsehay_user_role');
        localStorage.removeItem('tsehay_user_active_course');
        localStorage.removeItem('tsehay_user_active_lesson');
        sessionStorage.clear();
      } catch (e) {}
      setShowProfileDropdown(false);
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
        router.push('/');
      }
    }
  };

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isCourses = pathname?.startsWith('/courses');

  return (
    <>
      {/* 1. ✨ Floating Minimalist Pull Tab Handle (Visible when Curtain is Rolled Up) */}
      <div 
        onClick={() => setIsCurtainOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[9990] cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurtainOpen 
            ? 'opacity-0 -translate-y-full pointer-events-none' 
            : 'opacity-100 translate-y-0'
        }`}
        title="ማውጫውን ለመክፈት ይጫኑ (Click to Open Menu)"
      >
        <div className="bg-white/90 dark:bg-[#030509]/90 hover:bg-white dark:hover:bg-[#080d1a] backdrop-blur-2xl border-x border-b border-black/10 dark:border-white/10 hover:border-[#f9b03c]/60 px-5 sm:px-6 py-1.5 rounded-b-2xl shadow-[0_4px_25px_rgba(0,0,0,0.4),0_0_15px_rgba(249,176,60,0.15)] flex items-center gap-2.5 group transition-all duration-300 hover:py-2 hover:px-7 active:scale-95">
          {/* Compass Icon */}
          <div className="w-5 h-5 rounded-full bg-[#f9b03c]/15 border border-[#f9b03c]/40 flex items-center justify-center text-[#f9b03c] text-[11px] shadow-sm">
            <i className="fa-solid fa-compass"></i>
          </div>

          {/* Label Text */}
          <span className="text-xs font-bold tracking-wide text-gray-800 dark:text-gray-200 group-hover:text-[#f9b03c] transition-colors whitespace-nowrap flex items-center gap-1.5 font-heading">
            <i className="fa-solid fa-house text-[10px] text-[#f9b03c]"></i>
            <span>ማውጫ / መነሻ (Menu)</span>
          </span>

          <i className="fa-solid fa-chevron-down text-[10px] text-[#f9b03c] transition-transform group-hover:translate-y-0.5"></i>
        </div>
      </div>

      {/* 2. Backdrop Overlay when Curtain is Expanded (Clicking outside closes it) */}
      {isCurtainOpen && (
        <div 
          onClick={() => setIsCurtainOpen(false)}
          className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
        />
      )}

      {/* 3. 🚀 Sliding Curtain Navbar (እንደ መጋረጃ የሚወርድ እና የሚጠቀለል ተንሸራታች) */}
      <nav 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 right-0 w-full z-[9999] glass-nav border-b border-black/5 dark:border-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform select-none ${
          isCurtainOpen 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Attached Roll-up Close Handle at Bottom Center */}
        <button 
          type="button"
          onClick={() => setIsCurtainOpen(false)}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#030509]/90 hover:bg-white dark:hover:bg-[#080d1a] backdrop-blur-2xl border-x border-b border-black/10 dark:border-white/10 hover:border-[#f9b03c]/60 px-4 py-1 rounded-b-xl shadow-lg flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-[#f9b03c] transition-all cursor-pointer group/close hover:px-5"
          title="ወደ ላይ መልሰህ እጠፍ (Roll Up Menu)"
        >
          <i className="fa-solid fa-chevron-up text-[10px] group-hover/close:-translate-y-0.5 transition-transform text-[#f9b03c]"></i>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 group-hover/close:text-[#f9b03c]">
            ወደ ላይ እጠፍ (Roll Up)
          </span>
        </button>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 sm:h-20 gap-3 lg:gap-6">
            
            {/* Brand Logo */}
            <Link 
              href="/" 
              onClick={() => { 
                setIsMobileMenuOpen(false); 
                if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
              className="flex-shrink-0 flex items-center cursor-pointer group gap-2.5 mr-2 sm:mr-4 lg:mr-8 transition-opacity duration-300 hover:opacity-90"
            >
              <img 
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-10 sm:h-12 w-auto object-contain rounded-xl shadow-sm border border-black/10 dark:border-white/10 group-hover:border-[#f9b03c]/50 transition-colors duration-300" 
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff'; }} 
              />
              <span className="font-heading font-black text-xl sm:text-2xl tracking-tight hidden sm:block notranslate select-none">
                <span className="text-[#f9b03c]">Tsehay</span> <span className="text-gray-900 dark:text-white">Campus</span>
              </span>
            </Link>

            {/* Navigation Links (Crisp Typography, No Jump, Smooth Golden Glow Underline) */}
            <div className="hidden lg:flex items-center gap-7 h-full">
              <Link 
                href="/" 
                onClick={() => {
                  if (pathname === '/') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold flex items-center gap-1.5 transition-all duration-300 ${
                  isHome 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                <i className="fa-solid fa-house text-xs opacity-75"></i>
                <span>{t('home') || 'መነሻ'}</span>
              </Link>

              <Link 
                href="/about" 
                onClick={() => {
                  if (pathname === '/about') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 ${
                  isAbout 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('about_us')}
              </Link>

              <Link 
                href="/courses" 
                onClick={() => {
                  if (pathname === '/courses') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 ${
                  isCourses 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('all_courses')}
              </Link>
            </div>
            
            {/* Sleek Integrated Search Bar */}
            <div className="flex-1 max-w-xs md:max-w-sm hidden md:flex items-center mx-2 lg:mx-4 relative z-[60]">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Marketing, Python)..."} 
              />
            </div>
            
            {/* Desktop Right Action Items */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 font-heading text-sm">
              {/* Premium AI Feature Pill Button */}
              <button 
                type="button"
                onClick={() => {
                  if (pathname === '/') {
                    const element = document.getElementById('ai-feature');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  } else {
                    router.push('/#ai-feature');
                    setTimeout(() => {
                      document.getElementById('ai-feature')?.scrollIntoView({ behavior: 'smooth' });
                    }, 350);
                  }
                }} 
                className="terafab-ai-btn flex items-center gap-2 px-3.5 py-1.5 rounded-full text-gray-900 dark:text-white font-bold text-xs cursor-pointer notranslate active:scale-[0.98]"
                title="Tsehay AI 24/7 የግል መምህር"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[#f9b03c] text-xs"></i> 
                <span className="text-xs font-black tracking-wide">Tsehay AI</span>
              </button>

              {/* Install App Quick Trigger (Sleek Glassmorphic Pill) */}
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                className="btn-install-pwa hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-xs cursor-pointer notranslate"
                title="አፕሊኬሽኑን በስልክዎ ወይም በኮምፒተርዎ ላይ ይጫኑ (Install App)"
              >
                <i className="fa-solid fa-mobile-screen-button text-xs opacity-75"></i>
                <span>አፕ ጫን</span>
              </button>

              {/* Minimalist Language Switcher */}
              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 hover:border-[#f9b03c]/50 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer notranslate" 
                translate="no"
                title="ቋንቋ ይቀይሩ / Switch Language"
              >
                <i className="fa-solid fa-globe text-[11px] opacity-75"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              {/* Minimalist Dark/Light Mode Toggle */}
              <button 
                onClick={toggleTheme} 
                className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-yellow-400 flex items-center justify-center text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                aria-label="Toggle dark/light mode"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
              </button>

              <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-0.5"></div>
              
              {!mounted || !user ? (
                /* Primary Golden CTA Button */
                <button 
                  onClick={() => openAuthModal(false)} 
                  className="bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black px-5 py-2 rounded-xl text-xs sm:text-sm shadow-[0_0_18px_rgba(249,176,60,0.25)] hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap cursor-pointer"
                >
                  {t('login')}
                </button>
              ) : (
                <div className="relative" ref={profileDropdownRef}>
                  {/* User Profile Avatar */}
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
                    className="flex items-center gap-2 focus:outline-none cursor-pointer"
                  >
                    <img 
                      src={navUserPhoto} 
                      alt={navUserName} 
                      className="w-9 h-9 rounded-full border-2 border-[#f9b03c] object-cover hover:scale-105 transition-transform duration-300 shadow-sm" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;
                      }}
                    />
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link 
                        href="/dashboard" 
                        onClick={() => setShowProfileDropdown(false)} 
                        className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white hover:bg-[#f9b03c]/10 hover:text-[#f9b03c] transition border-b border-gray-100 dark:border-white/5"
                      >
                        <i className="fa-solid fa-graduation-cap text-[#f9b03c] text-base"></i> 
                        <span>{t('classroom') || 'ወደ መማሪያ ክፍል'}</span>
                      </Link>
                      {isAdmin && (
                        <Link 
                          href="/admin" 
                          onClick={() => setShowProfileDropdown(false)} 
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-[#f9b03c]/10 hover:text-[#f9b03c] transition"
                        >
                          <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i> 
                          <span>{t('admin') || 'አድሚን'}</span>
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100 dark:border-white/5" />
                      <button 
                        onClick={() => { setShowProfileDropdown(false); handleSignOut(); }} 
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 font-bold transition cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> 
                        <span>{t('logout') || 'ዘግተህ ውጣ (Logout)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile View Controls */}
            <div className="md:hidden flex items-center gap-2">
              <button 
                onClick={toggleTheme} 
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-yellow-400 text-xs transition"
                aria-label="Toggle dark/light mode"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
              </button>

              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white font-bold text-xs transition notranslate" 
                translate="no"
              >
                <i className="fa-solid fa-globe text-[10px] opacity-75"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                aria-label="Toggle navigation menu" 
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center text-base focus:outline-none transition active:scale-95 cursor-pointer"
              >
                <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark text-[#f9b03c]' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Frosted Glass Drawer */}
        <div className={`md:hidden bg-white/95 dark:bg-[#030509]/95 backdrop-blur-2xl border-t border-b border-gray-200 dark:border-white/5 shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'max-h-[550px] opacity-100 py-3' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <div className="px-4 space-y-2 flex flex-col overflow-y-auto max-h-[75vh]">
            <div className="pb-1">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ..."} 
              />
            </div>

            <button 
              type="button" 
              onClick={() => navigateTo('/')} 
              className="w-full flex items-center justify-between px-4 py-3 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-[#f9b03c]/10 border border-gray-100 dark:border-white/5 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-house text-[#f9b03c]"></i>
                <span>{t('home') || 'መነሻ ገጽ'}</span>
              </span>
              <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            </button>

            <button 
              type="button" 
              onClick={() => navigateTo('/about')} 
              className="w-full flex items-center justify-between px-4 py-3 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-[#f9b03c]/10 border border-gray-100 dark:border-white/5 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-circle-info text-[#f9b03c]"></i>
                <span>{t('about_us')}</span>
              </span>
              <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            </button>

            <button 
              type="button" 
              onClick={() => navigateTo('/courses')} 
              className="w-full flex items-center justify-between px-4 py-3 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-[#f9b03c]/10 border border-gray-100 dark:border-white/5 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-book-open text-[#f9b03c]"></i>
                <span>{t('all_courses')}</span>
              </span>
              <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            </button>

            <button 
              type="button" 
              onClick={() => navigateTo('/#ai-feature')} 
              className="w-full flex items-center justify-between px-4 py-3 text-gray-900 dark:text-white font-bold rounded-xl hover:bg-[#f9b03c]/10 border border-gray-100 dark:border-white/5 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-wand-magic-sparkles text-[#f9b03c]"></i>
                <span className="notranslate">Tsehay AI</span>
              </span>
              <span className="text-[10px] bg-[#f9b03c]/20 text-[#f9b03c] font-black px-2 py-0.5 rounded-full">AI</span>
            </button>

            {/* Mobile Install App Button */}
            <button 
              type="button" 
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open-pwa-install'));
              }} 
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/10 dark:bg-amber-500/10 border border-[#f9b03c]/30 text-[#f9b03c] font-black rounded-xl hover:bg-[#f9b03c]/20 transition cursor-pointer text-left"
            >
              <span className="flex items-center gap-3">
                <i className="fa-solid fa-mobile-screen-button text-base"></i>
                <span>አፕሊኬሽኑን ጫን (Install App)</span>
              </span>
              <span className="text-[10px] bg-[#f9b03c] text-black font-black px-2 py-0.5 rounded-md">FREE</span>
            </button>

            <hr className="my-1 border-gray-200 dark:border-white/5" />

            {!mounted || !user ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsMobileMenuOpen(false); openAuthModal(false); }} 
                  className="w-full text-gray-800 dark:text-white font-bold py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer text-center text-sm"
                >
                  {t('login')}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsMobileMenuOpen(false); openAuthModal(true); }} 
                  className="w-full bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black py-3 rounded-xl shadow-md transition cursor-pointer text-center text-sm"
                >
                  {t('register')}
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => navigateTo('/dashboard')} 
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#f9b03c]/10 border border-[#f9b03c]/30 text-[#f9b03c] font-black rounded-xl hover:bg-[#f9b03c]/20 transition cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <i className="fa-solid fa-graduation-cap"></i>
                    <span>{t('classroom') || 'ወደ መማሪያ ክፍል'}</span>
                  </span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </button>
                {isAdmin && (
                  <button 
                    type="button" 
                    onClick={() => navigateTo('/admin')} 
                    className="w-full flex items-center justify-between px-4 py-2.5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition cursor-pointer text-sm"
                  >
                    <span className="flex items-center gap-3">
                      <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i>
                      <span>{t('admin') || 'አድሚን'}</span>
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }} 
                  className="w-full text-red-500 font-bold py-2.5 hover:bg-red-500/10 rounded-xl border border-red-500/30 transition cursor-pointer text-center flex items-center justify-center gap-2 text-sm"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i> {t('logout') || 'ዘግተህ ውጣ (Logout)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />
    </>
  );
}
