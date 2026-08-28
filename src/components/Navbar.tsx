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
  const [isCurtainOpen, setIsCurtainOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [theme, setTheme] = useState('dark');
  const { lang, toggleLanguage, t } = useLanguage();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Keep curtain closed by default so user manually clicks to open
    setIsCurtainOpen(false);
  }, []);

  // ✍️ Typewriter effect for brand logo text ("Tsehay Campus")
  const fullBrandName = "Tsehay Campus";
  const [displayedBrand, setDisplayedBrand] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    if (!isCurtainOpen) return;
    let charIndex = 0;
    setDisplayedBrand("");
    setIsTypingDone(false);

    const typingTimer = setInterval(() => {
      if (charIndex <= fullBrandName.length) {
        setDisplayedBrand(fullBrandName.slice(0, charIndex));
        charIndex++;
      } else {
        setIsTypingDone(true);
        clearInterval(typingTimer);
      }
    }, 70);

    return () => clearInterval(typingTimer);
  }, [isCurtainOpen, animationKey]);

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
    // Strictly ONLY swipe UP to close when open (NEVER swipe down to open)
    if (diff < -35 && isCurtainOpen) {
      setIsCurtainOpen(false);
    }
    setTouchStartY(null);
  };

  const openCurtain = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCurtainOpen(true);
    setAnimationKey(prev => prev + 1);
  };

  const closeCurtain = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCurtainOpen(false);
  };

  useEffect(() => {
    const handleOpenCurtain = () => {
      setIsCurtainOpen(true);
      setAnimationKey(prev => prev + 1);
    };
    const handleCloseCurtain = () => setIsCurtainOpen(false);
    const handleToggleCurtain = () => {
      setIsCurtainOpen(prev => {
        if (!prev) setAnimationKey(k => k + 1);
        return !prev;
      });
    };

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
    setShowProfileDropdown(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsCurtainOpen(false);
    }

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
    setShowProfileDropdown(false);
    setIsCurtainOpen(false);
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

  // 🚫 Hide public website navbar & "ዋና ማውጫ" curtain completely on Admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isCourses = pathname?.startsWith('/courses');
  const isMentorship = pathname === '/mentorship';

  return (
    <>
      {/* 1. ✨ Floating Center-Aligned Trigger Button (Visible when Curtain is Rolled Up) */}
      {!isCurtainOpen && (
        <div 
          className="fixed top-0 flex justify-center pointer-events-auto select-none transition-all duration-300"
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'max-content',
            zIndex: 99999,
          }}
          title="ዋና ማውጫ / Menu (Click to Open Menu)"
        >
          <button
            type="button"
            onClick={openCurtain}
            className="pointer-events-auto bg-[#030509]/95 dark:bg-[#030509]/95 hover:bg-[#080d1a] border-x border-b border-[#f9b03c]/50 hover:border-[#f9b03c] px-6 sm:px-8 py-2 sm:py-2.5 rounded-b-2xl flex items-center gap-2.5 sm:gap-3 group transition-all duration-300 active:scale-95 cursor-pointer shadow-[0_0_25px_rgba(249,176,60,0.35),0_8px_30px_rgba(0,0,0,0.8)] whitespace-nowrap"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Glowing Compass Icon */}
            <div className="w-5 h-5 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/50 flex items-center justify-center text-[#f9b03c] text-[11px] shadow-[0_0_10px_rgba(249,176,60,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-transform">
              <i className="fa-solid fa-compass"></i>
            </div>

            {/* Label Text */}
            <span className="text-xs sm:text-[13px] font-black tracking-wide text-white group-hover:text-[#f9b03c] transition-colors whitespace-nowrap flex items-center gap-1.5 font-heading">
              <i className="fa-solid fa-bars text-[11px] text-[#f9b03c]"></i>
              <span>ዋና ማውጫ / Menu</span>
            </span>

            <i className="fa-solid fa-chevron-down text-[10px] text-[#f9b03c] transition-transform duration-300 group-hover:translate-y-0.5"></i>
          </button>
        </div>
      )}

      {/* 2. Backdrop Overlay when Curtain is Expanded (Clicking outside closes it smoothly) */}
      <div 
        onClick={closeCurtain}
        className={`fixed inset-0 z-[9995] bg-black/65 backdrop-blur-[6px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurtainOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. 🚀 Sliding Curtain Navbar (Smooth Drop-down with Heavy Glassmorphism & High Z-Index) */}
      <nav 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 right-0 w-full max-w-full z-[9999] shadow-[0_20px_60px_rgba(0,0,0,0.85)] select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurtainOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          background: 'rgba(3, 5, 9, 0.9)',
          borderBottom: '1px solid rgba(249, 176, 60, 0.2)',
          willChange: 'transform, opacity',
        }}
      >
        {/* 🔼 SINGLE DISTINCT ULTRA-PREMIUM ROLL-UP TAB AT BOTTOM CENTER */}
        {isCurtainOpen && (
          <div 
            className="absolute -bottom-8 flex justify-center pointer-events-auto z-[10000]"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-32px',
              transform: 'translateX(-50%)',
              width: 'max-content',
            }}
          >
            <button 
              type="button"
              onClick={closeCurtain}
              className="curtain-rollup-handle pointer-events-auto px-5 sm:px-6 py-1.5 sm:py-2 rounded-b-2xl flex items-center gap-2 text-white hover:text-white cursor-pointer group active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_22px_rgba(249,176,60,0.35)] whitespace-nowrap"
              title="ወደ ላይ መልሰህ እጠፍ (Roll Up Menu)"
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#f9b03c] to-amber-300 text-black flex items-center justify-center text-[10px] font-black shadow-[0_0_10px_rgba(249,176,60,0.5)] shrink-0 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-chevron-up text-[9px] font-black"></i>
              </div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white group-hover:text-[#f9b03c] font-heading transition-colors">
                ወደ ላይ እጠፍ (Roll Up)
              </span>
            </button>
          </div>
        )}

        {/* Navbar Inner Content */}
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Bar Row */}
          <div className="flex justify-between items-center h-15 sm:h-20 gap-3 lg:gap-6">
            
            {/* Brand Logo + ✍️ Animated Typewriter Reveal Text ("Tsehay Campus") */}
            <Link 
              href="/" 
              onClick={() => { 
                closeCurtain(); 
                if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
              className="flex-shrink-0 flex items-center cursor-pointer group gap-2.5 mr-2 sm:mr-4 lg:mr-8 brand-entrance"
            >
              <img 
                key={`brand-logo-${animationKey}`}
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-8 sm:h-12 w-auto object-contain rounded-xl shadow-sm border border-black/10 dark:border-white/10 group-hover:border-[#f9b03c]/50 brand-logo-img hover:scale-105 transition-transform duration-300 logo-spring-reveal" 
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff'; }} 
              />
              
              {/* Typewriter animated brand title - visible on Mobile, Tablet & Desktop */}
              <div className="flex items-center notranslate select-none">
                <span className="font-heading font-black text-base sm:text-2xl tracking-tight transition-colors duration-300 flex items-center">
                  <span className="text-[#f9b03c]">
                    {displayedBrand.slice(0, Math.min(displayedBrand.length, 6))}
                  </span>
                  {displayedBrand.length > 6 && (
                    <span className="text-[#3268ba] ml-1">
                      {displayedBrand.slice(6)}
                    </span>
                  )}
                  {!isTypingDone && <span className="brand-typing-cursor" />}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div key={`desktop-nav-links-${animationKey}`} className="hidden lg:flex items-center gap-7 h-full">
              <Link 
                href="/" 
                onClick={() => {
                  if (pathname === '/') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold flex items-center gap-1.5 transition-all duration-300 anim-nav-link-1 ${
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
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 anim-nav-link-2 ${
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
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 anim-nav-link-3 ${
                  isCourses 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('all_courses')}
              </Link>

              <Link 
                href="/mentorship" 
                onClick={() => {
                  if (pathname === '/mentorship') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 anim-nav-link-4 ${
                  isMentorship 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{t('mentorship') || (lang === 'en' ? 'Mentorship' : 'ማማከር')}</span>
              </Link>

              <Link 
                href="/community" 
                onClick={() => {
                  if (pathname === '/community') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`py-2 text-[14px] lg:text-[15px] font-bold transition-all duration-300 anim-nav-link-4 ${
                  pathname === '/community' 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{lang === 'en' ? 'Community' : 'ማህበረሰብ'}</span>
              </Link>
            </div>
            
            {/* Desktop Search Bar */}
            <div key={`desktop-search-${animationKey}`} className="flex-1 max-w-xs md:max-w-sm hidden md:flex items-center mx-2 lg:mx-4 relative z-[60] anim-nav-search">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Marketing, Python)..."} 
              />
            </div>
            
            {/* Desktop Right Action Items */}
            <div key={`desktop-actions-${animationKey}`} className="hidden md:flex items-center gap-2 lg:gap-3 font-heading text-sm">
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#f9b03c]/15 via-amber-400/20 to-[#f9b03c]/15 hover:from-[#f9b03c]/25 hover:to-amber-400/30 border border-[#f9b03c]/50 hover:border-[#f9b03c] shadow-[0_0_15px_rgba(249,176,60,0.25)] hover:shadow-[0_0_25px_rgba(249,176,60,0.45)] text-slate-900 dark:text-white font-bold text-xs cursor-pointer notranslate transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] anim-nav-ai group"
                title="Tsehay AI 24/7 የግል መምህር (Classroom AI Assistant)"
              >
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0 group-hover:rotate-12 transition-transform duration-300">
                  <i className="fa-solid fa-robot text-[10px]"></i>
                </div>
                <span className="text-xs font-black tracking-wide text-slate-900 dark:text-white group-hover:text-[#f9b03c] transition-colors">
                  Tsehay AI
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] shadow-[0_0_8px_#f9b03c] ml-0.5 animate-pulse"></span>
              </button>

              {/* Install App Quick Trigger */}
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                className="btn-install-pwa hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-xs cursor-pointer notranslate anim-nav-app group"
                title="አፕሊኬሽኑን በስልክዎ ወይም በኮምፒተርዎ ላይ ይጫኑ (Install App)"
              >
                <i className="fa-solid fa-mobile-screen-button text-xs opacity-75 icon-anim-device group-hover:scale-110 transition-transform"></i>
                <span>አፕ ጫን</span>
              </button>

              {/* Language Switcher */}
              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 hover:border-[#f9b03c]/50 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer notranslate anim-nav-lang group" 
                translate="no"
                title="ቋንቋ ይቀይሩ / Switch Language"
              >
                <i className="fa-solid fa-globe text-[11px] opacity-75 text-[#f9b03c] icon-anim-globe group-hover:rotate-45 transition-transform"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              {/* Dark/Light Mode Toggle */}
              <button 
                onClick={toggleTheme} 
                className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-yellow-400 flex items-center justify-center text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer anim-nav-theme group"
                aria-label="Toggle dark/light mode"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} icon-anim-sunmoon group-hover:rotate-180 transition-transform duration-500`}></i>
              </button>

              <div className="h-5 w-px bg-gray-200 dark:bg-white/10 mx-0.5 anim-nav-auth"></div>
              
              {!mounted || !user ? (
                <button 
                  onClick={() => openAuthModal(false)} 
                  className="bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black px-5 py-2 rounded-xl text-xs sm:text-sm shadow-[0_0_18px_rgba(249,176,60,0.25)] hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap cursor-pointer anim-nav-auth flex items-center gap-1.5 group"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket text-xs icon-anim-auth group-hover:translate-x-0.5 transition-transform"></i>
                  <span>{t('login')}</span>
                </button>
              ) : (
                <div className="relative anim-nav-auth" ref={profileDropdownRef}>
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)} 
                    className="flex items-center gap-2 focus:outline-none cursor-pointer group"
                  >
                    <img 
                      src={navUserPhoto} 
                      alt={navUserName} 
                      className="w-9 h-9 rounded-full border-2 border-[#f9b03c] object-cover hover:scale-105 transition-transform duration-300 shadow-sm icon-anim-auth" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;
                      }}
                    />
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link 
                        href="/dashboard" 
                        onClick={() => setShowProfileDropdown(false)} 
                        className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-gray-900 dark:text-white hover:bg-[#f9b03c]/10 hover:text-[#f9b03c] transition border-b border-gray-100 dark:border-white/5"
                      >
                        <i className="fa-solid fa-graduation-cap text-[#f9b03c] text-base"></i> 
                        <span>{t('classroom') || 'ወደ መማሪያ ክፍል'}</span>
                      </Link>
                      <Link 
                        href="/community" 
                        onClick={() => setShowProfileDropdown(false)} 
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-[#f9b03c]/10 hover:text-[#f9b03c] transition"
                      >
                        <i className="fa-solid fa-users text-[#f9b03c]"></i> 
                        <span>ማህበረሰብ (Community)</span>
                      </Link>
                      <Link 
                        href="/inbox" 
                        onClick={() => setShowProfileDropdown(false)} 
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-[#f9b03c]/10 hover:text-[#f9b03c] transition"
                      >
                        <i className="fa-solid fa-paper-plane text-blue-400"></i> 
                        <span>የመልዕክት ሳጥን (Inbox)</span>
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

            {/* Mobile Top Header Actions */}
            <div key={`mobile-actions-${animationKey}`} className="lg:hidden flex items-center gap-2 animate-fade-in-scale">
              {/* 1. Language Switcher */}
              <button 
                onClick={toggleLanguage} 
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white font-bold text-xs transition notranslate active:scale-95 cursor-pointer shadow-sm" 
                translate="no"
                title="ቋንቋ ይቀይሩ / Switch Language"
              >
                <i className="fa-solid fa-globe text-[10px] opacity-75 text-[#f9b03c]"></i>
                <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
              </button>

              {/* 2. Theme / Brightness Toggle */}
              <button 
                onClick={toggleTheme} 
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-yellow-400 text-xs transition active:scale-95 cursor-pointer shadow-sm"
                aria-label="Toggle dark/light mode"
                title="ሞድ ይቀይሩ / Toggle theme"
              >
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
              </button>
            </div>
          </div>

          {/* 📱 Mobile Centered Staggered Navigation Panel (Clean Centered Glassmorphism) */}
          <div key={`mobile-nav-${animationKey}`} className="lg:hidden pb-4 pt-1 space-y-2 max-w-md mx-auto w-full flex flex-col items-center text-center">
            
            {/* 1. Staggered Item 1: Pop-Up Smart Search */}
            <div className="w-full animate-pop-up-search">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Marketing, Python)..."} 
              />
            </div>

            {/* 2. Staggered Item 2: Home (Centered) */}
            <div className="w-full animate-nav-stagger-2">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/'); }} 
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group transition-all duration-300 ${isHome ? 'mobile-nav-card-active' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-house text-xs icon-anim-home"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  {t('home') || 'መነሻ ገጽ'}
                </span>
              </button>
            </div>

            {/* 3. Staggered Item 3: All Courses (Centered) */}
            <div className="w-full animate-nav-stagger-3">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/courses'); }} 
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group transition-all duration-300 ${isCourses ? 'mobile-nav-card-active' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-graduation-cap text-xs icon-anim-courses"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  {t('all_courses') || 'ሁሉም ኮርሶች'}
                </span>
              </button>
            </div>

            {/* 3.5. Staggered Item: Mentorship (Centered) */}
            <div className="w-full animate-nav-stagger-3">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/mentorship'); }} 
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group bg-[#f9b03c]/5 border-amber-500/25 transition-all duration-300 ${isMentorship ? 'mobile-nav-card-active' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f9b03c]/20 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-user-tie text-xs"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  {t('mentorship') || (lang === 'en' ? 'Mentorship' : 'ማማከር')}
                </span>
              </button>
            </div>

            {/* 3.8. Staggered Item: Community (Centered) */}
            <div className="w-full animate-nav-stagger-3">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/community'); }} 
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group transition-all duration-300 ${pathname === '/community' ? 'mobile-nav-card-active' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f9b03c]/20 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-users text-xs"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  {lang === 'en' ? 'Community' : 'የተማሪዎች ማህበረሰብ'}
                </span>
              </button>
            </div>

            {/* 4. Staggered Item 4: About Us (Centered) */}
            <div className="w-full animate-nav-stagger-4">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/about'); }} 
                className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group transition-all duration-300 ${isAbout ? 'mobile-nav-card-active' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-circle-info text-xs icon-anim-about"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  {t('about_us') || 'ስለ እኛ'}
                </span>
              </button>
            </div>

            {/* 5. Staggered Item 5: Tsehay AI (Centered) */}
            <div className="w-full animate-nav-stagger-5">
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/#ai-feature'); }} 
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card text-center cursor-pointer group transition-all duration-300"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f9b03c]/20 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-robot text-xs"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white notranslate font-heading">
                  Tsehay AI
                </span>
              </button>
            </div>

            {/* 6. Staggered Item 6: Install App (Centered) */}
            <div className="w-full animate-nav-stagger-6">
              <button 
                type="button" 
                onClick={() => {
                  closeCurtain();
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                }} 
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl mobile-nav-card bg-amber-500/10 border-amber-500/30 text-center cursor-pointer group transition-all duration-300"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#f9b03c]/20 text-[#f9b03c] transition-transform group-hover:scale-110">
                  <i className="fa-solid fa-mobile-screen-button text-xs icon-anim-app"></i>
                </div>
                <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white font-heading">
                  አፕሊኬሽኑን ጫን (Install App)
                </span>
              </button>
            </div>

            {/* 7. Staggered Item 7: Ultra-Sleek Centered Login & Profile Section */}
            <div className="w-full animate-nav-stagger-7 pt-1">
              {!mounted || !user ? (
                <button 
                  type="button" 
                  onClick={() => { closeCurtain(); openAuthModal(false); }} 
                  className="w-full btn-login-secondary font-black py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-95 group"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket text-[#f9b03c] icon-anim-login"></i>
                  <span>{t('login') || 'ግባ (Login)'}</span>
                </button>
              ) : (
                <div className="space-y-2 p-3 rounded-2xl bg-gray-100/70 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
                  <div className="flex items-center justify-center gap-2.5">
                    <img 
                      src={navUserPhoto} 
                      alt={navUserName} 
                      className="w-8 h-8 rounded-full border-2 border-[#f9b03c] object-cover shrink-0 shadow-sm" 
                    />
                    <div className="text-center">
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{navUserName}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{user?.email}</div>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => { closeCurtain(); navigateTo('/dashboard'); }} 
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#f9b03c]/20 border border-[#f9b03c]/50 text-gray-900 dark:text-white font-black rounded-xl hover:bg-[#f9b03c]/30 transition cursor-pointer text-xs"
                  >
                    <i className="fa-solid fa-graduation-cap text-[#f9b03c]"></i>
                    <span>{t('classroom') || 'ወደ መማሪያ ክፍል'}</span>
                    <i className="fa-solid fa-arrow-right text-[10px] text-[#f9b03c]"></i>
                  </button>

                  {isAdmin && (
                    <button 
                      type="button" 
                      onClick={() => { closeCurtain(); navigateTo('/admin'); }} 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 transition cursor-pointer text-xs"
                    >
                      <i className="fa-solid fa-shield-halved text-[#f9b03c]"></i>
                      <span>{t('admin') || 'አድሚን ዳሽቦርድ'}</span>
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={() => { closeCurtain(); handleSignOut(); }} 
                    className="w-full text-red-500 font-bold py-1.5 hover:bg-red-500/10 rounded-xl border border-red-500/30 transition cursor-pointer text-center flex items-center justify-center gap-1.5 text-xs"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> {t('logout') || 'ዘግተህ ውጣ (Logout)'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />
    </>
  );
}
