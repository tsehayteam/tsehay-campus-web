'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const { lang, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    // Initial sync of theme
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleOpenAuth = (e: any) => {
        setIsSignupMode(e.detail?.isSignupMode || false);
        setIsAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
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
    await signOut(auth);
    setShowProfileDropdown(false);
  };

  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <nav className="glass-nav fixed w-full top-0 z-50 transition-all duration-300">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20 gap-4 lg:gap-6">
                
                <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex-shrink-0 flex items-center cursor-pointer group">
                    <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="h-14 w-auto object-contain mr-2 lg:mr-3 rounded-md shadow-sm group-hover:shadow-md transition duration-300" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=3268BA&color=fff' }} />
                    <span className="font-heading font-black text-xl lg:text-2xl text-dark dark:text-white tracking-tight notranslate">Tsehay<span className="text-secondary dark:text-primary">Campus</span></span>
                </Link>

                <div className="hidden lg:flex items-center h-full">
                    <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-secondary dark:hover:text-primary font-bold transition text-[14px] lg:text-[15px] px-2 lg:px-3">{t('about_us')}</Link>
                    <Link href="/#courses" onClick={(e) => {
                        if (pathname === '/') {
                            e.preventDefault();
                            const element = document.getElementById('courses');
                            if (element) {
                                const offset = 80;
                                const bodyRect = document.body.getBoundingClientRect().top;
                                const elementRect = element.getBoundingClientRect().top;
                                window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
                            }
                        }
                    }} className="text-gray-700 dark:text-gray-300 hover:text-secondary dark:hover:text-primary font-bold transition text-[14px] lg:text-[15px] px-2 lg:px-3">{t('all_courses')}</Link>
                </div>
                
                <div className="flex-1 max-w-md hidden md:flex items-center border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2 search-bar mx-2 lg:mx-4 relative">
                    <i className="fa-solid fa-magnifying-glass text-gray-500 dark:text-gray-400 text-sm lg:text-base cursor-pointer hover:text-primary transition"></i>
                    <input type="text" id="courseSearchInput" placeholder={t('search_placeholder')} className="bg-transparent border-none outline-none w-full ml-2 lg:ml-3 text-[14px] lg:text-[15px] font-body text-dark dark:text-white placeholder-gray-500" />
                </div>
                
                <div className="hidden md:flex items-center gap-2 lg:gap-3 font-heading text-sm">
                    <Link href="/#ai-feature" className="text-gray-700 dark:text-white hover:text-secondary dark:hover:text-primary font-black transition flex items-center gap-1.5 lg:gap-2 px-1 lg:px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkCard whitespace-nowrap ml-1 notranslate">
                        <i className="fa-solid fa-wand-magic-sparkles text-primary animate-pulse text-lg"></i> <span className="hidden lg:inline text-lg">Tsehay AI</span>
                    </Link>
                    <button onClick={toggleLanguage} className="hidden sm:flex items-center justify-center bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 transition shadow-sm shrink-0 font-bold text-[12px] text-dark dark:text-white px-4 py-1.5 rounded-full notranslate" translate="no">
                        {lang === 'am' ? 'EN' : 'አማ'}
                    </button>

                    <button onClick={toggleTheme} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-dark border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-darkCard transition shadow-sm text-gray-600 dark:text-yellow-400">
                        <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                    </button>

                    <div className="h-5 w-px bg-gray-300 dark:bg-gray-800 mx-0.5 lg:mx-1"></div>
                    
                    {!user ? (
                      <>
                        <button onClick={() => openAuthModal(false)} className="text-gray-700 dark:text-white font-bold hover:text-secondary dark:hover:text-primary transition px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkCard whitespace-nowrap">{t('login')}</button>
                        <button onClick={() => openAuthModal(true)} className="bg-primary text-dark px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition shadow-md btn-glow whitespace-nowrap">{t('register')}</button>
                      </>
                    ) : (
                      <div className="relative">
                        <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center gap-2 focus:outline-none">
                            <img src={user.photoURL || 'https://ui-avatars.com/api/?name=User&background=3268BA&color=fff'} alt="Profile" className="w-10 h-10 rounded-full border-2 border-primary object-cover" />
                        </button>
                        {showProfileDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-darkCard rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                              <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark hover:text-secondary dark:hover:text-primary"><i className="fa-solid fa-user mr-2 w-4 text-center"></i> ወደ መማሪያ ክፍል</Link>
                              {isAdmin && (
                                <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark hover:text-secondary dark:hover:text-primary"><i className="fa-solid fa-shield-halved mr-2 w-4 text-center"></i> አድሚን</Link>
                              )}
                              <hr className="my-1 border-gray-100 dark:border-gray-800" />
                              <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/10 font-bold"><i className="fa-solid fa-arrow-right-from-bracket mr-2 w-4 text-center"></i> ዘግተህ ውጣ (Logout)</button>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="md:hidden flex items-center gap-4">
                    <button onClick={toggleLanguage} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full font-bold text-[11px] text-white transition shadow-sm notranslate" translate="no">{lang === 'am' ? 'EN' : 'አማ'}</button>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white text-2xl focus:outline-none"><i className="fa-solid fa-bars"></i></button>
                </div>
            </div>
        </div>
        
        {/* Mobile Menu */}
        <div className={`md:hidden bg-[#0d0d0d] border-t border-gray-800 shadow-xl overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[70vh]' : 'max-h-0'}`}>
            <div className="px-4 pt-2 pb-6 space-y-2 text-center flex flex-col overflow-y-auto">
                <Link href="/about" className="block px-3 py-2 text-white font-bold rounded-md hover:bg-white/5 border border-white/10">ስለ እኛ</Link>
                <Link href="/#courses" onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (pathname === '/') {
                        e.preventDefault();
                        const element = document.getElementById('courses');
                        if (element) {
                            const offset = 80;
                            const bodyRect = document.body.getBoundingClientRect().top;
                            const elementRect = element.getBoundingClientRect().top;
                            window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
                        }
                    }
                }} className="block px-3 py-2 text-white font-bold rounded-md hover:bg-white/5 border border-white/10">ሁሉም ኮርሶች</Link>
                <hr className="my-2 border-gray-200 dark:border-gray-800" />
                {!user ? (
                  <>
                    <button onClick={() => openAuthModal(false)} className="w-full text-secondary dark:text-primary font-bold py-2.5 hover:bg-gray-50 dark:hover:bg-darkCard rounded-lg border border-secondary dark:border-primary transition">ግባ (Login)</button>
                    <button onClick={() => openAuthModal(true)} className="w-full bg-primary text-dark font-bold py-2.5 rounded-lg mt-2 shadow-md hover:bg-yellow-400 transition">አዲስ ይመዝገቡ</button>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard" className="block px-3 py-2 text-gray-700 dark:text-gray-300 font-bold rounded-md hover:bg-gray-50 dark:hover:bg-darkCard border border-gray-100 dark:border-gray-800">ወደ መማሪያ ክፍል</Link>
                    {isAdmin && <Link href="/admin" className="block px-3 py-2 text-gray-700 dark:text-gray-300 font-bold rounded-md hover:bg-gray-50 dark:hover:bg-darkCard border border-gray-100 dark:border-gray-800">አድሚን</Link>}
                    <button onClick={handleSignOut} className="w-full text-danger font-bold py-2.5 hover:bg-red-50 rounded-lg border border-danger transition mt-2">ዘግተህ ውጣ (Logout)</button>
                  </>
                )}
            </div>
        </div>
      </nav>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} isSignupMode={isSignupMode} setIsSignupMode={setIsSignupMode} />
    </>
  );
}
