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
import { getCachedCourses, saveCachedCourses } from "@/lib/courseCache";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurtainOpen, setIsCurtainOpen] = useState(false);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>(() => getCachedCourses());
  const searchRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const navUserName = customName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const navUserPhoto = customPhoto || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;

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
  
  const pathname = usePathname();
  const router = useRouter();

  const navigateTo = (url: string) => {
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);
    setIsCurtainOpen(false); // Roll up curtain when navigating

    if (url.startsWith('/#') || url.startsWith('#')) {
      const hash = url.replace('/#', '').replace('#', '');
      if (pathname === '/') {
        const el = document.getElementById(hash);
        if (el) {
          const offset = 40;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
        }
      } else {
        router.push('/#' + hash);
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            const offset = 40;
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
    // When entering any page (e.g. /courses, /about), roll up curtain into ceiling
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);
    setIsCurtainOpen(false);
  }, [pathname]);

  // Smart scroll: Scrolling down rolls up curtain; scrolling up can also reveal handle
  useEffect(() => {
    let lastScroll = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY || document.documentElement.scrollTop;

          if (currentScroll > lastScroll + 15) {
            // Scrolling down -> roll up curtain to give full screen focus
            setIsCurtainOpen(false);
            setShowProfileDropdown(false);
          }

          lastScroll = Math.max(0, currentScroll);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle touch drag for pulling curtain down/up
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 35) {
      setIsCurtainOpen(true);
    } else if (diff < -35) {
      setIsCurtainOpen(false);
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    setMounted(true);
    // Initial sync of theme
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleOpenAuth = (e: any) => {
        setIsSignupMode(e.detail?.isSignupMode ?? e.detail?.isSignUp ?? false);
        setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);

    const handleOpenCurtain = () => setIsCurtainOpen(true);
    const handleCloseCurtain = () => setIsCurtainOpen(false);
    const handleToggleCurtain = () => setIsCurtainOpen(prev => !prev);

    window.addEventListener('open-nav-curtain', handleOpenCurtain);
    window.addEventListener('close-nav-curtain', handleCloseCurtain);
    window.addEventListener('toggle-nav-curtain', handleToggleCurtain);

    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0] && e.touches[0].clientY < 80) {
        touchStartY.current = e.touches[0].clientY;
      }
    };
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current !== null && e.changedTouches && e.changedTouches[0]) {
        const diff = e.changedTouches[0].clientY - touchStartY.current;
        if (diff > 40) {
          setIsCurtainOpen(true);
        }
        touchStartY.current = null;
      }
    };
    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
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
      window.removeEventListener('open-nav-curtain', handleOpenCurtain);
      window.removeEventListener('close-nav-curtain', handleCloseCurtain);
      window.removeEventListener('toggle-nav-curtain', handleToggleCurtain);
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (val: string) => {
     setSearchQuery(val);
     if (!val.trim()) {
       setSearchResults([]);
       return;
     }
     const filtered = allCourses.filter(c => c.title?.toLowerCase().includes(val.toLowerCase()) || c.category?.toLowerCase().includes(val.toLowerCase()));
     setSearchResults(filtered);
  };

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

  return (
    <>
      {/* 1. Sleek Floating Pull Tab Handle (የሚታይ መጎተቻ) - Visible when Curtain is Rolled Up */}
      <div 
        onClick={() => setIsCurtainOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[9990] cursor-pointer select-none transition-all duration-300 ${
          isCurtainOpen 
            ? 'opacity-0 -translate-y-full pointer-events-none' 
            : 'opacity-100 translate-y-0'
        }`}
        title="ማውጫውን እና መነሻ ገጽ ለመክፈት ይጎትቱ ወይም ይጫኑ (Click or Pull to Open Menu & Return to Home)"
      >
        <div className="bg-[#080d1a]/95 hover:bg-[#0f172a] backdrop-blur-2xl border-x border-b border-[#f9b03c]/70 hover:border-[#f9b03c] px-4 sm:px-6 py-1.5 rounded-b-2xl shadow-[0_4px_25px_rgba(249,176,60,0.4),0_8px_30px_rgba(0,0,0,0.85)] flex items-center gap-2.5 group transition-all duration-300 hover:py-2 hover:px-7 active:scale-95">
          {/* Tsehay Sun / Compass Icon */}
          <div className="w-5 h-5 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/50 flex items-center justify-center text-[#f9b03c] text-[11px] shadow-[0_0_8px_rgba(249,176,60,0.4)]">
            <i className="fa-solid fa-compass animate-spin" style={{ animationDuration: '14s' }}></i>
          </div>

          {/* Grip Bar Notches */}
          <div className="flex flex-col gap-0.5 items-center">
            <span className="w-5 h-0.5 bg-[#f9b03c] rounded-full group-hover:w-7 transition-all duration-300"></span>
            <span className="w-3 h-0.5 bg-[#f9b03c]/60 rounded-full group-hover:w-5 transition-all duration-300"></span>
          </div>

          {/* Label Text & Bouncing Chevron */}
          <span className="text-[11px] sm:text-xs font-black tracking-wide text-white group-hover:text-[#f9b03c] transition-colors whitespace-nowrap flex items-center gap-1.5">
            <i className="fa-solid fa-house text-[10px] text-[#f9b03c]"></i>
            <span>ማውጫ / መነሻ (Menu)</span>
          </span>
          <i className="fa-solid fa-chevron-down text-[10px] text-[#f9b03c] animate-bounce"></i>
        </div>
      </div>

      {/* 2. Backdrop Overlay when Curtain is Expanded (Clicking outside closes it) */}
      {isCurtainOpen && (
        <div 
          onClick={() => setIsCurtainOpen(false)}
          className="fixed inset-0 z-[9995] bg-black/60 backdrop-blur-[3px] transition-opacity duration-300"
        />
      )}

      {/* 3. Curtain Rollup Navbar (እንደ መጋረጃ የሚወርድ እና የሚጠቀለል ተንሸራታች) */}
      <nav 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`glass-nav fixed w-full top-0 z-[9999] border-b border-[#f9b03c]/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isCurtainOpen 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Attached Roll-up Close Handle at Bottom Center */}
        <button 
          type="button"
          onClick={() => setIsCurtainOpen(false)}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#080d1a]/95 hover:bg-[#0f172a] backdrop-blur-2xl border-x border-b border-[#f9b03c]/70 hover:border-[#f9b03c] px-4 py-1 rounded-b-xl shadow-[0_4px_20px_rgba(0,0,0,0.7)] flex items-center gap-1.5 text-[#f9b03c] hover:text-white transition-all cursor-pointer group/close hover:px-5"
          title="ወደ ላይ መልሰህ እጠፍ (Roll Up)"
        >
          <i className="fa-solid fa-chevron-up text-[10px] group-hover/close:-translate-y-0.5 transition-transform"></i>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-200 group-hover/close:text-[#f9b03c]">
            ወደ ላይ እጠፍ (Roll Up)
          </span>
        </button>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20 gap-4 lg:gap-6">
                
                {/* 1. Brand Logo with extra breathing room */}
                <Link href="/" onClick={() => { setIsMobileMenuOpen(false); setIsCurtainOpen(false); if (pathname === '/') window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-shrink-0 flex items-center cursor-pointer group gap-2 mr-4 lg:mr-8">
                    <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="h-14 w-auto object-contain rounded-md shadow-sm group-hover:shadow-md transition-all duration-300 animate-logo-zoom" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff' }} />
                    <span className="font-black text-2xl tracking-tight hidden sm:block notranslate select-none"><span className="text-primary animate-tsehay-float">Tsehay</span> <span className="text-secondary animate-campus-float">Campus</span></span>
                </Link>

                {/* 2. Navigation Links with Hover & Active Underline States */}
                <div className="hidden lg:flex items-center gap-6 h-full">
                    <Link 
                        href="/" 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsCurtainOpen(false);
                            if (pathname === '/') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        className={`py-1.5 transition-all duration-200 text-[14px] lg:text-[15px] border-b-2 font-bold flex items-center gap-1.5 ${
                            pathname === '/' 
                                ? 'text-[#f9b03c] border-[#f9b03c]' 
                                : 'text-gray-700 dark:text-white hover:text-[#f9b03c] border-transparent hover:border-[#f9b03c]'
                        }`}
                    >
                        <i className="fa-solid fa-house text-xs"></i>
                        <span>{t('home') || 'መነሻ'}</span>
                    </Link>
                    <Link 
                        href="/courses" 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsCurtainOpen(false);
                            if (pathname === '/courses') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        className={`py-1.5 transition-all duration-200 text-[14px] lg:text-[15px] border-b-2 font-bold ${
                            pathname?.startsWith('/courses')
                                ? 'text-[#f9b03c] border-[#f9b03c]' 
                                : 'text-gray-700 dark:text-white hover:text-[#f9b03c] border-transparent hover:border-[#f9b03c]'
                        }`}
                    >
                        {t('all_courses')}
                    </Link>
                    <Link 
                        href="/about" 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsCurtainOpen(false);
                            if (pathname === '/about') {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        className={`py-1.5 transition-all duration-200 text-[14px] lg:text-[15px] border-b-2 font-bold ${
                            pathname === '/about' 
                                ? 'text-[#f9b03c] border-[#f9b03c]' 
                                : 'text-gray-700 dark:text-white hover:text-[#f9b03c] border-transparent hover:border-[#f9b03c]'
                        }`}
                    >
                        {t('about_us')}
                    </Link>
                </div>
                
                <div className="flex-1 max-w-md hidden md:flex items-center mx-2 lg:mx-4 relative z-[60]">
                    <SmartSearchInput 
                        courses={allCourses} 
                        placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Social Media, Facebook, ዌብሳይት)..."} 
                    />
                </div>
                
                <div className="hidden md:flex items-center gap-2 lg:gap-3 font-heading text-sm">
                    {/* 3. Interactive Tsehay AI Pill Button */}
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
                        className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#f9b03c] bg-[#f9b03c]/10 text-dark dark:text-white font-semibold hover:bg-[#f9b03c] hover:text-black dark:hover:text-black hover:shadow-[0_0_12px_rgba(249,176,60,0.35)] transition-all duration-200 cursor-pointer notranslate"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles text-[#f9b03c] group-hover:text-black transition-colors text-sm"></i> 
                        <span className="text-sm font-bold">Tsehay AI</span>
                    </button>

                    {/* 4. Language Switcher (Globe + EN/አማ) */}
                    <button 
                        onClick={toggleLanguage} 
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 dark:border-white/20 hover:border-[#f9b03c] dark:hover:border-[#f9b03c] hover:text-[#f9b03c] dark:hover:text-[#f9b03c] bg-transparent text-gray-700 dark:text-white text-sm font-bold transition-all duration-200 cursor-pointer notranslate shadow-xs" 
                        translate="no"
                    >
                        <i className="fa-solid fa-globe text-xs opacity-80"></i>
                        <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
                    </button>

                    <button onClick={toggleTheme} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-darkCard transition shadow-sm text-gray-600 dark:text-yellow-400">
                        <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>

                    <div className="h-5 w-px bg-gray-300 dark:bg-gray-800 mx-0.5 lg:mx-1"></div>
                    
                    {!mounted || !user ? (
                      <button onClick={() => openAuthModal(false)} className="bg-primary text-dark px-6 py-2.5 rounded-lg font-black hover:bg-yellow-400 transition shadow-lg hover:shadow-xl btn-glow whitespace-nowrap text-[15px] lg:text-base">{t('login')}</button>
                    ) : (
                      <div className="relative">
                        {/* 5. User Avatar with Yellow Border */}
                        <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center gap-2 focus:outline-none">
                            <img 
                                src={navUserPhoto} 
                                alt={navUserName} 
                                className="w-9 h-9 rounded-full border-2 border-[#f9b03c] object-cover cursor-pointer hover:scale-105 transition-transform" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;
                                }}
                            />
                        </button>
                        {showProfileDropdown && (
                          <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-darkCard rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                              <Link href="/dashboard" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-dark dark:text-white hover:bg-blue-50 dark:hover:bg-dark hover:text-secondary dark:hover:text-primary transition border-b border-gray-100 dark:border-gray-800">
                                  <i className="fa-solid fa-graduation-cap text-primary text-base"></i> {t('classroom') || 'ወደ መማሪያ ክፍል'}
                              </Link>
                              {isAdmin && (
                                <Link href="/admin" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark hover:text-secondary dark:hover:text-primary transition">
                                    <i className="fa-solid fa-shield-halved text-primary"></i> {t('admin') || 'አድሚን'}
                                </Link>
                              )}
                              <hr className="my-1 border-gray-100 dark:border-gray-800" />
                              <button onClick={() => { setShowProfileDropdown(false); handleSignOut(); }} className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/10 font-bold transition">
                                  <i className="fa-solid fa-arrow-right-from-bracket"></i> {t('logout') || 'ዘግተህ ውጣ (Logout)'}
                              </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="md:hidden flex items-center gap-2 sm:gap-3">
                    <button 
                        onClick={toggleTheme} 
                        className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-yellow-400 text-sm transition"
                        aria-label="Toggle dark/light mode"
                    >
                        <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>

                    <button 
                        onClick={toggleLanguage} 
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-300 dark:border-white/20 hover:border-[#f9b03c] dark:hover:border-[#f9b03c] bg-transparent text-gray-800 dark:text-white font-bold text-xs transition shadow-xs notranslate" 
                        translate="no"
                    >
                        <i className="fa-solid fa-globe text-[11px] opacity-80"></i>
                        <span>{lang === 'am' ? 'EN' : 'አማ'}</span>
                    </button>

                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        aria-label="Toggle navigation menu" 
                        className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white flex items-center justify-center text-xl focus:outline-none transition active:scale-95"
                    >
                        <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark text-primary' : 'fa-bars'}`}></i>
                    </button>
                </div>
            </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-2xl border-t border-b border-gray-200 dark:border-gray-800/80 shadow-2xl overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[550px] opacity-100 py-3' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="px-4 space-y-2 flex flex-col overflow-y-auto max-h-[75vh]">
                <div className="pb-1">
                    <SmartSearchInput 
                        courses={allCourses} 
                        placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ..."} 
                    />
                </div>

                <button 
                    type="button" 
                    onClick={() => navigateTo('/')} 
                    className="w-full flex items-center justify-between px-4 py-3 text-dark dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800/80 transition cursor-pointer text-left"
                >
                    <span className="flex items-center gap-3">
                        <i className="fa-solid fa-house text-primary"></i>
                        <span>{t('home') || 'መነሻ ገጽ'}</span>
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
                </button>

                <button 
                    type="button" 
                    onClick={() => navigateTo('/courses')} 
                    className="w-full flex items-center justify-between px-4 py-3 text-dark dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800/80 transition cursor-pointer text-left"
                >
                    <span className="flex items-center gap-3">
                        <i className="fa-solid fa-book-open text-primary"></i>
                        <span>{t('all_courses')}</span>
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
                </button>

                <button 
                    type="button" 
                    onClick={() => navigateTo('/about')} 
                    className="w-full flex items-center justify-between px-4 py-3 text-dark dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800/80 transition cursor-pointer text-left"
                >
                    <span className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-info text-secondary dark:text-primary"></i>
                        <span>{t('about_us')}</span>
                    </span>
                    <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
                </button>

                <button 
                    type="button" 
                    onClick={() => navigateTo('/#ai-feature')} 
                    className="w-full flex items-center justify-between px-4 py-3 text-dark dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-100 dark:border-gray-800/80 transition cursor-pointer text-left"
                >
                    <span className="flex items-center gap-3">
                        <i className="fa-solid fa-wand-magic-sparkles text-primary"></i>
                        <span className="notranslate">Tsehay AI</span>
                    </span>
                    <span className="text-[10px] bg-primary/20 text-primary font-black px-2 py-0.5 rounded-full">AI</span>
                </button>

                <hr className="my-1 border-gray-200 dark:border-gray-800" />

                {!mounted || !user ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                        type="button" 
                        onClick={() => { setIsMobileMenuOpen(false); openAuthModal(false); }} 
                        className="w-full text-secondary dark:text-white font-bold py-3 rounded-xl border-2 border-secondary/30 dark:border-white/20 hover:bg-secondary/10 dark:hover:bg-white/5 transition cursor-pointer text-center text-sm"
                    >
                        {t('login')}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setIsMobileMenuOpen(false); openAuthModal(true); }} 
                        className="w-full bg-primary text-dark font-black py-3 rounded-xl shadow-md hover:bg-yellow-400 transition cursor-pointer text-center text-sm btn-glow"
                    >
                        {t('register')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <button 
                        type="button" 
                        onClick={() => navigateTo('/dashboard')} 
                        className="w-full flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/30 text-primary font-black rounded-xl hover:bg-primary/20 transition cursor-pointer"
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
                          className="w-full flex items-center justify-between px-4 py-2.5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-gray-800 transition cursor-pointer text-sm"
                      >
                          <span className="flex items-center gap-3">
                              <i className="fa-solid fa-shield-halved text-primary"></i>
                              <span>{t('admin') || 'አድሚን'}</span>
                          </span>
                          <i className="fa-solid fa-chevron-right text-xs text-gray-400"></i>
                      </button>
                    )}
                    <button 
                        type="button" 
                        onClick={() => { setIsMobileMenuOpen(false); handleSignOut(); }} 
                        className="w-full text-danger font-bold py-2.5 hover:bg-red-500/10 rounded-xl border border-danger/30 transition cursor-pointer text-center flex items-center justify-center gap-2 text-sm"
                    >
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> {t('logout') || 'ዘግተህ ውጣ (Logout)'}
                    </button>
                  </div>
                )}
            </div>
        </div>
      </nav>

      {/* Udacity-Style Mobile Bottom App Navigation Bar */}
      {!pathname?.startsWith('/dashboard') && (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 px-2 py-2 safe-area-bottom shadow-[0_-4px_25px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.7)] transition-all duration-300 ease-in-out transform translate-y-0 opacity-100`}>
          <div className="flex items-center justify-around max-w-md mx-auto">
            <Link 
              href="/" 
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${pathname === '/' ? 'text-primary font-black' : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white font-medium'}`}
            >
              <i className={`fa-solid fa-house text-lg ${pathname === '/' ? 'scale-110 text-primary' : ''} transition-transform`}></i>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">መነሻ</span>
            </Link>

            <Link 
              href="/courses" 
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${pathname?.startsWith('/courses') ? 'text-primary font-black' : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white font-medium'}`}
            >
              <i className={`fa-solid fa-book-open text-lg ${pathname?.startsWith('/courses') ? 'scale-110 text-primary' : ''} transition-transform`}></i>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">ኮርሶች</span>
            </Link>

            <Link 
              href="/dashboard" 
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${pathname === '/dashboard' ? 'text-primary font-black' : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white font-medium'}`}
            >
              <div className="relative">
                <i className={`fa-solid fa-graduation-cap text-lg ${pathname === '/dashboard' ? 'scale-110 text-primary' : ''} transition-transform`}></i>
                {mounted && user && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">ክፍሌ</span>
            </Link>

            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai'))}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-primary font-extrabold hover:text-yellow-400 transition cursor-pointer"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-lg animate-pulse"></i>
              <span className="text-[10px] mt-0.5 tracking-tight notranslate font-black">AI Tutor</span>
            </button>

            {!mounted || !user ? (
              <button 
                onClick={() => openAuthModal(false)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-primary font-medium transition cursor-pointer"
              >
                <i className="fa-solid fa-user text-lg"></i>
                <span className="text-[10px] mt-0.5 tracking-tight font-bold">መለያ</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowProfileDropdown(prev => !prev)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-gray-700 dark:text-gray-300 hover:text-primary transition cursor-pointer"
              >
                <img 
                  src={navUserPhoto} 
                  alt={navUserName} 
                  className="w-5 h-5 rounded-full object-cover border border-primary" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;
                  }}
                />
                <span className="text-[10px] mt-0.5 font-bold tracking-tight">እኔ</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />
    </>
  );
}
