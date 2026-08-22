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
import YouTubeVideoSlider from '@/components/YouTubeVideoSlider';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl } from '@/lib/courseCache';

const PARTNER_BRANDS = [
  {
    name: 'Google',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-heading tracking-tight">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
      </div>
    )
  },
  {
    name: 'Meta',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <i className="fa-brands fa-meta text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#0668E1] shrink-0"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#0668E1] tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Meta
        </span>
      </div>
    )
  },
  {
    name: 'TikTok',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <i className="fa-brands fa-tiktok text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 dark:text-white shrink-0"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          TikTok
        </span>
      </div>
    )
  },
  {
    name: 'SHEIN',
    render: () => (
      <div className="flex items-center opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-xl text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-[0.2em] sm:tracking-[0.25em] uppercase shadow-lg shrink-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          SHEIN
        </div>
      </div>
    )
  },
  {
    name: 'BYBIT',
    render: () => (
      <div className="flex items-center opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="flex items-end text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          BYB<span className="w-1.5 sm:w-2 md:w-2.5 h-6 sm:h-8 md:h-10 lg:h-12 bg-[#F7A600] mx-0.5 sm:mx-1 inline-block relative bottom-0.5 sm:bottom-1"></span>T
        </div>
      </div>
    )
  },
  {
    name: 'shopify',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <i className="fa-brands fa-shopify text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#95BF47] shrink-0"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
          shopify
        </span>
      </div>
    )
  },
  {
    name: 'YouTube',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <i className="fa-brands fa-youtube text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FF0000] shrink-0"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: 'Oswald, Montserrat, sans-serif' }}>
          YouTube
        </span>
      </div>
    )
  },
];

function HeroTypewriterGlow({ phrases }: { phrases?: string[] }) {
  const defaultPhrases = [
    "የኢትዮጵያ #1 የኦንላይን የክህሎት ማበልፀጊያ",
    "Ethiopia's #1 Online Skills Academy",
    "በ AI የታገዘ ተግባራዊ የቢዝነስ ስልጠና"
  ];
  const words = phrases || defaultPhrases;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentIdx];
    const speed = isDeleting ? 35 : 75;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < word.length) {
          setCurrentText(word.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2600);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(word.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentIdx((prev) => (prev + 1) % words.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentIdx, words]);

  return (
    <span className="inline-flex items-center gap-1 font-black text-[#f9b03c] drop-shadow-[0_0_15px_rgba(249,176,60,0.6)]">
      <span>{currentText}</span>
      <span className="w-0.5 h-4 bg-[#f9b03c] animate-pulse inline-block ml-0.5 shadow-[0_0_8px_#f9b03c]"></span>
    </span>
  );
}

function LiveCounter({ target = 500, suffix = "+", duration = 1600 }: { target?: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    const delayTimer = setTimeout(() => {
      animFrame = requestAnimationFrame(step);
    }, 450);

    return () => {
      clearTimeout(delayTimer);
      cancelAnimationFrame(animFrame);
    };
  }, [target, duration]);

  return <span>{count}{suffix}</span>;
}

function MagneticButton({ children, className, onClick, ...props }: any) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.28;
    const y = (clientY - (top + height / 2)) * 0.28;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: position.x === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease' : 'transform 0.1s ease-out, box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

