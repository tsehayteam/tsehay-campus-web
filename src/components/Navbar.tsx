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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
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

  // Handle custom profile updates
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

  // Lock body scroll when full-screen mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close menus on route change
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
      setIsMobileMenuOpen(false);
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
        router.push('/');
      }
    }
  };

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

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isCourses = pathname?.startsWith('/courses');

  return (
    <>
      {/* =========================================================================
          1. 🚀 MAIN DESKTOP & MOBILE HEADER NAVBAR (Fixed Glassmorphic Bar)
         ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 w-full z-[9990] glass-nav border-b border-black/5 dark:border-white/[0.06] shadow-[0_8px_35px_rgba(0,0,0,0.65)] select-none">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-3 lg:gap-6">
            
            {/* Brand Logo */}
            <Link 
              href="/" 
              onClick={() => { 
                if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
              className="flex-shrink-0 flex items-center cursor-pointer group gap-2.5 mr-2 sm:mr-4 lg:mr-8 brand-entrance"
            >
              <img 
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-9 sm:h-12 w-auto object-contain rounded-xl shadow-sm border border-black/10 dark:border-white/10 group-hover:border-[#f9b03c]/50 brand-logo-img transition-all" 
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff'; }} 
              />
              <span className="font-heading font-black text-lg sm:text-2xl tracking-tight hidden sm:block notranslate select-none transition-colors duration-300">
                <span className="text-[#f9b03c]">Tsehay</span> <span className="text-[#3268ba]">Campus</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-7 h-full">
              <Link 
                href="/" 
                onClick={() => {
                  if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
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
                href="/courses" 
                onClick={() => {
                  if (pathname === '/courses') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 ${
                  isCourses 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('all_courses') || 'ሁሉም ኮርሶች'}
              </Link>

              <Link 
                href="/about" 
                onClick={() => {
                  if (pathname === '/about') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 ${
                  isAbout 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('about_us') || 'ስለ እኛ'}
              </Link>
            </div>
            
            {/* Desktop Smart Search Bar */}
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
                    document.getElementById('ai-feature')?.scrollIntoView({ behavior: 'smooth' });
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

              {/* Install App Trigger */}
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                className="btn-install-pwa hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-xs cursor-pointer notranslate"
                title="አፕሊኬሽኑን በስልክዎ ወይም በኮምፒተርዎ ላይ ይጫኑ (Install App)"
              >
                <i className="fa-solid fa-mobile-screen-button text-xs opacity-75"></i>
                <span>አፕ ጫን</span>
              </button>

              {/* Language Switcher */}
              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 hover:border-[#f9b03c]/50 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer notranslate" 
                translate="no"
                title="ቋንቋ ይቀይሩ / Switch Language"
              >
                <i className="fa-solid fa-globe text-[11px] opacity-75"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              {/* Dark/Light Mode Toggle */}
              <button 
                onClick={toggleTheme} 
                className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-yellow-400 flex items-center justify-center text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                aria-label="Toggle dark/light mode"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
              </button>

              <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-0.5"></div>
              
              {!mounted || !user ? (
                <button 
                  onClick={() => openAuthModal(false)} 
                  className="bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black px-5 py-2 rounded-xl text-xs sm:text-sm shadow-[0_0_18px_rgba(249,176,60,0.25)] hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap cursor-pointer"
                >
                  {t('login') || 'ግባ (Login)'}
                </button>
              ) : (
                <div className="relative" ref={profileDropdownRef}>
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

            {/* Mobile Top Header Actions with Morphing Hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <button 
                onClick={toggleTheme} 
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-yellow-400 text-xs transition active:scale-95 cursor-pointer"
                aria-label="Toggle dark/light mode"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
              </button>

              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white font-bold text-xs transition notranslate active:scale-95 cursor-pointer" 
                translate="no"
              >
                <i className="fa-solid fa-globe text-[11px] opacity-75"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              {/* 🍔 SILICON VALLEY MORPHING HAMBURGER BUTTON */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.08] border border-gray-200 dark:border-white/15 flex flex-col items-center justify-center gap-1.5 focus:outline-none cursor-pointer active:scale-95 transition-all duration-300 hover:border-[#f9b03c]/60 shadow-sm"
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <span
                  className={`hamburger-line block h-[2.5px] w-5 rounded-full bg-gray-900 dark:bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? 'translate-y-[8px] rotate-45 bg-[#f9b03c] dark:bg-[#f9b03c]' : ''
                  }`}
                />
                <span
                  className={`hamburger-line block h-[2.5px] w-5 rounded-full bg-gray-900 dark:bg-white transition-all duration-200 ${
                    isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`hamburger-line block h-[2.5px] w-5 rounded-full bg-gray-900 dark:bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? '-translate-y-[8px] -rotate-45 bg-[#f9b03c] dark:bg-[#f9b03c]' : ''
                  }`}
                />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* =========================================================================
          2. ✨ FULL-SCREEN GLASSMORPHIC MOBILE OVERLAY MENU (terafab.ai / x.ai Style)
         ========================================================================= */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-fullscreen-overlay lg:hidden flex flex-col justify-between p-6 sm:p-8 select-none"
          role="dialog"
          aria-modal="true"
        >
          {/* Ambient Glowing Neon Orbs */}
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#f9b03c]/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#3268ba]/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

          {/* Top Bar inside Overlay */}
          <div className="flex items-center justify-between relative z-10 w-full">
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <img 
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-10 w-auto object-contain rounded-xl shadow-md border border-white/20" 
              />
              <span className="font-heading font-black text-xl text-white tracking-tight notranslate">
                <span className="text-[#f9b03c]">Tsehay</span> <span className="text-[#3268ba]">Campus</span>
              </span>
            </Link>

            {/* Top Close Morphing Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/20 flex items-center justify-center text-white hover:text-[#f9b03c] transition-all cursor-pointer active:scale-95 shadow-md"
              aria-label="Close menu"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Middle: Centered Massive Typography Navigation Links */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 my-auto relative z-10 text-center">
            
            {/* Link 1: መነሻ (Home) */}
            <div className="mobile-link-stagger-1">
              <button 
                type="button" 
                onClick={() => navigateTo('/')} 
                className={`mobile-nav-hero-link font-heading cursor-pointer ${
                  isHome ? 'mobile-nav-hero-link-active' : ''
                }`}
              >
                <span>{t('home') || 'መነሻ'}</span>
                {isHome && <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-pulse shadow-[0_0_12px_#f9b03c]"></span>}
              </button>
            </div>

            {/* Link 2: ሁሉም ኮርሶች (All Courses) */}
            <div className="mobile-link-stagger-2">
              <button 
                type="button" 
                onClick={() => navigateTo('/courses')} 
                className={`mobile-nav-hero-link font-heading cursor-pointer ${
                  isCourses ? 'mobile-nav-hero-link-active' : ''
                }`}
              >
                <span>{t('all_courses') || 'ሁሉም ኮርሶች'}</span>
                {isCourses && <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-pulse shadow-[0_0_12px_#f9b03c]"></span>}
              </button>
            </div>

            {/* Link 3: ስለ እኛ (About Us) */}
            <div className="mobile-link-stagger-3">
              <button 
                type="button" 
                onClick={() => navigateTo('/about')} 
                className={`mobile-nav-hero-link font-heading cursor-pointer ${
                  isAbout ? 'mobile-nav-hero-link-active' : ''
                }`}
              >
                <span>{t('about_us') || 'ስለ እኛ'}</span>
                {isAbout && <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-pulse shadow-[0_0_12px_#f9b03c]"></span>}
              </button>
            </div>

            {/* Compact Search Bar beneath Links */}
            <div className="mobile-link-stagger-4 w-full max-w-xs pt-2">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Marketing, Python)..."} 
              />
            </div>
          </div>

          {/* Bottom: Anchored Action Bar */}
          <div className="mobile-link-stagger-bottom w-full space-y-3 relative z-10 pt-4 border-t border-white/[0.08]">
            
            {/* Row 1: Tsehay AI + Install App Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Tsehay AI Button with Golden Glow */}
              <button 
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigateTo('/#ai-feature');
                }}
                className="py-3 px-3.5 rounded-2xl bg-white/[0.05] hover:bg-[#f9b03c]/15 border border-[#f9b03c]/50 hover:border-[#f9b03c] text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(249,176,60,0.15)] cursor-pointer active:scale-95 group"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[#f9b03c] text-sm animate-pulse"></i>
                <div className="text-left">
                  <div className="text-xs font-black text-white group-hover:text-[#f9b03c] leading-tight">Tsehay AI</div>
                  <div className="text-[9px] text-[#f9b03c] font-bold">24/7 AI Tutor</div>
                </div>
              </button>

              {/* 2. Install App Button */}
              <button 
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                }}
                className="py-3 px-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <i className="fa-solid fa-mobile-screen-button text-[#3268ba] text-sm"></i>
                <div className="text-left">
                  <div className="text-xs font-black text-white leading-tight">አፕሊኬሽን ጫን</div>
                  <div className="text-[9px] text-gray-400 font-bold">Install App (FREE)</div>
                </div>
              </button>
            </div>

            {/* Row 2: Wide Sleek Royal Blue Login / Classroom Button */}
            {!mounted || !user ? (
              <button 
                type="button" 
                onClick={() => { 
                  setIsMobileMenuOpen(false); 
                  openAuthModal(false); 
                }} 
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#3268ba] to-[#245296] hover:from-[#2c5da8] hover:to-[#1e447d] text-white font-black text-sm shadow-[0_10px_30px_rgba(50,104,186,0.4)] border border-white/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
              >
                <i className="fa-solid fa-arrow-right-to-bracket text-[#f9b03c]"></i>
                <span>{t('login') || 'ግባ (Login)'}</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.05] border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={navUserPhoto} 
                      alt={navUserName} 
                      className="w-8 h-8 rounded-full border-2 border-[#f9b03c] object-cover" 
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white truncate">{navUserName}</div>
                      <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-bold px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={() => { 
                    setIsMobileMenuOpen(false); 
                    navigateTo('/dashboard'); 
                  }} 
                  className="w-full py-3 rounded-2xl bg-[#f9b03c] text-black font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <i className="fa-solid fa-graduation-cap"></i>
                  <span>{t('classroom') || 'ወደ መማሪያ ክፍል (Classroom)'}</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        isSignupMode={isSignupMode} 
        setIsSignupMode={setIsSignupMode} 
      />
    </>
  );
}
