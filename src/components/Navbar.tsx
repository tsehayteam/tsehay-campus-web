'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, clearUserSessionData } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";
import SmartSearchInput from "./SmartSearchInput";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { getCachedCourses, subscribeToCourses } from "@/lib/courseCache";
import Tilt3DLoginButton from "@/components/3d/Tilt3DLoginButton";
import LanguageToggleSwitch from "@/components/LanguageToggleSwitch";
import { subscribeUserConversations, Conversation } from "@/lib/communityService";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isCurtainOpen, setIsCurtainOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [showAppDownloadModal, setShowAppDownloadModal] = useState(false);
  const [theme, setTheme] = useState('dark');
  const { lang, toggleLanguage, t } = useLanguage();
  const [animationKey, setAnimationKey] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Brand Name animated reveal
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
    }, 60);

    return () => clearInterval(typingTimer);
  }, [isCurtainOpen, animationKey]);

  // Cached User Profile
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
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // 🔔 Real-Time Messages & Notification State
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const navUserName = customName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const navUserPhoto = customPhoto || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(navUserName)}&background=f9b03c&color=111827&bold=true`;

  const pathname = usePathname();
  const router = useRouter();

  // Listen for profile updates
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

  // Swipe Up to roll up menu
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY;
    if (diff < -35 && isCurtainOpen) {
      setIsCurtainOpen(false);
    }
    setTouchStartY(null);
  };

  const openCurtain = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setIsCurtainOpen(true);
    setAnimationKey(prev => prev + 1);
  };

  const closeCurtain = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setIsCurtainOpen(false);
    setIsSearchActive(false);
  };

  // Auto-collapse smoothly on scroll down
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 120 && currentScrollY > lastScrollY + 25 && isCurtainOpen) {
        setIsCurtainOpen(false);
        setIsSearchActive(false);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCurtainOpen]);

  // Global event triggers
  useEffect(() => {
    const handleOpenCurtain = () => {
      setIsCurtainOpen(true);
      setAnimationKey(prev => prev + 1);
    };
    const handleCloseCurtain = () => {
      setIsCurtainOpen(false);
      setIsSearchActive(false);
    };
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
    setIsCurtainOpen(false);
    setIsSearchActive(false);

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
    setShowNotificationDropdown(false);
    setIsCurtainOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleOpenAuth = (e: any) => {
      // 🌟 Smart Pop-up: ተጠቃሚው ካልተመዘገበ/ካልገባ ብቻ የመመዝገቢያ ፖፕ-አፕ (Pop-up) እንዲመጣ ይደረግ
      if (user) return;
      setIsSignupMode(e.detail?.isSignupMode ?? e.detail?.isSignUp ?? false);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);

    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const unsubscribeCourses = subscribeToCourses((coursesList) => {
      if (Array.isArray(coursesList) && coursesList.length > 0) {
        setAllCourses(coursesList);
      }
    });

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      document.removeEventListener('mousedown', handleClickOutside);
      unsubscribeCourses();
    };
  }, []);

  // 🔔 Real-Time Direct Message & Notification Subscription
  useEffect(() => {
    if (!user?.uid) {
      setUnreadMessagesCount(0);
      setRecentConversations([]);
      return;
    }

    const unsubscribe = subscribeUserConversations(user.uid, (convList) => {
      setRecentConversations(convList);
      const totalUnread = convList.reduce((acc, c) => {
        const count = c.unreadCount?.[user.uid] || 0;
        return acc + count;
      }, 0);
      setUnreadMessagesCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    window.dispatchEvent(new CustomEvent('tsehay_theme_changed', { detail: { theme: newTheme } }));
  };

  const openAuthModal = (signup: boolean) => {
    setIsSignupMode(signup);
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      setShowProfileDropdown(false);
      clearUserSessionData(user?.uid);
      await signOut(auth);
    } catch (e) {
      console.warn("Signout warning:", e);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  };

  // Hide on admin routes and maintenance page
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/maintenance')) {
    return null;
  }

  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isCourses = pathname?.startsWith('/courses');
  const isMentorship = pathname === '/mentorship';
  const isCommunity = pathname === '/community';

  return (
    <>
      {/* ===================== 1. FLOATING CAPSULE (ONLY WHEN CLOSED) ===================== */}
      {!isCurtainOpen && (
        <div 
          className="fixed top-3 flex items-center gap-2 justify-center pointer-events-auto select-none transition-all duration-300 left-1/2 -translate-x-1/2 z-50 animate-in fade-in"
          title="ዋና ማውጫ / Menu"
        >
          {/* Subtle #f9b03c ambient breathing glow */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#f9b03c]/40 via-[#3268ba]/30 to-[#f9b03c]/40 blur-md pointer-events-none animate-pulse" />

          <button
            type="button"
            onClick={openCurtain}
            className="relative pointer-events-auto px-5 sm:px-6 py-2 rounded-full flex items-center gap-2 group transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap backdrop-blur-2xl bg-black/90 border border-white/20 hover:border-[#f9b03c] text-white hover:text-[#f9b03c] shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(249,176,60,0.25)]"
          >
            <div className="w-5 h-5 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/40 flex items-center justify-center text-[#f9b03c] text-[10px] group-hover:translate-y-0.5 transition-transform">
              <i className="fa-solid fa-chevron-down"></i>
            </div>
            <span className="text-xs sm:text-[13px] font-black tracking-wide whitespace-nowrap flex items-center gap-1.5 font-heading text-white group-hover:text-[#f9b03c] transition-colors">
              🧭 ማውጫውን ዘርጋ (Expand Menu) ▾
              {unreadMessagesCount > 0 && (
                <span className="relative flex h-2 w-2 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* ===================== 2. BACKDROP OVERLAY ===================== */}
      <div 
        onClick={closeCurtain}
        className={`fixed inset-0 z-[9995] bg-black/80 backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurtainOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ===================== 3. 3D GLASSMORPHIC EXPANDED NAVBAR ===================== */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 right-0 w-full max-w-full z-[9999] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurtainOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        style={{
          willChange: 'transform, opacity',
        }}
      >
        <nav className="w-full relative shadow-[0_25px_70px_rgba(0,0,0,0.95)] select-none overflow-visible backdrop-blur-2xl bg-black/95 border-b border-white/10">
        {/* Navbar Inner Content */}
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Bar Row (Left, Center, Right) */}
          <div className="flex justify-between items-center h-16 sm:h-20 gap-3 lg:gap-6">
            
            {/* 1. LEFT: Brand Logo & Title */}
            <Link 
              href="/" 
              onClick={() => { 
                closeCurtain(); 
                if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
              className="flex-shrink-0 flex items-center cursor-pointer group gap-3 mr-2 sm:mr-4"
            >
              <img 
                key={`brand-logo-${animationKey}`}
                src="/tc-logo.jpg" 
                alt="Tsehay Campus Logo" 
                className="h-9 sm:h-11 w-auto object-contain rounded-2xl shadow-sm border border-white/10 group-hover:border-[#f9b03c]/60 group-hover:scale-105 transition-all duration-300" 
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff'; }} 
              />
              
              {/* Typewriter animated brand title */}
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

            {/* 2. CENTER: Clean Navigation Links (መነሻ, ኮርሶች, ማማከር, ማህበረሰብ, ስለ እኛ) */}
            <div key={`desktop-nav-links-${animationKey}`} className="hidden xl:flex items-center gap-7 h-full">
              
              {/* መነሻ */}
              <Link 
                href="/" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  isHome 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-slate-300 hover:text-white'
                }`}
              >
                <span>{t('home') || 'መነሻ'}</span>
              </Link>

              {/* ኮርሶች */}
              <Link 
                href="/courses" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/courses');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  isCourses 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-slate-300 hover:text-white'
                }`}
              >
                <span>{t('courses') || 'ኮርሶች'}</span>
              </Link>

              {/* ማማከር */}
              <Link 
                href="/mentorship" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/mentorship');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  isMentorship 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-slate-300 hover:text-white'
                }`}
              >
                <span>{lang === 'en' ? 'Mentorship' : 'ማማከር'}</span>
              </Link>

              {/* ማህበረሰብ */}
              <Link 
                href="/community" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/community');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  isCommunity 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-slate-300 hover:text-white'
                }`}
              >
                <span>{lang === 'en' ? 'Community' : 'ማህበረሰብ'}</span>
              </Link>

              {/* ስለ እኛ */}
              <Link 
                href="/about" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/about');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  isAbout 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-slate-300 hover:text-white'
                }`}
              >
                <span>{t('about_us') || 'ስለ እኛ'}</span>
              </Link>

              {/* ሰርተፊኬት ማረጋገጫ */}
              <Link 
                href="/verify-certificate" 
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/verify-certificate');
                }} 
                className={`py-2 text-[14px] lg:text-[15px] font-bold tracking-wide transition-all duration-300 ${
                  pathname === '/verify-certificate' 
                    ? 'terafab-nav-link-active' 
                    : 'terafab-nav-link text-cyan-300/90 hover:text-cyan-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-award text-xs text-cyan-400"></i>
                  <span>ሰርተፊኬት</span>
                </span>
              </Link>

            </div>

            {/* 3. RIGHT: Search Input + Tsehay AI + Install + Lang/Theme + Integrated Close Toggle */}
            <div key={`desktop-actions-${animationKey}`} className="flex items-center gap-2 lg:gap-3 font-heading text-sm">
              
              {/* Distinct Search Bar with Cobalt Blue Glass Border */}
              <div className="hidden sm:block w-44 lg:w-56">
                <SmartSearchInput 
                  courses={allCourses} 
                  compact={true}
                  placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ..."} 
                  onSearchActive={setIsSearchActive}
                />
              </div>


              {/* 3D Magnetic Hover Tilt "ይግቡ / Login" Button (Desktop Only: Mobile has single login inside menu) */}
              {!mounted || !user ? (
                <div className="hidden xl:block">
                  <Tilt3DLoginButton
                    onClick={() => {
                      openAuthModal(false);
                      closeCurtain();
                    }}
                    label={lang === 'en' ? 'Login' : 'ይግቡ (Login)'}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* 🔔 Real-Time Notification Bell with Live Unread Badge */}
                  <div className="relative" ref={notificationDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowNotificationDropdown(prev => !prev)}
                      className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#f9b03c]/60 flex items-center justify-center text-slate-300 hover:text-[#f9b03c] transition-all cursor-pointer group shadow-xs"
                      title="ማሳወቂያዎች እና መልዕክቶች (Notifications & Messages)"
                    >
                      <i className={`fa-solid fa-bell text-xs sm:text-sm transition-transform group-hover:rotate-12 ${unreadMessagesCount > 0 ? 'text-[#f9b03c]' : ''}`}></i>
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md animate-pulse">
                          {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Frosted Dropdown Popover */}
                    {showNotificationDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3 z-[9999] animate-in fade-in zoom-in-95 duration-200 space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div className="flex items-center gap-1.5">
                            <i className="fa-solid fa-bell text-[#f9b03c] text-xs"></i>
                            <span className="font-heading font-black text-xs text-white uppercase tracking-wider">ማሳወቂያዎች</span>
                          </div>
                          {unreadMessagesCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30">
                              {unreadMessagesCount} አዲስ መልዕክት
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">ሁሉም ታይቷል</span>
                          )}
                        </div>

                        {recentConversations.length === 0 ? (
                          <div className="py-6 text-center">
                            <div className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center text-xs mx-auto mb-2">
                              <i className="fa-regular fa-envelope-open"></i>
                            </div>
                            <p className="text-xs text-slate-400">ምንም የውይይት መልዕክት የለም</p>
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                            {recentConversations.slice(0, 4).map((conv) => {
                              const otherUid = conv.participants.find(p => p !== user?.uid) || '';
                              const otherUser = conv.participantDetails?.[otherUid] || { name: 'ተማሪ', photo: '' };
                              const isUnread = Boolean(conv.unreadCount?.[user?.uid || ''] && conv.unreadCount[user!.uid] > 0);

                              return (
                                <button
                                  key={conv.id}
                                  type="button"
                                  onClick={() => {
                                    setShowNotificationDropdown(false);
                                    closeCurtain();
                                    router.push(`/inbox?user=${encodeURIComponent(otherUid)}`);
                                  }}
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                                    isUnread ? 'bg-[#f9b03c]/15 border border-[#f9b03c]/40' : 'hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <img
                                    src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=f9b03c&color=111827&bold=true`}
                                    alt={otherUser.name}
                                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="font-heading font-bold text-xs text-white truncate">{otherUser.name}</span>
                                      {isUnread && <span className="w-2 h-2 rounded-full bg-[#f9b03c] shrink-0"></span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate">{conv.lastMessage || 'አዲስ መልዕክት'}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotificationDropdown(false);
                              closeCurtain();
                              router.push('/inbox');
                            }}
                            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#f9b03c] hover:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/10"
                          >
                            <i className="fa-solid fa-paper-plane text-xs"></i>
                            <span>ወደ መልዕክት ሳጥን (Open Inbox)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowProfileDropdown(prev => !prev)}
                      className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-[#f9b03c]/40 hover:border-[#f9b03c] transition-all cursor-pointer group shadow-sm"
                      title="የተጠቃሚ መረጃ (User Profile)"
                    >
                      <img
                        src={navUserPhoto}
                        alt={navUserName}
                        className="w-7 h-7 rounded-full border border-[#f9b03c] object-cover shrink-0"
                      />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-[#f9b03c] transition-colors truncate max-w-[90px]">
                        {navUserName.split(' ')[0]}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180 text-[#f9b03c]' : ''}`}></i>
                    </button>

                    {/* Sleek Animated Frosted-Glass Profile Dropdown */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 min-w-[220px] max-w-[280px] rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-3 z-[9999] animate-in fade-in zoom-in-95 duration-200 space-y-2">
                        {/* User Info Header */}
                        <div className="flex items-center gap-2.5 px-2 py-1.5 pb-2.5 border-b border-white/10">
                          <img
                            src={navUserPhoto}
                            alt={navUserName}
                            className="w-9 h-9 rounded-full border border-[#f9b03c] object-cover shrink-0"
                          />
                          <div className="overflow-hidden text-left">
                            <div className="text-xs font-black text-white truncate font-heading">{navUserName}</div>
                            <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
                          </div>
                        </div>

                        {/* Option 1: 🎓 Go to Classroom */}
                        <button
                          type="button"
                          onClick={() => navigateTo('/dashboard')}
                          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md group"
                        >
                          <div className="w-6 h-6 rounded-lg bg-black/15 flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform shrink-0">
                            <i className="fa-solid fa-graduation-cap text-base"></i>
                          </div>
                          <span className="font-heading tracking-wide text-xs">ወደ መማሪያ ክፍል</span>
                        </button>

                        {/* Option 2: 💬 Go to Inbox */}
                        <button
                          type="button"
                          onClick={() => navigateTo('/inbox')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-bold text-xs transition-all cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <i className="fa-solid fa-paper-plane text-xs text-blue-400"></i>
                            <span>የመልዕክት ሳጥን (Inbox)</span>
                          </span>
                          {unreadMessagesCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                              {unreadMessagesCount}
                            </span>
                          )}
                        </button>

                        {/* Option 3: 🚪 Log Out */}
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-400 border border-transparent hover:border-red-500/30 font-bold text-xs transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-right-from-bracket text-xs text-red-400"></i>
                          <span>ውጣ (Log Out)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Animated Phone + Download App Action Button (With Confirmation Modal) */}
              <button 
                type="button"
                onClick={() => setShowAppDownloadModal(true)}
                className="btn-install-pwa hidden md:flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full font-heading font-black text-xs cursor-pointer notranslate border border-[#f9b03c]/45 bg-[#f9b03c]/10 hover:bg-[#f9b03c]/20 text-white hover:text-[#f9b03c] shadow-[0_0_15px_rgba(249,176,60,0.25)] hover:shadow-[0_0_25px_rgba(249,176,60,0.5)] group transition-all duration-300 animate-pulse hover:animate-none active:scale-95"
                title="አፕሊኬሽኑን በስልክዎ ወይም በኮምፒተርዎ ላይ ይጫኑ (Install App)"
              >
                <span className="relative flex items-center justify-center text-[#f9b03c]">
                  <i className="fa-solid fa-mobile-screen text-xs group-hover:scale-110 transition-transform"></i>
                  <i className="fa-solid fa-arrow-down text-[9px] -ml-1 text-white bg-slate-950 rounded-full animate-bounce"></i>
                </span>
                <span className="hidden lg:inline tracking-wide font-black">አፕ አውርድ</span>
              </button>

              {/* Sliding Language Switcher Toggle */}
              <LanguageToggleSwitch compact />

              {/* Dark/Light Theme Switcher with Clear High-Contrast Icons */}
              <button 
                type="button"
                onClick={toggleTheme} 
                className={`h-8 px-2.5 rounded-full border transition-all duration-300 flex items-center gap-1.5 text-xs cursor-pointer active:scale-95 ${
                  theme === 'dark'
                    ? 'border-white/15 bg-white/5 hover:bg-white/10 text-amber-400 hover:border-amber-400/40 shadow-sm'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                }`}
                aria-label="Toggle dark/light mode"
                title={theme === 'dark' ? "ገጽታ፡ ጨለማ (Dark) • ወደ ብርሃን ለመቀየር ይጫኑ" : "ገጽታ፡ ብርሃን (Light) • ወደ ጨለማ ለመቀየር ይጫኑ"}
              >
                {theme === 'dark' ? (
                  <>
                    <i className="fa-solid fa-moon text-amber-400 text-xs transition-transform duration-300"></i>
                    <span className="text-[10px] font-bold text-slate-300 hidden sm:inline">Dark</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-sun text-amber-500 text-xs transition-transform duration-300"></i>
                    <span className="text-[10px] font-black text-amber-600 hidden sm:inline">Light</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ===================== 📱 MOBILE MENU PANEL ===================== */}
          <div key={`mobile-nav-${animationKey}`} className="xl:hidden pb-6 pt-2 space-y-3.5 max-w-lg mx-auto w-full flex flex-col items-center text-center">
            
            {/* Drag Bar Indicator */}
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-1"></div>

            {/* Smart Search */}
            <div className="w-full">
              <SmartSearchInput 
                courses={allCourses} 
                compact={true}
                placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Marketing, Python)..."} 
                onSearchActive={setIsSearchActive}
              />
            </div>

            {/* Clean 2-Column Navigation Grid (Text Focused) */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              
              {/* Home */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 ${isHome ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-white font-heading">
                  {t('home') || 'መነሻ'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Home</span>
              </button>

              {/* Courses */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/courses'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 ${isCourses ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-white font-heading">
                  {t('courses') || 'ኮርሶች'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Courses</span>
              </button>

              {/* Mentorship */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/mentorship'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 ${isMentorship ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-white font-heading">
                  {lang === 'en' ? 'Mentorship' : 'ማማከር'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">1-on-1</span>
              </button>

              {/* Community */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/community'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 ${isCommunity ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-white font-heading">
                  {lang === 'en' ? 'Community' : 'ማህበረሰብ'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Discussions</span>
              </button>

              {/* About Us */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/about'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 col-span-2 ${isAbout ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-white font-heading">
                  {t('about_us') || 'ስለ እኛ'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">About Us</span>
              </button>

              {/* Certificate Verification */}
              <button 
                type="button" 
                onClick={() => { closeCurtain(); navigateTo('/verify-certificate'); }} 
                className={`p-3.5 rounded-2xl mobile-nav-card flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-200 col-span-2 bg-cyan-500/10 border-cyan-500/30 ${pathname === '/verify-certificate' ? 'mobile-nav-card-active' : ''}`}
              >
                <span className="text-xs font-black text-cyan-300 font-heading flex items-center gap-1.5">
                  <i className="fa-solid fa-award text-cyan-400"></i>
                  <span>ሰርተፊኬት ማረጋገጫ (Verify Certificate)</span>
                </span>
                <span className="text-[10px] text-cyan-200/70 mt-0.5">ይፋዊ ማረጋገጫ ፖርታል • Verify Credential</span>
              </button>
            </div>

            {/* Install App Trigger Pill with Animated Phone + Download (With Confirmation Modal) */}
            <button 
              type="button" 
              onClick={() => {
                closeCurtain();
                setShowAppDownloadModal(true);
              }} 
              className="w-full py-3 px-4 rounded-2xl mobile-nav-card bg-gradient-to-r from-[#f9b03c]/15 via-amber-400/10 to-[#3268ba]/15 border border-[#f9b03c]/40 hover:border-[#f9b03c] flex items-center justify-center gap-2.5 text-center cursor-pointer group transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(249,176,60,0.15)]"
            >
              <span className="relative flex items-center text-[#f9b03c]">
                <i className="fa-solid fa-mobile-screen text-sm group-hover:scale-110 transition-transform"></i>
                <i className="fa-solid fa-arrow-down text-[9px] -ml-1 text-white bg-slate-950 rounded-full animate-bounce"></i>
              </span>
              <span className="text-xs font-black text-white font-heading tracking-wide">
                አፕሊኬሽኑን በስልክዎ ይጫኑ (Install App)
              </span>
            </button>

            {/* User Profile & Auth Trigger - Persistent Edge Placement */}
            <div className="w-full pt-1 px-1">
              {!mounted || !user ? (
                <div className="w-full flex justify-center">
                  <Tilt3DLoginButton
                    className="w-full justify-center py-3.5 shadow-[0_8px_25px_rgba(249,176,60,0.25)]"
                    onClick={() => {
                      openAuthModal(false);
                      closeCurtain();
                    }}
                    label={t('login') || (lang === 'en' ? 'Login / Sign Up' : 'ግባ ወይም ተመዝገብ (Login / Sign Up)')}
                  />
                </div>
              ) : (
                <div className="w-full space-y-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2.5 text-left">
                      <img 
                        src={navUserPhoto} 
                        alt={navUserName} 
                        className="w-9 h-9 rounded-full border-2 border-[#f9b03c] object-cover shrink-0 shadow-sm" 
                      />
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[150px]">{navUserName}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{user?.email}</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { closeCurtain(); handleSignOut(); }} 
                      className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
                      <span>ውጣ</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button" 
                      onClick={() => { closeCurtain(); navigateTo('/dashboard'); }} 
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#f9b03c] text-slate-950 font-black rounded-xl hover:bg-yellow-400 transition cursor-pointer text-xs shadow-sm"
                    >
                      <i className="fa-solid fa-graduation-cap"></i>
                      <span>መማሪያ ክፍል</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { closeCurtain(); navigateTo('/inbox'); }} 
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600/30 text-blue-300 font-black rounded-xl hover:bg-blue-600/40 border border-blue-500/40 transition cursor-pointer text-xs relative"
                    >
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>መልዕክት</span>
                      {unreadMessagesCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {isAdmin && (
                    <button 
                      type="button" 
                      onClick={() => { closeCurtain(); navigateTo('/admin'); }} 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[#f9b03c] font-bold rounded-xl bg-[#f9b03c]/10 border border-[#f9b03c]/30 hover:bg-[#f9b03c]/20 transition cursor-pointer text-xs"
                    >
                      <i className="fa-solid fa-shield-halved"></i>
                      <span>{t('admin') || 'አድሚን ዳሽቦርድ'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Menu Collapse / Fold Toggle Button Right Under Login */}
            <div className="w-full flex justify-center pt-2 pb-1 px-1">
              <button
                type="button"
                onClick={closeCurtain}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-black/90 via-[#0d1527] to-black/90 hover:bg-[#13203f] text-slate-100 hover:text-white border border-[#f9b03c]/50 hover:border-[#f9b03c] flex items-center justify-center gap-2.5 text-xs font-heading font-black tracking-wide shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(249,176,60,0.25)] hover:shadow-[0_0_30px_rgba(249,176,60,0.45)] transition-all duration-300 cursor-pointer active:scale-95 group"
                title="ማውጫውን ወደ ላይ ሰብስብ (Collapse Menu)"
              >
                <div className="w-6 h-6 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/40 flex items-center justify-center text-[#f9b03c] text-xs group-hover:-translate-y-0.5 transition-transform">
                  <i className="fa-solid fa-chevron-up"></i>
                </div>
                <span>ማውጫውን ወደ ላይ ሰብስብ (Collapse Menu) ▴</span>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Bottom-Edge Handle Attached to Navigation Container */}
      {isCurtainOpen && !isSearchActive && (
        <div className="absolute bottom-0 translate-y-full left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto flex justify-center select-none">
          <button 
            type="button"
            onClick={closeCurtain}
            className="pointer-events-auto bg-black/95 text-white border-x border-b border-[#f9b03c]/50 hover:border-[#f9b03c] text-xs font-black font-heading px-6 sm:px-7 py-2.5 rounded-b-2xl shadow-2xl hover:shadow-[0_10px_25px_rgba(0,0,0,0.9),0_0_25px_rgba(249,176,60,0.4)] transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap group"
            title="ማውጫውን ወደ ላይ ሰብስብ (Collapse Menu)"
          >
            <div className="w-5 h-5 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/40 flex items-center justify-center text-[#f9b03c] text-[10px] group-hover:-translate-y-0.5 transition-transform">
              <i className="fa-solid fa-chevron-up"></i>
            </div>
            <span>🧭 ማውጫውን ሰብስብ ▴</span>
          </button>
        </div>
      )}
    </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />

      {/* ===================== 📲 APP DOWNLOAD CONFIRMATION MODAL ===================== */}
      {showAppDownloadModal && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowAppDownloadModal(false)}
        >
          <div 
            className="relative w-full max-w-md rounded-2xl bg-[#080d18]/95 border border-[#f9b03c]/45 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(249,176,60,0.25)] space-y-4 animate-in zoom-in-95 duration-200 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-20 bg-[#f9b03c]/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header: App Icon + Title + Device Badge + Close */}
            <div className="flex items-start gap-3.5 relative">
              <div className="relative shrink-0 w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-[#3268ba] shadow-[0_0_15px_rgba(249,176,60,0.4)]">
                <img 
                  src="/tc-logo.jpg" 
                  alt="Tsehay Campus" 
                  className="w-full h-full object-cover rounded-[10px]"
                />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[8px] shadow">
                  PRO
                </span>
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-black font-heading text-white tracking-tight">
                    የፀሐይ ካምፓስን አፕሊኬሽን ይጫኑ
                  </h3>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/35 whitespace-nowrap">
                    📱💻 Mobile & PC
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug mt-1">
                  🚀 በስልክዎም ሆነ በኮምፒውተርዎ ላይ አፑን ጭነው እጅግ ፈጣን ትምህርት፣ ከመስመር ውጭ ዝግጁነት እና የቀጥታ ማሳወቂያዎችን ያግኙ!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAppDownloadModal(false)}
                className="absolute top-0 right-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-white/10 text-xs"
                title="ዝጋ (Close)"
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-left p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
              <div className="flex items-center gap-2 text-slate-200">
                <i className="fa-solid fa-bolt text-[#f9b03c]"></i>
                <span>3x እጅግ ፈጣን አሰራር</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <i className="fa-solid fa-bell text-[#f9b03c]"></i>
                <span>ቅጽበታዊ ማሳወቂያዎች</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <i className="fa-solid fa-wifi-slash text-[#f9b03c]"></i>
                <span>ከመስመር ውጭ ዝግጁ</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <i className="fa-solid fa-gauge-high text-[#f9b03c]"></i>
                <span>አነስተኛ ዳታ ቆጣቢ</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => setShowAppDownloadModal(false)}
                className="py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                ይቅር (Cancel)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAppDownloadModal(false);
                  window.dispatchEvent(new CustomEvent('tsehay_trigger_install_now'));
                  window.dispatchEvent(new CustomEvent('open-pwa-install'));
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs transition cursor-pointer shadow-[0_0_20px_rgba(249,176,60,0.4)] flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>አሁኑኑ ጫን (Install)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