function MagneticLink({ children, className, href, ...props }: any) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!linkRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = linkRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.28;
    const y = (clientY - (top + height / 2)) * 0.28;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Link
      ref={linkRef}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: position.x === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease' : 'transform 0.1s ease-out, box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={className}
      {...props}
    >
      {children}
    </Link>
  );
}



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

  // Smooth Scroll Parallax for Hero Background
  const [heroParallaxY, setHeroParallaxY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < window.innerHeight * 1.5) {
        setHeroParallaxY(window.scrollY * 0.24);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Force scroll to top on initial load
    window.scrollTo(0, 0);

    // Scrollytelling Reveal Observer
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px'
    });

    const revealElements = document.querySelectorAll('.scrolly-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
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

  return (
    <main className="relative bg-transparent">
      <section className="terafab-hero-container" id="home">
        {/* Full-Cover Background Image / Mesh with Continuous Ken Burns + Parallax */}
        <div 
          className="terafab-hero-bg" 
          style={{
            backgroundImage: "url('/assets/hero-bg-new.jpg')",
            transform: `translate3d(0, ${heroParallaxY}px, 0)`
          }}
        ></div>
        {/* Deep Void Black Vignette */}
        <div className="terafab-hero-vignette"></div>
        
        {/* Subtle Wave Boundary at Bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[30px] md:h-[60px] block" style={{transform: "rotate(180deg)"}}>
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,123.82,200,111.4,241.9,103.95,281.87,83.47,321.39,56.44Z" fill="var(--bodyBg)"></path>
            </svg>
        </div>

        {/* Centered Terafab Layout */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex flex-col justify-center items-center text-center my-auto">
            {/* Terafab Badge with Typewriter Glow & Continuous Pulse */}
            <div className="inline-flex items-center gap-2.5 bg-white/[0.04] border border-[#f9b03c]/30 text-white font-black px-5 py-2.5 rounded-full text-xs sm:text-sm mb-4 sm:mb-5 backdrop-blur-xl headline-glow-badge shadow-[0_0_25px_rgba(249,176,60,0.18)] transition-all">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-pulse"></span>
                <HeroTypewriterGlow phrases={["የኢትዮጵያ #1 የኦንላይን የክህሎት ማበልፀጊያ", "Ethiopia's #1 Online Skills Academy", "በ AI የታገዘ ተግባራዊ የቢዝነስ ስልጠና"]} />
            </div>

            {/* Massive Cinematic Headline - Seamless Color-Shifting Glow */}
            <h1 id="hero-welcome" className="text-3.5xl sm:text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5rem] font-extrabold sm:font-black mb-5 sm:mb-6 leading-[1.14] sm:leading-[1.08] tracking-tight text-white max-w-[1040px] mx-auto w-full">
                <span className="text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">{t('hero_title_1')} </span>
                <span className="hero-headline-shift font-extrabold sm:font-black inline-block">{t('hero_title_2')}</span>
            </h1>
            
            {/* Refined Buttons (Magnetic CTA Style - Compact Spacing & Swapped Order) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full max-w-md sm:max-w-none mb-7 sm:mb-9" id="hero-action-buttons">
                {/* Button 1 (LEFT): Glassmorphism with Magnetic Hover & pulsing Play icon */}
                <MagneticLink 
                    href="/about" 
                    className="group terafab-btn-glass w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-2xl flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer"
                >
                    <svg className="w-5 h-5 text-white/90 btn-play-icon transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"></polygon>
                    </svg>
                    <span>{t('learn_about_us')}</span>
                </MagneticLink>

                {/* Button 2 (RIGHT): Solid Golden Yellow with Magnetic Hover & Arrow icon */}
                <MagneticButton 
                    onClick={() => { document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'}) }} 
                    className="group terafab-btn-primary w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 rounded-2xl flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.35)]"
                >
                    <span>{t('explore_courses')}</span>
                    <svg className="w-5 h-5 transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                    </svg>
                </MagneticButton>
            </div>

            {/* Centered Showcase Preview Card - Pulled Up for Above-the-Fold View */}
            <div className="w-full max-w-4xl relative group scrolly-reveal">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#3268ba]/30 via-[#f9b03c]/25 to-[#3268ba]/30 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-80 transition duration-700 pointer-events-none"></div>
                <div className="relative w-full h-[210px] sm:h-[300px] md:h-[370px] lg:h-[410px] rounded-[1.8rem] shadow-2xl border border-white/10 overflow-hidden bg-black/80">
                    <video 
                        id="hero-video" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        preload="auto" 
                        disablePictureInPicture 
                        controlsList="nodownload noremoteplayback" 
                        onContextMenu={(e) => e.preventDefault()} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                    >
                        <source src="/assets/for_landing_page_first.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                </div>

                {/* Floating Badges on Desktop */}
                {/* Bottom Left: Certificate Badge (Golden Yellow Accent) */}
                <div className="hidden sm:flex absolute -bottom-5 -left-6 hero-floating-badge hero-badge-cert p-3.5 sm:p-4 rounded-2xl z-20 items-center gap-3.5 cursor-default select-none">
                    <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(249,176,60,0.25)] shrink-0">
                        <i className="fa-solid fa-award"></i>
                    </div>
                    <div className="text-left pr-2">
                        <p className="text-[10px] text-[#a0aec0] font-bold uppercase tracking-wider leading-none mb-1">
                            {t('recognized_cert') || 'የተረጋገጠ'}
                        </p>
                        <p className="text-white font-black text-sm tracking-tight drop-shadow-sm">
                            እውቅና ያለው ሰርተፍኬት
                        </p>
                    </div>
                </div>

                {/* Top Right: Students Badge (Royal Blue Accent + Live Counter) */}
                <div className="hidden sm:flex absolute -top-5 -right-6 hero-floating-badge hero-badge-students p-3.5 sm:p-4 rounded-2xl z-20 items-center gap-3.5 cursor-default select-none">
                    <div className="w-10 h-10 rounded-xl bg-[#3268ba]/20 text-[#5a93e8] border border-[#3268ba]/35 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(50,104,186,0.3)] shrink-0">
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div className="text-left pr-2">
                        <p className="text-[10px] text-[#a0aec0] font-bold uppercase tracking-wider leading-none mb-1">
                            {t('students') || 'ተማሪዎች'}
                        </p>
                        <p className="text-white font-black text-sm tracking-tight font-mono drop-shadow-sm flex items-center gap-1.5">
                            <LiveCounter target={500} suffix="+" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>



    <section className="py-10 sm:py-14 bg-white/5 dark:bg-[#030509]/60 backdrop-blur-md border-b border-white/[0.06] relative z-20 shadow-xs transition-colors duration-300 overflow-hidden select-none scrolly-reveal">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-50/60 dark:bg-darkCard/80 border border-blue-100/80 dark:border-gray-800 rounded-full px-5 py-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <p className="font-accent text-secondary dark:text-primary font-extrabold tracking-widest text-[11px] sm:text-xs uppercase">{t('trusted_by')}</p>
            </div>
        </div>

        {/* Pure Brand Logos Infinite Marquee Strip */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] py-3 sm:py-4">
            <div className="flex w-max items-center gap-16 sm:gap-24 md:gap-32 animate-marquee hover:[animation-play-state:paused]">
                {[...PARTNER_BRANDS, ...PARTNER_BRANDS].map((partner, index) => (
                    <div 
                        key={`${partner.name}-${index}`}
                        className="shrink-0 flex items-center justify-center grayscale-15 hover:grayscale-0 transition-all duration-300"
                    >
                        {partner.render()}
                    </div>
                ))}
            </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
            @keyframes marqueeScroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee {
                animation: marqueeScroll 35s linear infinite;
            }
        `}} />
    </section>

    <section id="features" className="py-24 relative overflow-hidden bg-slate-50/50 dark:bg-[#030509] border-b border-gray-200/80 dark:border-white/[0.06] transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#f9b03c]/10 dark:bg-[#f9b03c]/5 rounded-full blur-[120px]"></div>
            <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-[#3268ba]/10 dark:bg-[#3268ba]/5 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.015]"></div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20 scrolly-reveal">
                <div className="inline-flex items-center gap-2 bg-amber-400/10 dark:bg-amber-400/5 border border-amber-400/20 px-4 py-1.5 rounded-full mb-4">
                    <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">THE TSEHAY DIFFERENCE</span>
                </div>
                <h2 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 dark:text-white mb-4">
                  {t('our')} <span className="text-secondary dark:text-primary">{t('difference')}</span>
                </h2>
                <div className="w-20 h-1.5 bg-[#f9b03c] mx-auto rounded-full shadow-sm"></div>
                <p className="mt-5 text-gray-600 dark:text-[#8a95a5] font-body text-base sm:text-lg">{t('difference_desc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                {/* Card 1: Online + In-Person Training (Sequential Order 1) */}
                <div 
                    data-scrolly-order="1"
                    className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-200/70 dark:border-white/[0.08] hover:border-[#f9b03c]/60 dark:hover:border-[#f9b03c]/50 hover:shadow-[0_25px_60px_rgba(249,176,60,0.2)] hover:-translate-y-2 transition-all duration-500 group cursor-pointer active:scale-98 flex flex-col justify-between scrolly-card scrolly-stagger-1"
                    onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
                >
                    <div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/10 dark:bg-[#f9b03c]/10 text-[#f9b03c] border border-amber-400/20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-inner">
                            <i className="fa-solid fa-people-group"></i>
                        </div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading">{t('practical_courses')}</h3>
                        <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px]">{t('practical_courses_desc')}</p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300">
                        <span>ተጨማሪ ይመልከቱ</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                    </div>
                </div>
                
                {/* Card 2: 24/7 Personal AI Tutor (Sequential Order 2 - Center Highlight) */}
                <div 
                    data-scrolly-order="2"
                    className="bg-white/90 dark:bg-white/[0.05] backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl border-2 border-primary/70 dark:border-[#f9b03c]/60 hover:border-[#f9b03c] dark:hover:border-[#f9b03c] hover:shadow-[0_30px_70px_rgba(249,176,60,0.3)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden transform md:-translate-y-4 cursor-pointer active:scale-98 flex flex-col justify-between scrolly-card scrolly-stagger-2" 
                    onClick={() => document.getElementById('ai-feature')?.scrollIntoView({behavior: 'smooth'})}
                >
                    <div className="absolute -right-10 -top-10 bg-gradient-to-br from-amber-400/20 via-primary/10 to-transparent w-48 h-48 rounded-full -z-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full shadow-md animate-pulse">
                        {t('new_badge')}
                    </div>
                    <div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/15 dark:bg-[#f9b03c]/15 text-[#f9b03c] border border-amber-400/30 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-inner relative z-10">
                            <i className="fa-solid fa-robot"></i>
                        </div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading relative z-10">
                            {t('ai_tutor_card_title') || 'የ 24/7 የግል AI መምህር'}
                        </h3>
                        <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px] relative z-10">{t('ai_integration_desc')}</p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-black text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300">
                        <span>Tsehay AI ን ይሞክሩ</span>
                        <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                    </div>
                </div>

                {/* Card 3: Accredited Certificate (Sequential Order 3 - Royal Blue & Gold) */}
                <div 
                    data-scrolly-order="3"
                    className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-200/70 dark:border-white/[0.08] hover:border-[#3268ba]/60 dark:hover:border-[#3268ba]/60 hover:shadow-[0_25px_60px_rgba(50,104,186,0.22)] hover:-translate-y-2 transition-all duration-500 group cursor-pointer active:scale-98 flex flex-col justify-between scrolly-card scrolly-stagger-3"
                    onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
                >
                    <div>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 dark:bg-[#3268ba]/15 text-[#3268ba] dark:text-[#5a93e8] border border-blue-500/20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#3268ba] group-hover:text-white transition-all duration-300 shadow-inner">
                            <i className="fa-solid fa-award"></i>
                        </div>
                        <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading">{t('cert_title')}</h3>
                        <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px]">{t('cert_desc')}</p>
                    </div>
                    <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#3268ba] dark:text-[#5a93e8] group-hover:translate-x-1.5 transition-transform duration-300">
                        <span>ሰርተፍኬት ያረጋግጡ</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                    </div>
                </div>
            </div>
        </div>
    </section>

    
    <section id="courses" className="py-20 sm:py-28 bg-slate-50/50 dark:bg-[#030509] border-b border-gray-200/80 dark:border-white/[0.06] transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f9b03c]/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#3268ba]/5 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center mb-12 sm:mb-16 gap-3 scrolly-reveal">
                <div className="inline-flex items-center gap-2 bg-amber-400/10 dark:bg-amber-400/5 border border-amber-400/20 px-4 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">FEATURED MASTERCLASSES</span>
                </div>
                <h2 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 dark:text-white">
                    {t('popular_courses')}
                </h2>
                <p className="text-gray-600 dark:text-[#8a95a5] font-body text-base sm:text-lg max-w-2xl">
                    {t('popular_courses_desc')}
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 w-full scrolly-reveal">
                    <div className="w-12 h-12 border-4 border-[#f9b03c] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase text-xs sm:text-sm">{t('loading_courses')}</p>
                </div>
            ) : courses.length === 0 ? (
                <div className="text-center py-16 w-full scrolly-reveal">
                    <i className="fa-solid fa-box-open text-5xl text-gray-300 dark:text-slate-600 mb-4"></i>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">{t('no_course_found')}</p>
                </div>
            ) : (
                <div 
                    className="grid gap-7 sm:gap-8" 
                    id="courseList"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}
                >
                    {courses.slice(0, 6).map((course, index) => (
                        <div 
                            key={course.id} 
                            data-scrolly-order={index + 1}
                            className={`bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 border border-gray-200/80 dark:border-white/[0.05] hover:border-[#f9b03c] dark:hover:border-[#f9b03c]/70 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_45px_rgba(249,176,60,0.2)] group cursor-pointer active:scale-98 scrolly-card scrolly-stagger-${(index % 3) + 1}`}
                            onClick={() => window.location.href=`/courses/${course.id}`}
                        >
                            <div>
                                {/* Thumbnail Wrapper: 100% full view, non-cropped with ambient glow */}
                                <div className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center">
                                    <img 
                                        src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                        alt="" 
                                        aria-hidden="true" 
                                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none" 
                                    />
                                    <img 
                                        src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                        alt={course.title} 
                                        className="relative z-10 w-full h-full object-contain p-2 group-hover:scale-[1.03] transition-transform duration-500" 
                                    />
                                    
                                    {/* Badges - Royal Blue / Gold only (NO GREEN) */}
                                    {(!course.isFree && course.price !== 0 && course.price !== '0' && course.price !== 'Free') ? (
                                        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                                             PREMIUM
                                        </div>
                                    ) : (
                                        <div className="absolute top-3 right-3 z-20 bg-[#3268ba]/90 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-white/20">
                                            <i className="fa-solid fa-sparkles text-[10px] text-[#f9b03c]"></i> FREE
                                        </div>
                                    )}
                                </div>

                                {/* Content Details (24px padding for breathing room) */}
                                <div className="p-6 sm:p-7">
                                    {/* Category Tag */}
                                    <span className="text-[11px] font-black uppercase tracking-wider text-[#f9b03c] inline-block mb-2">
                                        {course.category || 'DIGITAL SKILLS'}
                                    </span>

                                    {/* Title - Bold & Crisp White */}
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2.5 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading">
                                        {course.title || t('course_unknown')}
                                    </h3>

                                    {/* Instructor Info */}
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8a95a5] font-semibold mb-3.5">
                                        <i className="fa-solid fa-chalkboard-user text-[#f9b03c]"></i>
                                        <span>{course.instructor || 'Eyoub Sahle'}</span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-600 dark:text-[#a0aec0] text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5">
                                        {formatCourseDesc(course) || t('course_desc_placeholder')}
                                    </p>
                                    
                                    {/* Meta capsules */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/60 dark:border-white/[0.06]">
                                            <i className="fa-regular fa-clock text-[#f9b03c] text-[10px]"></i>
                                            <span>{course.duration || '00:50:00'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/60 dark:border-white/[0.06]">
                                            <i className="fa-solid fa-layer-group text-[#f9b03c] text-[10px]"></i>
                                            <span>{course.lessons?.length || 0} {t('course_lessons')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/60 dark:border-white/[0.06]">
                                            <i className="fa-solid fa-signal text-[#f9b03c] text-[10px]"></i>
                                            <span>{course.level || 'ጀማሪ'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price & CTA Row (Bottom) */}
                            <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between mt-auto">
                                <div>
                                    {(course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free') ? (
                                        <span className="text-xl sm:text-2xl font-black text-[#f9b03c] tracking-tight">
                                            {t('course_free') || 'ነፃ (Free)'}
                                        </span>
                                    ) : (
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {Number(course.price).toLocaleString()} {t('course_currency') || 'ብር'}
                                            </span>
                                            {course.originalPrice && (
                                                <span className="text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 line-through">
                                                    {Number(course.originalPrice).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-gray-200/80 dark:border-white/[0.08] text-slate-700 dark:text-white flex items-center justify-center group-hover:bg-[#f9b03c] group-hover:text-slate-950 group-hover:border-[#f9b03c] group-hover:rotate-[-45deg] transition-all duration-300 shadow-sm">
                                    <i className="fa-solid fa-arrow-right text-base"></i>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </section>

    
    <section id="ai-feature" className="relative py-24 lg:py-32 overflow-hidden hero-mesh text-white border-y border-white/10 scrolly-reveal">
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

    {/* YouTube Free Video Lessons Horizontal Slider */}
    <div className="scrolly-reveal">
      <YouTubeVideoSlider />
    </div>
    
    <section id="faq" className="py-16 bg-slate-50 dark:bg-darkCard border-b border-gray-200 dark:border-gray-800 transition-colors duration-300 scrolly-reveal">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <h2 className="font-heading font-black text-3xl sm:text-4xl text-dark dark:text-white mb-3">{t('faq_title')}</h2>
                <div className="w-16 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-4">
                {/* FAQ Accordion 1 (Sequential Order 1) */}
                <div data-scrolly-order="1" className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm scrolly-card scrolly-stagger-1">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer" onClick={() => setOpenFaqId(openFaqId === 1 ? null : 1)}>
                        <span className="text-dark dark:text-white text-lg flex items-center gap-3"><i className="fa-solid fa-circle-question text-primary"></i> {t('faq_q1')}</span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 transition duration-300 ${openFaqId === 1 ? 'rotate-180' : ''}`}></i>
                    </button>
                    {openFaqId === 1 && (
                        <div className="px-5 pb-5 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 font-body text-[15px]">
                            <p className="ml-7">{t('faq_a1')}</p>
                        </div>
                    )}
                </div>

                {/* FAQ Accordion 2 (Sequential Order 2) */}
                <div data-scrolly-order="2" className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm scrolly-card scrolly-stagger-2">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer" onClick={() => setOpenFaqId(openFaqId === 2 ? null : 2)}>
                        <span className="text-dark dark:text-white text-lg flex items-center gap-3"><i className="fa-solid fa-circle-question text-primary"></i> {t('faq_q2')}</span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 transition duration-300 ${openFaqId === 2 ? 'rotate-180' : ''}`}></i>
                    </button>
                    {openFaqId === 2 && (
                        <div className="px-5 pb-5 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-4 font-body text-[15px]">
                            <p className="ml-7">{t('faq_a2')}</p>
                        </div>
                    )}
                </div>

                {/* FAQ Accordion 3 (Sequential Order 3) */}
                <div data-scrolly-order="3" className="bg-white dark:bg-dark border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm scrolly-card scrolly-stagger-3">
                    <button className="w-full text-left p-5 font-bold flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer" onClick={() => setOpenFaqId(openFaqId === 3 ? null : 3)}>
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

    
    

    
    
    
    

    
    
    
    


    </main>
  );
}
