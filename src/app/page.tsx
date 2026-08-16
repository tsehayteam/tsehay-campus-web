// @ts-nocheck
'use client';
import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import SmartSearchInput from '@/components/SmartSearchInput';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl } from '@/lib/courseCache';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPurchasedCourses, setHasPurchasedCourses] = useState<boolean | null>(null);
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    { role: 'ai', text: 'ሰላም! 👋 እኔ የ Tsehay Campus አጠቃላይ የ AI ረዳት ነኝ። ስለ ኮርሶቻችን፣ ስለ ዌብሳይቱ አጠቃቀም፣ ስለ ክፍያ እና ስለ መስራቾቻችን ማንኛውንም መረጃ ሊጠይቁኝ ይችላሉ። ዛሬ በምን ልርዳዎ?' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // FAQ state
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  const { t } = useLanguage();

  useEffect(() => {
    // Force scroll to top on initial load to prevent browser from restoring scroll position to the AI section
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const container = document.getElementById('ai-landing-chat');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [aiMessages, isAiLoading]);

  useEffect(() => {
    if (user) {
      const fetchPurchasedCourses = async () => {
        try {
          const purchasesRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses');
          const purchasesSnap = await getDocs(purchasesRef);
          setHasPurchasedCourses(!purchasesSnap.empty);
        } catch (error) {
          console.error("Error fetching user purchases:", error);
          setHasPurchasedCourses(false);
        }
      };
      fetchPurchasedCourses();
    } else {
      setHasPurchasedCourses(null);
    }
  }, [user]);

  useEffect(() => {
    // Instant cache fallback on client mount
    try {
      const cached = getCachedCourses();
      if (cached.length > 0) setCourses(cached);
    } catch (e) {}

    // Fetch courses for landing page with real-time updates
    const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const coursesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCourses(coursesList);
        saveCachedCourses(coursesList);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAiSubmit = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!aiInput.trim()) return;
    
    const question = aiInput.trim();
    const newMessages = [...aiMessages, { role: 'user', text: question }];
    setAiMessages(newMessages);
    setAiInput('');
    setIsAiLoading(true);

    setTimeout(() => {
      const container = document.getElementById('ai-landing-chat');
      if (container) container.scrollTop = container.scrollHeight;
    }, 50);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: question })
        });
        
        const data = await response.json();
        const reply = data.reply || data.error || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።";
        setAiMessages([...newMessages, { role: 'ai', text: reply }]);
        setTimeout(() => {
          const container = document.getElementById('ai-landing-chat');
          if (container) container.scrollTop = container.scrollHeight;
        }, 50);
    } catch (err: any) {
        setAiMessages([...newMessages, { role: 'ai', text: `ስህተት: ${err?.message || err || "ያልታወቀ ስህተት"}` }]);
    } finally {
        setIsAiLoading(false);
    }
  };

  // Khan Academy style category filter state
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    { id: 'All', label: '🌟 ሁሉም', labelEn: '🌟 All' },
    { id: 'Shein', label: '👗 ሼን ኢምፖርት', labelEn: '👗 Shein Import' },
    { id: 'Marketing', label: '📱 ዲጂታል ማርኬቲንግ', labelEn: '📱 Marketing' },
    { id: 'AI', label: '🤖 Tsehay AI', labelEn: '🤖 Tsehay AI' },
    { id: 'YouTube', label: '🎬 ዩቲዩብ', labelEn: '🎬 YouTube' },
    { id: 'Free', label: '🎁 ነፃ ኮርሶች', labelEn: '🎁 Free Courses' },
  ];

  const filteredCourses = courses.filter(c => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Free') return c.isFree || c.price === 0 || c.price === '0' || c.price === 'Free';
    if (activeCategory === 'Shein') return c.title?.toLowerCase().includes('shein') || c.title?.includes('ሺን') || c.title?.includes('ሼን') || c.category?.toLowerCase().includes('shein');
    if (activeCategory === 'Marketing') return c.title?.toLowerCase().includes('marketing') || c.title?.includes('ማርኬቲንግ') || c.category?.toLowerCase().includes('marketing');
    if (activeCategory === 'AI') return c.title?.toLowerCase().includes('ai') || c.category?.toLowerCase().includes('ai');
    if (activeCategory === 'YouTube') return c.title?.toLowerCase().includes('youtube') || c.title?.includes('ዩቲዩብ');
    return c.category === activeCategory;
  });

  return (
    <main className="pb-16 md:pb-0">
    
    <section className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-36 lg:pb-24 overflow-hidden bg-dark" id="home">
        <div className="absolute inset-0 z-0" style={{backgroundImage: "url('/assets/hero-bg-new.jpg')", backgroundSize: "cover", backgroundPosition: "center"}}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark/85 via-dark/60 to-dark/50 dark:from-black/90 dark:via-black/70 dark:to-black/60 z-0"></div>
        
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[30px] sm:h-[40px] md:h-[80px] block" style={{transform: "rotate(180deg)"}}>
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,123.82,200,111.4,241.9,103.95,281.87,83.47,321.39,56.44Z" fill="var(--bodyBg)"></path>
            </svg>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="max-w-2xl lg:w-1/2 w-full text-center lg:text-left">
                
                {/* Khan Academy Style Header Badge */}
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary/30 via-primary/20 to-secondary/30 border border-secondary/40 hover:border-primary/60 text-white font-black px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm mb-4 sm:mb-6 backdrop-blur-md shadow-lg animate-badge-glow transition-all">
                    <i className="fa-solid fa-medal text-primary animate-gentle-bounce"></i> 
                    <span className="tracking-wide">{t('hero_badge')}</span>
                </div>

                <h1 id="hero-welcome" className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 sm:mb-5 leading-[1.2] text-white">
                    {t('hero_title_1')} <br /> 
                    <span className="text-gradient">{t('hero_title_2')}</span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 sm:mb-8 font-body leading-relaxed max-w-xl mx-auto lg:mx-0">
                    <span className="notranslate font-black text-primary">Tsehay Campus</span> {t('hero_desc')}
                </p>

                {/* Khan Academy Mobile Search Box */}
                <div className="md:hidden w-full mb-6 text-left">
                    <SmartSearchInput 
                        courses={courses} 
                        placeholder={t('search_placeholder') || "ኮርሶችን ይፈልጉ (Social Media, ሼን, AI)..."} 
                    />
                </div>

                {/* Khan Academy Style Horizontally Scrollable Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap justify-start lg:justify-start">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer shadow-xs ${
                                activeCategory === cat.id
                                    ? 'bg-primary text-dark shadow-md scale-105 ring-2 ring-primary/50'
                                    : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start" id="hero-action-buttons">
                    <button onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} className="bg-primary text-dark px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-black transition-all duration-300 btn-glow flex items-center justify-center gap-3 text-sm sm:text-base shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer">
                        <span>{t('explore_courses')}</span>
                        <i className="fa-solid fa-arrow-right animate-pulse"></i>
                    </button>
                    <Link href="/about" className="group bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md px-6 sm:px-7 py-3.5 sm:py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-sm sm:text-base shadow-sm">
                        <i className="fa-solid fa-circle-play text-lg group-hover:scale-110 group-hover:text-primary transition-all duration-300"></i>
                        <span>{t('learn_about_us')}</span>
                    </Link>
                </div>
            </div>

            {/* Video Player Card */}
            <div className="lg:w-1/2 w-full flex justify-center relative animate-float">
                <div className="relative w-full max-w-[460px]">
                    <div className="absolute inset-0 bg-secondary rounded-full blur-[80px] opacity-50 dark:opacity-30"></div>
                    <div className="relative w-full aspect-video sm:h-[350px] rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-amber-400/30 dark:border-primary/40 overflow-hidden group z-10 hero-video-glow">
                        <video id="hero-video" autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                            <source src="/assets/for_landing_page_first.mp4" type="video/mp4" />
                        </video>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                    
                    {/* Floating Badges */}
                    <div className="absolute -bottom-3 left-2 sm:-bottom-5 sm:-left-8 bg-white/95 dark:bg-darkCard/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl z-20 flex items-center gap-2.5 sm:gap-3 border border-gray-100 dark:border-gray-800">
                        <div className="bg-green-100 dark:bg-green-900/40 text-success p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-base sm:text-xl shadow-xs"><i className="fa-solid fa-check-double"></i></div>
                        <div>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">{t('recognized_cert')}</p>
                            <p className="text-dark dark:text-white font-black text-xs sm:text-sm notranslate">{t('recognized')}</p>
                        </div>
                    </div>
                    
                    <div className="absolute -top-3 right-2 sm:-top-6 sm:-right-6 bg-white/95 dark:bg-darkCard/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl z-20 flex items-center gap-2.5 sm:gap-3 border border-gray-100 dark:border-gray-800">
                        <div className="bg-blue-100 dark:bg-blue-900/40 text-secondary dark:text-primary p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-base sm:text-xl shadow-xs"><i className="fa-solid fa-users"></i></div>
                        <div>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-none">{t('students')}</p>
                            <p className="text-dark dark:text-white font-black text-xs sm:text-sm">500+</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/* Trusted By Section */}
    <section className="py-8 sm:py-12 bg-white dark:bg-dark border-b border-gray-100 dark:border-gray-800 relative z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block bg-blue-50/50 dark:bg-darkCard border border-blue-100 dark:border-gray-800 rounded-full px-4 sm:px-6 py-1.5 sm:py-2.5 mb-6 sm:mb-8 shadow-sm">
                <p className="font-accent text-secondary dark:text-primary font-extrabold tracking-widest text-xs sm:text-sm uppercase">{t('trusted_by')}</p>
            </div>
            <div className="flex justify-center items-center gap-6 sm:gap-12 md:gap-20 flex-wrap">
                <div className="flex items-center gap-2 sm:gap-3 text-xl sm:text-3xl md:text-4xl font-black font-heading text-gray-800 dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg> <span className="notranslate text-base sm:text-xl md:text-2xl font-bold">Google</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 text-xl sm:text-3xl md:text-4xl font-black font-heading text-gray-800 dark:text-gray-200">
                    <i className="fa-brands fa-meta text-[#0668E1] text-xl sm:text-3xl"></i> <span className="notranslate text-base sm:text-xl md:text-2xl font-bold">Meta</span>
                </div>

                <div className="flex items-center">
                    <div className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-xl md:text-2xl font-bold tracking-[0.15em] shadow-md uppercase notranslate">
                        SHEIN
                    </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 text-xl sm:text-3xl md:text-4xl font-black font-heading text-gray-800 dark:text-gray-200">
                    <i className="fa-brands fa-tiktok text-black dark:text-gray-100 text-xl sm:text-3xl"></i> <span className="notranslate text-base sm:text-xl md:text-2xl font-bold">TikTok</span>
                </div>
            </div>
        </div>
    </section>

    {/* Khan Academy Style Learning Pillars (Features) */}
    <section id="features" className="py-14 sm:py-24 relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white dark:from-darkCard dark:to-dark border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
                <h2 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-dark dark:text-white mb-3">{t('our')} <span className="text-secondary dark:text-primary">{t('difference')}</span></h2>
                <div className="w-16 sm:w-20 h-1.5 bg-primary mx-auto rounded-full shadow-sm"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400 font-body text-sm sm:text-base md:text-lg">{t('difference_desc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 lg:gap-10">
                <div className="bg-white dark:bg-[#111111] p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 group cursor-pointer active:scale-98" onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}>
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-900/30 text-secondary dark:text-primary rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl mb-5 sm:mb-8 group-hover:bg-secondary dark:group-hover:bg-primary group-hover:text-white dark:group-hover:text-dark transition-colors duration-300 shadow-inner">
                        <i className="fa-solid fa-chalkboard-user"></i>
                    </div>
                    <h3 className="font-black text-lg sm:text-2xl text-dark dark:text-white mb-2 sm:mb-4 font-heading">{t('practical_courses')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-xs sm:text-[15px]">{t('practical_courses_desc')}</p>
                </div>
                
                <div className="bg-white dark:bg-[#111111] p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-lg border-2 border-primary/40 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden cursor-pointer active:scale-98" onClick={() => document.getElementById('ai-feature')?.scrollIntoView({behavior: 'smooth'})}>
                    <div className="absolute -right-10 -top-10 bg-gradient-to-br from-primary/20 to-transparent w-40 h-40 rounded-full -z-10 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-orange-50 dark:bg-orange-900/30 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl mb-5 sm:mb-8 group-hover:bg-primary group-hover:text-dark transition-colors duration-300 shadow-inner">
                        <i className="fa-solid fa-robot"></i>
                    </div>
                    <h3 className="font-black text-lg sm:text-2xl text-dark dark:text-white mb-2 sm:mb-4 font-heading relative z-10"><span className="notranslate">Tsehay AI</span> {t('ai_integration')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-xs sm:text-[15px] relative z-10">{t('ai_integration_desc')}</p>
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-primary text-dark text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-md">{t('new_badge')}</div>
                </div>

                <div className="bg-white dark:bg-[#111111] p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 group cursor-pointer active:scale-98">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-green-50 dark:bg-green-900/30 text-success rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl mb-5 sm:mb-8 group-hover:bg-success group-hover:text-white transition-colors duration-300 shadow-inner">
                        <i className="fa-solid fa-certificate"></i>
                    </div>
                    <h3 className="font-black text-lg sm:text-2xl text-dark dark:text-white mb-2 sm:mb-4 font-heading">{t('cert_title')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-xs sm:text-[15px]">{t('cert_desc')}</p>
                </div>
            </div>
        </div>
    </section>

    {/* Khan Academy Style Courses Section with Responsive Cards */}
    <section id="courses" className="py-14 sm:py-20 bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-darkCard dark:to-dark border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center mb-8 sm:mb-12 gap-3">
                <h2 className="font-heading font-black text-2xl sm:text-4xl text-dark dark:text-white mb-1">{t('popular_courses')}</h2>
                <p className="text-gray-600 dark:text-gray-400 font-body text-sm sm:text-base md:text-lg max-w-xl">{t('popular_courses_desc')}</p>
                
                {/* Course Filter Pills in Section */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-2 max-w-full no-scrollbar px-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                activeCategory === cat.id
                                    ? 'bg-secondary text-white dark:bg-primary dark:text-dark font-black shadow-md scale-105'
                                    : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-primary/50'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 w-full">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold tracking-widest uppercase text-xs sm:text-sm">{t('loading_courses')}</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12 w-full bg-white dark:bg-darkCard rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
                    <i className="fa-solid fa-box-open text-4xl text-gray-300 dark:text-slate-600 mb-3"></i>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-base">{t('no_course_found')}</p>
                    <button onClick={() => setActiveCategory('All')} className="mt-4 px-4 py-2 bg-primary text-dark rounded-xl font-bold text-xs">ሁሉንም ኮርሶች አሳይ</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" id="courseList">
                    {filteredCourses.map(course => (
                        <div 
                            key={course.id} 
                            className="bg-white dark:bg-[#111111] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group relative border border-gray-200 dark:border-gray-800 cursor-pointer" 
                            onClick={() => window.location.href=`/courses/${course.id}`}
                        >
                            {/* Course Thumbnail */}
                            <div className="relative aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center">
                                <img 
                                    src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                    alt={course.title} 
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                                />
                                {(!course.isFree && course.price !== 0 && course.price !== '0' && course.price !== 'Free') ? (
                                    <div className="absolute top-3 right-3 bg-primary text-dark text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                        <i className="fa-solid fa-star text-[9px]"></i> PREMIUM
                                    </div>
                                ) : (
                                    <div className="absolute top-3 right-3 bg-success text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                                        <i className="fa-solid fa-gift text-[9px]"></i> FREE
                                    </div>
                                )}
                                {course.category && (
                                    <div className="absolute bottom-3 left-3 bg-[#111111]/90 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm">
                                        {course.category}
                                    </div>
                                )}
                            </div>

                            {/* Course Details (Khan Academy Format) */}
                            <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-dark dark:text-white mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {course.title || t('course_unknown')}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-secondary dark:text-primary flex items-center justify-center text-[10px]">
                                            <i className="fa-solid fa-user-tie"></i>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">{course.instructor || 'Eyoub Sahle'}</span>
                                    </div>

                                    {/* Quick Meta Chips */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/50 text-gray-700 dark:text-gray-300 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-800">
                                            <i className="fa-regular fa-clock text-primary text-[10px]"></i> {course.duration || '00:50:00'}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/50 text-gray-700 dark:text-gray-300 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-800">
                                            <i className="fa-solid fa-layer-group text-primary text-[10px]"></i> {course.lessons?.length || 0} {t('course_lessons')}
                                        </div>
                                    </div>
                                </div>

                                {/* Khan Academy Style Action Button */}
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2 mt-2">
                                    <div>
                                        {(course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free') ? (
                                            <span className="text-lg sm:text-xl font-black text-success tracking-tight">{t('course_free')}</span>
                                        ) : (
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-lg sm:text-xl font-black text-dark dark:text-white tracking-tight">{Number(course.price).toLocaleString()} {t('course_currency')}</span>
                                                {course.originalPrice && (
                                                    <span className="text-xs font-medium text-gray-400 line-through">{Number(course.originalPrice).toLocaleString()}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/15 text-primary group-hover:bg-primary group-hover:text-dark font-black text-xs transition-all duration-200 shadow-xs">
                                        <span>ይማሩ</span>
                                        <i className="fa-solid fa-chevron-right text-[10px]"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </section>

    
    <section id="ai-feature" className="relative py-24 lg:py-32 overflow-hidden hero-mesh text-white border-y border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 relative z-10">
            <div className="flex-1 text-center lg:text-left animate-float" style={{animationDuration: "6s"}}>
                <h2 className="text-3xl sm:text-5xl font-black font-heading mb-6 leading-tight"><span className="text-gradient notranslate">በ Tsehay AI</span> {t('make_smart')}</h2>
                <p className="text-lg text-blue-100 font-body mb-8 leading-relaxed">{t('ai_section_desc')}</p>
                <button onClick={() => { document.getElementById('ai-landing-input')?.focus() }} className="bg-white text-secondary font-black px-8 py-3.5 rounded-xl hover:bg-primary hover:text-dark transition shadow-[0_0_20px_rgba(249,176,60,0.5)] transform hover:-translate-y-1">{t('ask_ai_tutor')}</button>
            </div>
            <div className="flex-1 w-full max-w-lg bg-white/95 dark:bg-darkCard/95 backdrop-blur-md p-8 rounded-[3rem] shadow-2xl text-dark border border-white/20">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-5">
                    <div className="bg-secondary text-white p-2.5 rounded-xl shadow-inner"><i className="fa-solid fa-robot animate-pulse"></i></div>
                    <h3 className="font-black text-base dark:text-white notranslate">Tsehay AI (የካምፓስ ረዳትዎ)</h3>
                </div>
                <div className="space-y-4 mb-6 text-sm font-body h-64 overflow-y-auto pr-2 custom-modal-scroll" id="ai-landing-chat">
                    {aiMessages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2'} mb-4`}>
                            {msg.role === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-dark shrink-0 shadow-md">
                                    <i className="fa-solid fa-robot text-xs"></i>
                                </div>
                            )}
                            <div className={`${msg.role === 'user' ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-dark dark:text-gray-200' : 'bg-blue-50 dark:bg-dark border-primary text-gray-800 dark:text-gray-200'} p-3 rounded-2xl max-w-[85%] border-l-4 shadow-sm text-sm leading-relaxed font-medium`} dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br>') }} />
                        </div>
                    ))}
                    {isAiLoading && (
                        <div className="flex gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white shrink-0 shadow-md">
                                <i className="fa-solid fa-robot text-xs animate-bounce"></i>
                            </div>
                            <div className="bg-blue-50 dark:bg-darkCard p-3 rounded-2xl max-w-[85%] border-l-4 border-secondary shadow-sm text-gray-500 dark:text-gray-400 text-sm">እያሰብኩ ነው...</div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleAiSubmit} className="flex gap-2">
                    <input 
                      id="ai-landing-input" 
                      type="text" 
                      value={aiInput} 
                      onChange={(e) => setAiInput(e.target.value)} 
                      placeholder="ጥያቄዎን እዚህ ይጻፉ..." 
                      className="flex-1 bg-gray-100 dark:bg-dark dark:text-white border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-secondary/30 outline-none transition" 
                    />
                    <button type="submit" disabled={isAiLoading || !aiInput.trim()} className="bg-secondary text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-dark dark:hover:bg-primary transition shadow-md disabled:opacity-50">
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    </section>

    
    <section id="faq" className="py-16 bg-slate-50 dark:bg-darkCard border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <h2 className="font-heading font-black text-3xl sm:text-4xl text-dark dark:text-white mb-3">{t('faq_title')}</h2>
                <div className="w-16 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-4">
                <div className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition" onClick={() => setOpenFaqId(openFaqId === 1 ? null : 1)}>
                        <span className="text-dark dark:text-white text-lg flex items-center gap-3"><i className="fa-solid fa-circle-question text-primary"></i> {t('faq_q1')}</span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 transition duration-300 ${openFaqId === 1 ? 'rotate-180' : ''}`}></i>
                    </button>
                    {openFaqId === 1 && (
                        <div className="px-5 pb-5 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 font-body text-[15px]">
                            <p className="ml-7">{t('faq_a1')}</p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition" onClick={() => setOpenFaqId(openFaqId === 2 ? null : 2)}>
                        <span className="text-dark dark:text-white text-lg flex items-center gap-3"><i className="fa-solid fa-circle-question text-primary"></i> {t('faq_q2')}</span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 transition duration-300 ${openFaqId === 2 ? 'rotate-180' : ''}`}></i>
                    </button>
                    {openFaqId === 2 && (
                        <div className="px-5 pb-5 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 font-body text-[15px]">
                            <p className="ml-7">{t('faq_a2')}</p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition" onClick={() => setOpenFaqId(openFaqId === 3 ? null : 3)}>
                        <span className="text-dark dark:text-white text-lg flex items-center gap-3"><i className="fa-solid fa-circle-question text-primary"></i> {t('faq_q3')}</span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 transition duration-300 ${openFaqId === 3 ? 'rotate-180' : ''}`}></i>
                    </button>
                    {openFaqId === 3 && (
                        <div className="px-5 pb-5 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 font-body text-[15px]">
                            <p className="ml-7">{t('faq_a3')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </section>



    <Footer />

    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4">
        <a href="https://t.me/TsehayTeam" target="_blank" className="w-16 h-16 bg-primary text-dark rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(249,176,60,0.5)] transition-all duration-300 hover:scale-110 relative group border-2 border-white/20">
            <i className="fa-brands fa-telegram"></i>
            <span className="absolute right-full mr-4 bg-dark dark:bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none border border-gray-700 shadow-xl">በቴሌግራም ያግኙን</span>
        </a>
        <a href="https://wa.me/251980209090" target="_blank" className="w-16 h-16 bg-primary text-dark rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(249,176,60,0.5)] transition-all duration-300 hover:scale-110 relative group border-2 border-white/20">
            <i className="fa-brands fa-whatsapp"></i>
            <span className="absolute right-full mr-4 bg-dark dark:bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none border border-gray-700 shadow-xl">በWhatsApp ያግኙን</span>
        </a>
        <a href="tel:0980209090" className="w-16 h-16 bg-primary text-dark rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(249,176,60,0.5)] transition-all duration-300 hover:scale-110 relative group border-2 border-white/20">
            <i className="fa-solid fa-phone"></i>
            <span className="absolute right-full mr-4 bg-dark dark:bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none border border-gray-700 shadow-xl">ስልክ ይደውሉ</span>
        </a>
    </div>

    
    

    
    
    
    

    
    
    
    


    </main>
  );
}
