// @ts-nocheck
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Components
import Footer from '@/components/Footer';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import SmartSearchInput from '@/components/SmartSearchInput';
import YouTubeVideoSlider from '@/components/YouTubeVideoSlider';
import InstructorYouTubePortfolio from '@/components/InstructorYouTubePortfolio';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import CourseCardSkeleton from '@/components/CourseCardSkeleton';
import CoursePreviewModal from '@/components/CoursePreviewModal';
import Hero3DPopoutStage from '@/components/3d/Hero3DPopoutStage';
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import { scrollTriggerEngine } from '@/lib/scrollTriggerEngine';
import WaitlistModal from '@/components/WaitlistModal';
import TypingCoursesHeadline from '@/components/TypingCoursesHeadline';
import { 
  getCachedCourses, 
  saveCachedCourses, 
  formatCourseDesc, 
  formatDriveImageUrl, 
  getCleanCourseImage,
  getCourseSlug, 
  subscribeToCourses,
  DEFAULT_COURSES,
  getComingSoonCourses,
  ComingSoonCourse,
  formatCleanCategory
} from '@/lib/courseCache';

const PARTNER_BRANDS = [
  {
    name: 'Google',
    render: () => (
      <div className="flex items-center gap-3.5 sm:gap-4.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0 drop-shadow-md">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-heading tracking-tight drop-shadow-sm">
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
      <div className="flex items-center gap-3.5 sm:gap-4.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <i className="fa-brands fa-meta text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#0668E1] shrink-0 drop-shadow-md"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#0668E1] tracking-tight drop-shadow-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Meta
        </span>
      </div>
    )
  },
  {
    name: 'TikTok',
    render: () => (
      <div className="flex items-center gap-3.5 sm:gap-4.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <i className="fa-brands fa-tiktok text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white shrink-0 drop-shadow-md"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          TikTok
        </span>
      </div>
    )
  },
  {
    name: 'SHEIN',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-widest font-heading text-white drop-shadow-md" style={{ letterSpacing: '0.18em' }}>
          SHEIN
        </span>
      </div>
    )
  },
  {
    name: 'YouTube',
    render: () => (
      <div className="flex items-center gap-3 sm:gap-4.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <div className="w-12 h-8 sm:w-14 sm:h-10 md:w-16 md:h-12 bg-[#FF0000] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0">
          <i className="fa-solid fa-play text-white text-xs sm:text-sm md:text-base ml-0.5"></i>
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white font-heading drop-shadow-sm">
          YouTube
        </span>
      </div>
    )
  },
  {
    name: 'Shopify',
    render: () => (
      <div className="flex items-center gap-3.5 sm:gap-4.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer min-h-[52px]">
        <i className="fa-brands fa-shopify text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#95BF47] shrink-0 drop-shadow-md"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#95BF47] tracking-tight font-heading drop-shadow-sm">
          shopify
        </span>
      </div>
    )
  }
];

function MagneticLink({ children, className, href, ...props }: any) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!linkRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = linkRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.25;
    const y = (clientY - (top + height / 2)) * 0.25;
    linkRef.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  const handleMouseLeave = () => {
    if (linkRef.current) {
      linkRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  };

  return (
    <Link
      ref={linkRef}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease'
      }}
      className={className}
      {...props}
    >
      {children}
    </Link>
  );
}

export default function HomeClient({ 
  initialCourses, 
  initialLandingVideo,
  initialLandingVideoThumbnail
}: { 
  initialCourses?: any[]; 
  initialLandingVideo?: string;
  initialLandingVideoThumbnail?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { t, lang } = useLanguage();
  
  const [isMounted, setIsMounted] = useState(false);
  const [courses, setCourses] = useState<any[]>(() => {
    if (initialCourses && Array.isArray(initialCourses) && initialCourses.length > 0) {
      return initialCourses;
    }
    try {
      return getCachedCourses();
    } catch {
      return DEFAULT_COURSES;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  
  // Payment / Auth / Preview / Waitlist Modal States
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [previewModalCourse, setPreviewModalCourse] = useState<any>(null);
  const [selectedWaitlistCourse, setSelectedWaitlistCourse] = useState<ComingSoonCourse | null>(null);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [authCourseTarget, setAuthCourseTarget] = useState<any>(null);
  const [openFaqId, setOpenFaqId] = useState<number | null>(1);

  // Course Carousel Slider Ref & Navigation Handlers
  const courseSliderRef = useRef<HTMLDivElement | null>(null);
  const scrollCourses = (direction: 'left' | 'right') => {
    if (courseSliderRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      courseSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Synchronously initialize cached courses on mount & connect zero-refresh live sync
  useEffect(() => {
    setIsMounted(true);

    let artifactList: any[] = [];
    let rootList: any[] = [];

    const syncAndMerge = () => {
      let merged: any[] = [];
      if (artifactList.length > 0 || rootList.length > 0) {
        merged = mergeCoursesLists(DEFAULT_COURSES, rootList, artifactList);
      } else {
        const cached = getCachedCourses();
        merged = cached.length > 0 ? cached : DEFAULT_COURSES;
      }
      if (merged.length > 0) {
        setCourses(merged);
        saveCachedCourses(merged);
      }
      setLoading(false);
    };

    // 1. Live listener on artifacts collection
    let unsubArtifact = () => {};
    try {
      const qArtifact = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
      unsubArtifact = onSnapshot(qArtifact, (snapshot) => {
        if (!snapshot.empty) {
          artifactList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          syncAndMerge();
        }
        setLoading(false);
      }, (error) => {
        console.warn("Artifacts courses sync notice:", error);
        setLoading(false);
      });
    } catch (e) {}

    // 2. Live listener on root courses collection
    let unsubRoot = () => {};
    try {
      const qRoot = query(collection(db, 'courses'));
      unsubRoot = onSnapshot(qRoot, (snapshot) => {
        if (!snapshot.empty) {
          rootList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          syncAndMerge();
        }
        setLoading(false);
      }, (error) => {
        console.warn("Root courses sync notice:", error);
        setLoading(false);
      });
    } catch (e) {}

    // 3. Immediate HTTP fallback fetch
    fetch(`/api/courses?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          artifactList = data.courses;
          syncAndMerge();
        }
      })
      .catch(err => console.warn("API courses fetch notice:", err))
      .finally(() => setLoading(false));

    // 4. Cross-Tab Broadcast Channel & Custom Event Listeners
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tsehay_live_courses_channel');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'COURSES_UPDATED' && Array.isArray(event.data.courses)) {
            setCourses(event.data.courses);
          }
        };
      }
    } catch (e) {}

    const handleCustomCoursesUpdate = (e: any) => {
      if (e.detail?.courses && Array.isArray(e.detail.courses)) {
        setCourses(e.detail.courses);
      }
    };
    window.addEventListener('tsehay_courses_updated', handleCustomCoursesUpdate);

    return () => {
      unsubArtifact();
      unsubRoot();
      if (bc) bc.close();
      window.removeEventListener('tsehay_courses_updated', handleCustomCoursesUpdate);
    };
  }, []);

  // Seamless Slow Headline Typewriter Effect
  const headlinePhrases = [
    { white: 'ክህሎትዎን ያሳድጉ፤', gold: 'ቢዝነስዎን ዛሬውኑ ይጀምሩ።' },
    { white: 'የዩቲዩብ ቻናልዎን', gold: 'ወደ ከፍተኛ ገቢ ይቀይሩ።' },
    { white: 'የሼን እና ኢ-ኮሜርስ', gold: 'ንግድዎን በተግባር ይገንቡ።' },
    { white: 'በ AI የታገዘ ዘመናዊ', gold: 'ዲጂታል ገቢን ይፍጠሩ።' }
  ];
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [typedCharCount, setTypedCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = headlinePhrases[currentPhraseIdx];
    const fullLength = currentPhrase.white.length + currentPhrase.gold.length;

    let timer: any;
    if (!isDeleting && typedCharCount < fullLength) {
      timer = setTimeout(() => {
        setTypedCharCount(prev => prev + 1);
      }, 70); // slow smooth typing
    } else if (!isDeleting && typedCharCount >= fullLength) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 3500); // pause at completed phrase
    } else if (isDeleting && typedCharCount > 0) {
      timer = setTimeout(() => {
        setTypedCharCount(prev => prev - 1);
      }, 35); // quick deletion
    } else if (isDeleting && typedCharCount === 0) {
      setIsDeleting(false);
      setCurrentPhraseIdx(prev => (prev + 1) % headlinePhrases.length);
    }

    return () => clearTimeout(timer);
  }, [typedCharCount, isDeleting, currentPhraseIdx]);

  const activePhrase = headlinePhrases[currentPhraseIdx];
  const whiteLength = activePhrase.white.length;
  const typedWhite = activePhrase.white.slice(0, Math.min(typedCharCount, whiteLength));
  const typedGold = typedCharCount > whiteLength 
    ? activePhrase.gold.slice(0, typedCharCount - whiteLength)
    : '';

  // Enhanced 3D Scroll Trigger Orchestrator
  useEffect(() => {
    scrollTriggerEngine.init({
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px'
    });

    return () => {
      scrollTriggerEngine.cleanup();
    };
  }, []);

  useEffect(() => {
    if (courses.length > 0) {
      scrollTriggerEngine.refresh();
    }
  }, [courses.length]);

  // Seamless Post-Login Action Continuity: Automatically resume Buy/Enroll
  useEffect(() => {
    const handleResume = () => {
      if (user && courses.length > 0) {
        try {
          const savedRaw = sessionStorage.getItem('tsehay_pending_course_action') || sessionStorage.getItem('tsehay_pending_action');
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            const found = courses.find((c: any) => c.id === saved.courseId) || saved.course;
            if (found) {
              sessionStorage.removeItem('tsehay_pending_course_action');
              sessionStorage.removeItem('tsehay_pending_action');
              setShowRequireAuthModal(false);
              setAuthCourseTarget(null);
              openPaymentModal(found);
            }
          }
        } catch (e) {
          console.warn("Error restoring pending course action:", e);
        }
      }
    };

    handleResume();
    window.addEventListener('tsehay_resume_pending_action', handleResume);
    window.addEventListener('tsehay_auth_state_changed', handleResume);
    return () => {
      window.removeEventListener('tsehay_resume_pending_action', handleResume);
      window.removeEventListener('tsehay_auth_state_changed', handleResume);
    };
  }, [user, courses]);

  const openPaymentModal = async (course: any) => {
    const isFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;
    
    if (isFree) {
      if (!user) {
        try {
          sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
            type: 'enroll_free',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/'
          }));
          sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
            type: 'enroll_free',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/'
          }));
        } catch (e) {}
        setAuthCourseTarget(course);
        setShowRequireAuthModal(true);
        return;
      }

      setIsEnrolling(true);
      try {
        // Direct resilient client-side Firestore registration
        try {
          const purchaseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
          await setDoc(purchaseRef, {
            courseId: course.id,
            amount: 0,
            paymentMethod: 'free',
            purchasedAt: serverTimestamp(),
            status: 'active'
          }, { merge: true });
        } catch (dbErr) {
          console.warn("Client Firestore write attempt:", dbErr);
        }

        try {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(course));
          if (course.lessons && course.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify({ ...course.lessons[0], moduleIndex: 0, lessonIndex: 0 }));
          }
        } catch (e) {}

        // Notify backend API in background
        try {
          const idToken = await user.getIdToken();
          fetch('/api/enroll-free', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ courseId: course.id })
          }).catch(() => {});
        } catch (authErr) {}

        const targetUrl = `/dashboard?view=classroom&courseId=${encodeURIComponent(course.id)}&lesson=0`;
        if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        } else {
          router.push(targetUrl);
        }
      } catch (err: any) {
         console.error("Free enrollment failed:", err);
         const targetUrl = `/dashboard?view=classroom&courseId=${encodeURIComponent(course.id)}&lesson=0`;
         if (typeof window !== 'undefined') {
           window.location.href = targetUrl;
         } else {
           router.push(targetUrl);
         }
      } finally {
         setIsEnrolling(false);
      }
    } else {
      if (!user) {
        try {
          sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
            type: 'buy',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/'
          }));
          sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
            type: 'buy_course',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/'
          }));
        } catch (e) {}
        setAuthCourseTarget(course);
        setShowRequireAuthModal(true);
        return;
      }
      setSelectedCourse(course);
    }
  };

  const closePaymentModal = () => {
    setSelectedCourse(null);
  };

  return (
    <main className="relative bg-[#030509] text-white min-h-screen selection:bg-[#f9b03c]/30 selection:text-[#f9b03c]">
      
      {/* =========================================================================
          1. HERO SECTION (100vh Full Viewport Cinematic Terafab Standard)
         ========================================================================= */}
      <section className="terafab-hero-container min-h-screen min-h-[100dvh] relative flex flex-col justify-center items-center overflow-hidden border-b border-white/[0.08]" id="home">
        {/* Full-Cover Background with Continuous Ken Burns + Parallax */}
        <div 
          className="terafab-hero-bg" 
          style={{ backgroundImage: "url('/assets/hero-bg-new.jpg')" }}
        ></div>
        
        {/* Deep Void Black Vignette */}
        <div className="terafab-hero-vignette"></div>

        {/* Ambient Glow Spheres (Golden Yellow & Royal Blue) */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#f9b03c]/15 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[650px] h-[650px] bg-[#3268ba]/20 rounded-full blur-[160px] pointer-events-none"></div>

        {/* Hero Content Container - Cinematic Centered Hierarchy */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 relative z-20 py-16 lg:py-24 w-full my-auto flex flex-col items-center text-center">
          
          {/* Top Slogan Badge: Glowing Golden Yellow Border */}
          <div className="inline-flex items-center gap-2.5 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-[#030509]/80 border border-[#f9b03c]/60 backdrop-blur-2xl mb-5 sm:mb-6 shadow-[0_0_35px_rgba(249,176,60,0.4)] hover:shadow-[0_0_50px_rgba(249,176,60,0.65)] transition-all duration-300 hover:scale-105 group">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_12px_#f9b03c] animate-pulse"></span>
            <span className="text-sm sm:text-base md:text-lg font-black font-heading tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-[#ffe082] to-[#f9b03c] drop-shadow-[0_0_16px_rgba(249,176,60,0.5)]">
              {lang === 'en' ? 'LEARN • APPLY • GROW' : 'ተማር ፣ ተግብር ፣ እደግ'}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_12px_#f9b03c] animate-pulse"></span>
          </div>

          {/* Main Cinematic Typewriter Headline with Continuous Glow Pulse */}
          <h1 
            className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-[76px] tracking-tight leading-[1.15] sm:leading-[1.1] text-white mb-4 sm:mb-5 min-h-[90px] sm:min-h-[140px] max-w-4xl headline-glow-pulse"
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            <span>{typedWhite}</span>{' '}
            <span className="relative inline-block mt-1 sm:mt-0">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-[#ffc66b] to-yellow-400 drop-shadow-[0_0_35px_rgba(249,176,60,0.4)]">
                {typedGold}
              </span>
              <span className="absolute -bottom-2 left-0 w-full h-3 bg-gradient-to-r from-[#f9b03c]/30 to-transparent blur-xs -z-0"></span>
            </span>
            <span className="inline-block w-[3px] sm:w-[5px] h-[0.85em] bg-[#f9b03c] animate-pulse ml-2 align-middle rounded-full shadow-[0_0_12px_#f9b03c]"></span>
          </h1>

          {/* Subheadline */}
          <p className="text-gray-300 dark:text-[#a0aec0] font-body text-base sm:text-lg md:text-xl max-w-3xl font-normal leading-relaxed mb-6 sm:mb-8">
            በኢትዮጵያ የኦንላይን ክህሎት ስልጠና ቀዳሚ ፕላትፎርም። በተግባር እና በ AI የታገዘ ስልጠና ወስደው ቢዝነስዎን ዛሬውኑ ይጀምሩ።
          </p>

          {/* 🌟 1. HERO VIDEO ENHANCEMENT: Perfectly integrated below headline, spanning wide, central */}
          <div className="w-full flex items-center justify-center my-4 sm:my-6">
            <Hero3DPopoutStage videoSrc={initialLandingVideo} initialThumbnail={initialLandingVideoThumbnail} />
          </div>

          {/* Global Search Bar with Pulsing Glow Border */}
          <div className="w-full max-w-xl my-6 sm:my-8 p-0.5 rounded-2xl search-border-pulse border border-[#f9b03c]/40 bg-black/40 backdrop-blur-xl">
            <SmartSearchInput 
              placeholder="ኮርሶችን፣ አስተማሪዎችን ወይም ርዕሶችን ይፈልጉ (ለምሳሌ: Shein, YouTube...)"
              onSelectCourse={(course) => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
            />
          </div>

          {/* Action Buttons (Primary & Secondary) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto">
            {/* Primary CTA: Explore Courses (Scale 1.05 + Sliding Arrow) */}
            <MagneticLink 
              href="#courses"
              className="w-full sm:w-auto px-8 sm:px-9 py-4 rounded-2xl terafab-btn-primary flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.45)] hover:shadow-[0_0_45px_rgba(249,176,60,0.7)] group hover:scale-105 transition-all duration-300"
            >
              <span className="font-black">ኮርሶችን ያስሱ</span>
              <i className="fa-solid fa-arrow-right text-sm transition-transform duration-300 group-hover:translate-x-2"></i>
            </MagneticLink>

            {/* Secondary CTA: About Us with Glassmorphism + Glowing Play Icon */}
            <MagneticLink 
              href="/about"
              className="w-full sm:w-auto px-8 sm:px-9 py-4 rounded-2xl terafab-btn-glass flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer hover:border-[#f9b03c]/80 group transition-all duration-300 hover:scale-105 backdrop-blur-[15px] bg-white/[0.05] border border-white/15"
            >
              <i className="fa-solid fa-play text-xs text-white/80 group-hover:text-[#f9b03c] transition-colors duration-300 drop-shadow-[0_0_8px_rgba(249,176,60,0.6)]"></i>
              <span className="font-bold">ስለ እኛ ይመልከቱ</span>
            </MagneticLink>
          </div>

          {/* Social Proof Live Counter Strip */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8 sm:pt-10 mt-6 border-t border-white/10 w-full max-w-xl">
            <div className="text-center">
              <h4 className="font-heading font-black text-2xl sm:text-3xl text-white">530+</h4>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">የሰለጠኑ ተማሪዎች</p>
            </div>
            <div className="text-center border-x border-white/10 px-2">
              <h4 className="font-heading font-black text-2xl sm:text-3xl text-[#f9b03c]">4.9 / 5</h4>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">የተማሪዎች እርካታ</p>
            </div>
            <div className="text-center">
              <h4 className="font-heading font-black text-2xl sm:text-3xl text-white">100%</h4>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">ተግባራዊ ስልጠና</p>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          2. TRUST LOGO MARQUEE (Synthesia Style)
         ========================================================================= */}
      <section className="py-10 sm:py-14 bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.08] relative z-20 overflow-hidden select-none scrolly-reveal">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-3 bg-[#3268ba]/20 border border-[#3268ba]/40 rounded-full px-6 py-2.5 shadow-lg backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] animate-pulse shadow-[0_0_10px_#f9b03c]"></span>
            <p className="font-heading text-[#f9b03c] font-black tracking-widest text-xs sm:text-sm uppercase drop-shadow-sm">
              ከ 500+ በላይ ተማሪዎች እና ታላላቅ ተቋማት የታመነ
            </p>
          </div>
        </div>

        {/* Pure Brand Logos Infinite Marquee Strip */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] py-3 sm:py-4">
          <div className="flex w-max items-center gap-16 sm:gap-24 md:gap-32 animate-marquee hover:[animation-play-state:paused]">
            {[...PARTNER_BRANDS, ...PARTNER_BRANDS].map((partner, index) => (
              <div 
                key={`${partner.name}-${index}`}
                className="shrink-0 flex items-center justify-center opacity-85 hover:opacity-100 transition-all duration-300 transform hover:scale-105"
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

      {/* =========================================================================
          3. WHY CHOOSE US / "የእኛ ልዩነት" (3 Glassmorphism Cards with Staggered Pop-up)
         ========================================================================= */}
      <section id="features" className="py-24 relative overflow-hidden bg-transparent border-b border-white/[0.08] transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#f9b03c]/10 rounded-full blur-[130px]"></div>
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-[#3268ba]/10 rounded-full blur-[130px]"></div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20 scrolly-reveal">
            <div className="inline-flex items-center gap-2 bg-[#f9b03c]/10 border border-[#f9b03c]/25 px-4 py-1.5 rounded-full mb-4">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">THE TSEHAY DIFFERENCE</span>
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-5xl text-white mb-4">
              የእኛ <span className="text-[#f9b03c]">ልዩነት</span>
            </h2>
            <div className="w-20 h-1.5 bg-[#f9b03c] mx-auto rounded-full shadow-[0_0_12px_#f9b03c]"></div>
            <p className="mt-5 text-[#a0aec0] font-body text-base sm:text-lg">
              ከሌሎች የኦንላይን መማሪያ መድረኮች በምን እንለያለን?
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            
            {/* Card 1: 100% Practical Training (Golden Yellow) - Stagger 1 */}
            <Tilt3DCard 
              maxTilt={12} 
              perspective={1000}
              onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
              className="cursor-pointer scrolly-card delay-1"
            >
              <div 
                data-scrolly-order="1"
                className="h-full rounded-3xl p-8 sm:p-10 flex flex-col justify-between group bg-[#0a0e17]/90 backdrop-blur-2xl border border-[#f9b03c]/35 hover:border-[#f9b03c]/80 shadow-[0_15px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(249,176,60,0.18)] hover:shadow-[0_20px_50px_rgba(249,176,60,0.35)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#f9b03c]/15 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/40 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_20px_rgba(249,176,60,0.2)]"
                    style={{ transform: 'translateZ(35px)' }}
                  >
                    <i className="fa-solid fa-laptop-code"></i>
                  </div>
                  <h3 className="font-black text-xl sm:text-2xl text-white mb-3 sm:mb-4 font-heading" style={{ transform: 'translateZ(25px)' }}>
                    100% የተግባር ስልጠና
                  </h3>
                  <p className="text-[#a0aec0] font-body leading-relaxed text-sm sm:text-[15px]" style={{ transform: 'translateZ(15px)' }}>
                    በባዶ ቲዎሪ ሳይሆን፣ ገበያ ላይ ወዲያውኑ ገቢ የሚያስገኙ በተግባር የተፈተኑ ስልጠናዎች።
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300 relative z-10" style={{ transform: 'translateZ(20px)' }}>
                  <span>ተጨማሪ ዝርዝር</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </div>
              </div>
            </Tilt3DCard>

            {/* Card 2: 24/7 Personal AI Tutor (Featured Center Glow Card - Golden Yellow + Royal Blue) - Stagger 2 */}
            <Tilt3DCard 
              maxTilt={15}
              scale={1.03}
              perspective={1000}
              glare={true}
              onClick={() => router.push('/ai')}
              className="cursor-pointer scrolly-card delay-2"
            >
              <div 
                data-scrolly-order="2"
                className="h-full rounded-3xl p-8 sm:p-10 border-2 border-[#f9b03c]/75 hover:border-[#f9b03c] bg-[#0c121f]/95 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(249,176,60,0.4)] relative overflow-hidden flex flex-col justify-between group transition-all duration-300"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="absolute -right-10 -top-10 bg-gradient-to-br from-[#f9b03c]/25 via-[#3268ba]/20 to-transparent w-48 h-48 rounded-full -z-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none blur-xl"></div>
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full shadow-md animate-pulse" style={{ transform: 'translateZ(40px)' }}>
                  አዲስ
                </div>
                <div className="relative z-10">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-[0_0_25px_rgba(249,176,60,0.35)] relative z-10"
                    style={{ transform: 'translateZ(45px)' }}
                  >
                    <i className="fa-solid fa-robot"></i>
                  </div>
                  <h3 className="font-black text-xl sm:text-2xl text-white mb-3 sm:mb-4 font-heading relative z-10" style={{ transform: 'translateZ(30px)' }}>
                    የ 24/7 የግል AI መምህር
                  </h3>
                  <p className="text-slate-300 font-body leading-relaxed text-sm sm:text-[15px] relative z-10" style={{ transform: 'translateZ(20px)' }}>
                    በማንኛውም ሰዓት ከጎንዎ ሆኖ ጥያቄዎችዎን የሚመልስ እና የሚያማክር የ AI ረዳት (Tsehay AI)።
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-black text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300 relative z-10" style={{ transform: 'translateZ(25px)' }}>
                  <span>Tsehay AI ን ይሞክሩ</span>
                  <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </div>
              </div>
            </Tilt3DCard>

            {/* Card 3: Accredited Certificate (Royal Blue - NO GREEN) - Stagger 3 */}
            <Tilt3DCard 
              maxTilt={12}
              perspective={1000}
              onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
              className="cursor-pointer scrolly-card delay-3"
            >
              <div 
                data-scrolly-order="3"
                className="h-full rounded-3xl p-8 sm:p-10 flex flex-col justify-between group bg-[#080d1a]/90 backdrop-blur-2xl border border-[#3268ba]/45 hover:border-[#3268ba]/90 shadow-[0_15px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(50,104,186,0.22)] hover:shadow-[0_20px_50px_rgba(50,104,186,0.45)] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#3268ba]/20 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-[#3268ba]/20 text-[#3268ba] border border-[#3268ba]/40 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#3268ba] group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(50,104,186,0.3)]"
                    style={{ transform: 'translateZ(35px)' }}
                  >
                    <i className="fa-solid fa-award"></i>
                  </div>
                  <h3 className="font-black text-xl sm:text-2xl text-white mb-3 sm:mb-4 font-heading" style={{ transform: 'translateZ(25px)' }}>
                    እውቅና ያለው ሰርተፍኬት
                  </h3>
                  <p className="text-[#a0aec0] font-body leading-relaxed text-sm sm:text-[15px]" style={{ transform: 'translateZ(15px)' }}>
                    ትምህርትዎን እንዳጠናቀቁ፣ ክህሎትዎን የሚያረጋግጥ ዲጂታል ሰርተፍኬት።
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#3268ba] group-hover:text-[#5a93e8] group-hover:translate-x-1.5 transition-transform duration-300 relative z-10" style={{ transform: 'translateZ(20px)' }}>
                  <span>ሰርተፍኬት ያረጋግጡ</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </div>
              </div>
            </Tilt3DCard>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. POPULAR COURSES / "በብዛት የሚፈለጉ ኮርሶች" (Sleek CSS Horizontal Carousel)
         ========================================================================= */}
      <section id="courses" className="relative overflow-hidden bg-transparent border-b border-white/[0.08] py-16 sm:py-24">
        {/* Atmospheric Aura & Cyber Mesh */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[700px] h-[700px] bg-gradient-to-bl from-[#f9b03c]/15 via-transparent to-transparent rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] bg-gradient-to-tr from-[#3268ba]/20 via-transparent to-transparent rounded-full blur-[150px]"></div>
        </div>

        <div className="relative z-10 w-full">
          {/* Section Stationary Header */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
            <div className="scrolly-reveal">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400/15 via-[#f9b03c]/10 to-[#3268ba]/15 border border-[#f9b03c]/30 px-5 py-2 rounded-full shadow-[0_0_25px_rgba(249,176,60,0.2)] backdrop-blur-md mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-ping"></span>
                <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">FEATURED MASTERCLASSES</span>
              </div>
              <h2 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
                <TypingCoursesHeadline text="በብዛት የሚፈለጉ ኮርሶች" />
              </h2>
              <div className="w-28 h-1.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent rounded-full shadow-[0_0_15px_rgba(249,176,60,0.8)] mt-2"></div>
            </div>
          </div>

          {(!isMounted || (loading && courses.length === 0)) ? (
            <div className="max-w-[1300px] mx-auto px-4 w-full scrolly-reveal">
              <CourseCardSkeleton count={3} />
            </div>
          ) : (
            /* Horizontal Carousel Container with Centered Glassmorphism Navigation Arrows */
            <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 group/carousel">
              {/* Centered Left Navigation Arrow (Glassmorphism & Subtle Golden Glow) */}
              <button
                type="button"
                onClick={() => scrollCourses('left')}
                className="flex absolute left-2 sm:left-4 lg:left-2 xl:-left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-[#0a0e17]/85 hover:bg-[#0c121e] border border-white/20 hover:border-[#f9b03c] text-white hover:text-[#f9b03c] shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_15px_rgba(249,176,60,0.12)] hover:shadow-[0_0_25px_rgba(249,176,60,0.6),0_0_50px_rgba(249,176,60,0.25)] backdrop-blur-2xl items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer opacity-90 hover:opacity-100 group/btn"
                title="ቀዳሚ ኮርሶች (Previous)"
                aria-label="Previous courses"
              >
                <i className="fa-solid fa-chevron-left text-sm sm:text-base group-hover/btn:-translate-x-0.5 transition-transform"></i>
              </button>

              {/* Centered Right Navigation Arrow (Glassmorphism & Subtle Golden Glow) */}
              <button
                type="button"
                onClick={() => scrollCourses('right')}
                className="flex absolute right-2 sm:right-4 lg:right-2 xl:-right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-[#0a0e17]/85 hover:bg-[#0c121e] border border-white/20 hover:border-[#f9b03c] text-white hover:text-[#f9b03c] shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_15px_rgba(249,176,60,0.12)] hover:shadow-[0_0_25px_rgba(249,176,60,0.6),0_0_50px_rgba(249,176,60,0.25)] backdrop-blur-2xl items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer opacity-90 hover:opacity-100 group/btn"
                title="ቀጣይ ኮርሶች (Next)"
                aria-label="Next courses"
              >
                <i className="fa-solid fa-chevron-right text-sm sm:text-base group-hover/btn:translate-x-0.5 transition-transform"></i>
              </button>

              {/* Scrollable Horizontal Track */}
              <div 
                ref={courseSliderRef}
                className="flex items-stretch gap-6 sm:gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-1 scrollbar-none no-scrollbar select-none will-change-transform"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {[...courses, ...getComingSoonCourses().map(c => ({ ...c, isComingSoon: true }))].slice(0, 8).map((course, index) => {
                  const isComingSoon = Boolean(course.isComingSoon || course.status === 'Coming Soon');
                  const isFree = !isComingSoon && (course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free');

                  return (
                    <div 
                      key={course.id} 
                      className="w-[310px] sm:w-[370px] md:w-[400px] shrink-0 snap-start course-popup-card"
                    >
                      <Tilt3DCard
                        maxTilt={10}
                        scale={1.02}
                        perspective={1100}
                        glare={true}
                        onClick={() => {
                          if (isComingSoon) {
                            setSelectedWaitlistCourse(course);
                            setIsWaitlistModalOpen(true);
                          } else {
                            router.push(`/courses/${getCourseSlug(course) || course.id}`);
                          }
                        }}
                        className="cursor-pointer group h-full"
                      >
                        <div 
                          data-scrolly-order={index + 1}
                          className={`h-full rounded-3xl backdrop-blur-[20px] bg-[#0a0e17]/85 border border-white/[0.08] hover:border-[#f9b03c]/70 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(249,176,60,0.08)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.35)] overflow-hidden flex flex-col justify-between relative select-none transition-all duration-500 ease-out ${
                            isComingSoon ? 'border-[#f9b03c]/40 hover:border-[#f9b03c]' : ''
                          }`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          <div>
                            {/* Thumbnail with 3D Z-Popout */}
                            <div 
                              className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center m-0"
                              style={{ transform: 'translateZ(30px)' }}
                            >
                              <img 
                                src={getCleanCourseImage(course) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                alt="" 
                                aria-hidden="true" 
                                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none" 
                              />
                              <img 
                                src={getCleanCourseImage(course) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                alt={course.title} 
                                className="relative z-10 w-full h-full object-contain p-2 group-hover:scale-[1.04] transition-transform duration-500" 
                              />
                              
                              {/* Floating Popout Badges */}
                              {isComingSoon ? (
                                <div 
                                  className="absolute top-3.5 right-3.5 z-20 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-400 text-slate-950 text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_15px_rgba(249,176,60,0.55)] border border-amber-200/60 animate-pulse" 
                                  style={{ transform: 'translateZ(45px)' }}
                                >
                                  <i className="fa-solid fa-hourglass-half text-[10px]"></i>
                                  <span>በቅርቡ (Coming Soon)</span>
                                </div>
                              ) : !isFree ? (
                                <div 
                                  className="absolute top-3.5 right-3.5 z-20 bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_15px_rgba(249,176,60,0.5)] border border-amber-200/50" 
                                  style={{ transform: 'translateZ(45px)' }}
                                >
                                  <i className="fa-solid fa-crown text-[10px]"></i> PREMIUM
                                </div>
                              ) : (
                                <div 
                                  className="absolute top-3.5 right-3.5 z-20 bg-[#3268ba] text-white text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_15px_rgba(50,104,186,0.6)] backdrop-blur-md border border-white/25" 
                                  style={{ transform: 'translateZ(45px)' }}
                                >
                                  <i className="fa-solid fa-sparkles text-[10px] text-[#f9b03c]"></i> FREE
                                </div>
                              )}

                              {/* Category Badge */}
                              {(course.category || course.tag) && (
                                <div 
                                  className="absolute bottom-3.5 left-3.5 z-20 bg-[#030509]/90 backdrop-blur-md text-[#f9b03c] border border-[#f9b03c]/30 text-[10.5px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md"
                                  style={{ transform: 'translateZ(40px)' }}
                                >
                                  {formatCleanCategory(course.category || course.tag)}
                                </div>
                              )}
                            </div>

                            {/* Content Details */}
                            <div className="p-6 sm:p-7">
                              <h3 
                                className="text-xl sm:text-2xl font-black text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading cursor-pointer"
                                style={{ transform: 'translateZ(25px)' }}
                              >
                                {course.title || 'የፀሐይ ካምፓስ ስልጠና'}
                              </h3>

                              {/* Instructor & Rating */}
                              <div 
                                className="flex items-center justify-between gap-2 mb-3.5"
                                style={{ transform: 'translateZ(22px)' }}
                              >
                                <div className="flex items-center gap-2 text-xs text-[#8a95a5] font-semibold">
                                  <div className="w-6 h-6 rounded-full bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-[11px]">
                                    <i className="fa-solid fa-chalkboard-user"></i>
                                  </div>
                                  <span>{course.instructor || 'Eyoub Sahle'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#f9b03c]/25 via-amber-500/20 to-[#f9b03c]/15 text-[#f9b03c] font-black px-3 py-1 rounded-full text-xs sm:text-sm border border-[#f9b03c]/50 shadow-[0_0_15px_rgba(249,176,60,0.35)] backdrop-blur-md">
                                  {isComingSoon ? (
                                    <>
                                      <i className="fa-solid fa-hourglass-half text-xs text-[#f9b03c]"></i>
                                      <span className="font-black tracking-wide">{course.highlightBadge || 'Coming Soon'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-star text-xs text-[#f9b03c] drop-shadow-[0_0_6px_#f9b03c]"></i>
                                      <span className="font-black text-[#f9b03c] tracking-wide">★ {course.ratingAvg || '4.9'}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              <p 
                                className="text-[#a0aec0] text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5 font-body"
                                style={{ transform: 'translateZ(15px)' }}
                              >
                                {formatCourseDesc(course)}
                              </p>
                              
                              {/* Meta Capsules */}
                              <div 
                                className="flex flex-wrap gap-2 mb-2"
                                style={{ transform: 'translateZ(20px)' }}
                              >
                                <div className="flex items-center gap-1.5 bg-white/[0.05] text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                  <i className="fa-regular fa-clock text-[#f9b03c] text-[10px]"></i>
                                  <span>{course.duration || '6+ ሰዓታት'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/[0.05] text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                  <i className="fa-solid fa-layer-group text-[#f9b03c] text-[10px]"></i>
                                  <span>{course.lessons?.length ? `${course.lessons.length} ትምህርቶች` : 'የተሟላ ሞጁል'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/[0.05] text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                  <i className="fa-solid fa-signal text-[#f9b03c] text-[10px]"></i>
                                  <span>{course.level || 'ጀማሪ እና መካከለኛ'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Price & CTA Row (Bottom) */}
                          <div 
                            className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 mt-auto bg-white/[0.01]"
                            style={{ transform: 'translateZ(32px)' }}
                          >
                            <div>
                              {isComingSoon ? (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">ሁኔታ</span>
                                  <span className="text-sm sm:text-base font-black text-[#f9b03c] tracking-tight flex items-center gap-1.5">
                                    <i className="fa-solid fa-sparkles text-xs"></i> {course.expectedDate || 'በቅርቡ'}
                                  </span>
                                </div>
                              ) : isFree ? (
                                <span className="text-xl sm:text-2xl font-black text-[#f9b03c] tracking-tight">
                                  ነፃ (Free)
                                </span>
                              ) : (
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    {Number(course.price).toLocaleString()} ብር
                                  </span>
                                  {course.oldPrice && (
                                    <span className="text-xs sm:text-sm font-medium text-gray-500 line-through">
                                      {Number(course.oldPrice).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isComingSoon ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWaitlistCourse(course);
                                    setIsWaitlistModalOpen(true);
                                  }}
                                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-xs flex items-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(249,176,60,0.4)] hover:shadow-[0_0_30px_rgba(249,176,60,0.6)] transition-all cursor-pointer active:scale-95 group"
                                >
                                  <i className="fa-solid fa-bell text-xs group-hover:rotate-12 transition-transform"></i>
                                  <span>ተጠባባቂ ዝርዝር ውስጥ ግባ</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewModalCourse(course);
                                    }}
                                    className="bg-white/[0.05] hover:bg-white/10 text-white text-xs font-bold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition border border-white/10 flex items-center gap-1.5 cursor-pointer hover:border-[#f9b03c]/40 active:scale-95"
                                    title="ማስተዋወቂያ ቪዲዮ ይመልከቱ"
                                  >
                                    <i className="fa-solid fa-play text-[#f9b03c]"></i>
                                    <span>ይመልከቱ</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPaymentModal(course);
                                    }}
                                    disabled={isEnrolling}
                                    className="btn-shimmer-interactive px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all text-xs cursor-pointer active:scale-95 disabled:opacity-50 group font-black shadow-lg"
                                  >
                                    {isFree ? (
                                      <>{isEnrolling ? 'እባክዎ ይጠብቁ...' : 'በነፃ ይጀምሩ'} <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
                                    ) : (
                                      <>አሁኑኑ ይግዙ <i className="fa-solid fa-cart-shopping buy-icon-animated group-hover:scale-110 group-hover:-rotate-6 transition-transform"></i></>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Tilt3DCard>
                    </div>
                  );
                })}

                {/* Final Deck Card: Explore All Courses */}
                <div className="w-[300px] sm:w-[350px] shrink-0 snap-start flex items-center justify-center">
                  <Link 
                    href="/courses"
                    className="w-full h-[85%] rounded-3xl border-2 border-dashed border-[#f9b03c]/50 hover:border-[#f9b03c] bg-[#0c121f]/75 hover:bg-[#0c121f]/95 backdrop-blur-[16px] p-8 flex flex-col items-center justify-center text-center group transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(249,176,60,0.2)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.45)] hover:scale-105"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center text-2xl font-black mb-4 shadow-[0_0_25px_rgba(249,176,60,0.5)] group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </div>
                    <h3 className="text-xl font-black text-white font-heading mb-2">
                      ሁሉንም ኮርሶች ያስሱ
                    </h3>
                    <p className="text-xs text-slate-300">
                      የእርስዎን የንግድ እና የቴክኖሎጂ ችሎታ የሚያሳድጉ ተጨማሪ ስልጠናዎች
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          )}


        </div>
      </section>

      {/* =========================================================================
          6. FREE LESSONS VIDEO SLIDER
         ========================================================================= */}
      <div className="scrolly-reveal">
        <YouTubeVideoSlider />
      </div>

      {/* =========================================================================
          7. INSTRUCTOR YOUTUBE PORTFOLIO (2-Column Terafab Glassmorphism Section)
         ========================================================================= */}
      <div className="scrolly-reveal">
        <InstructorYouTubePortfolio />
      </div>
      
      {/* =========================================================================
          8. LIVE EVENTS & WORKSHOPS
         ========================================================================= */}
      <div className="scrolly-reveal">
        <UpcomingEventsSection />
      </div>
      
      {/* =========================================================================
          9. FAQ ACCORDION ("ብዙ ጊዜ የሚነሱ ጥያቄዎች")
         ========================================================================= */}
      <section id="faq" className="py-20 bg-transparent border-b border-white/[0.08] transition-colors duration-300 scrolly-reveal relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#f9b03c]/5 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#3268ba]/5 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#f9b03c]/10 border border-[#f9b03c]/25 px-4 py-1.5 rounded-full mb-3">
              <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">HELP & FAQ</span>
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-white mb-3">
              ብዙ ጊዜ የሚነሱ <span className="text-[#f9b03c]">ጥያቄዎች</span>
            </h2>
            <div className="w-16 h-1.5 bg-[#f9b03c] mx-auto rounded-full shadow-[0_0_10px_#f9b03c]"></div>
          </div>
          
          <div className="space-y-4">
            {/* FAQ 1 */}
            <div className="terafab-glass-card rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                type="button"
                className="w-full text-left p-5 sm:p-6 font-bold flex justify-between items-center transition cursor-pointer hover:bg-white/[0.02]" 
                onClick={() => setOpenFaqId(openFaqId === 1 ? null : 1)}
              >
                <span className="text-white text-base sm:text-lg flex items-center gap-3 font-heading font-black">
                  <i className="fa-solid fa-circle-question text-[#f9b03c]"></i>
                  ስልጠናዎቹን በኦንላይን ነው ወይስ በአካል የምንከታተለው?
                </span>
                <i className={`fa-solid fa-chevron-down text-[#f9b03c] transition-transform duration-300 ${openFaqId === 1 ? 'rotate-180' : ''}`}></i>
              </button>
              {openFaqId === 1 && (
                <div className="px-5 sm:px-6 pb-6 text-[#a0aec0] border-t border-white/[0.06] pt-4 font-body text-sm sm:text-[15px] leading-relaxed">
                  <p className="ml-8">
                    ስልጠናዎቻችንን በማንኛውም ሰዓት እና ቦታ በስልክዎ ወይም በኮምፒውተርዎ መከታተል እንዲችሉ በቪዲዮ እና በ AI ድጋፍ የተሟሉ ሆነው ተዘጋጅተዋል። በተጨማሪም የካምፓሳችን አባል በመሆን በየጊዜው በአካል (In-Person) በሚሰጡ የተግባር ወርክሾፖች እና የልምድ ልውውጦች ላይ በቀጥታ ይሳተፋሉ!
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="terafab-glass-card rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                type="button"
                className="w-full text-left p-5 sm:p-6 font-bold flex justify-between items-center transition cursor-pointer hover:bg-white/[0.02]" 
                onClick={() => setOpenFaqId(openFaqId === 2 ? null : 2)}
              >
                <span className="text-white text-base sm:text-lg flex items-center gap-3 font-heading font-black">
                  <i className="fa-solid fa-circle-question text-[#f9b03c]"></i>
                  ትምህርቱን ስጨርስ ሰርተፍኬት አገኛለሁ?
                </span>
                <i className={`fa-solid fa-chevron-down text-[#f9b03c] transition-transform duration-300 ${openFaqId === 2 ? 'rotate-180' : ''}`}></i>
              </button>
              {openFaqId === 2 && (
                <div className="px-5 sm:px-6 pb-6 text-[#a0aec0] border-t border-white/[0.06] pt-4 font-body text-sm sm:text-[15px] leading-relaxed">
                  <p className="ml-8">
                    አዎ፣ በእርግጥ! እያንዳንዱን ኮርስ እንዳጠናቀቁ በስምዎ የተዘጋጀ፣ በልዩ QR ኮድ እና የማረጋገጫ መለያ የተረጋገጠ ዲጂታል ሰርተፍኬት (Certificate of Completion) ወዲያውኑ ይሰጥዎታል። ሰርተፍኬቱን በቀላሉ ማውረድ ወይም ለስራ ማመልከቻ ማጋራት ይችላሉ።
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="terafab-glass-card rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                type="button"
                className="w-full text-left p-5 sm:p-6 font-bold flex justify-between items-center transition cursor-pointer hover:bg-white/[0.02]" 
                onClick={() => setOpenFaqId(openFaqId === 3 ? null : 3)}
              >
                <span className="text-white text-base sm:text-lg flex items-center gap-3 font-heading font-black">
                  <i className="fa-solid fa-circle-question text-[#f9b03c]"></i>
                  የ "Tsehay AI" ረዳቱን ለመጠቀም ተጨማሪ ክፍያ አለው?
                </span>
                <i className={`fa-solid fa-chevron-down text-[#f9b03c] transition-transform duration-300 ${openFaqId === 3 ? 'rotate-180' : ''}`}></i>
              </button>
              {openFaqId === 3 && (
                <div className="px-5 sm:px-6 pb-6 text-[#a0aec0] border-t border-white/[0.06] pt-4 font-body text-sm sm:text-[15px] leading-relaxed">
                  <p className="ml-8">
                    በፍጹም! የ Tsehay AI ረዳት በካምፓሳችን ውስጥ ለሚገኙ ሁሉም ተማሪዎች በነፃ የተካተተ ነው። 24/7 ከጎንዎ ሆኖ ጥያቄዎችዎን ይመልሳል፣ የቢዝነስ ስትራቴጂዎችን ይነድፋል እንዲሁም ያማክርዎታል። ምንም ዓይነት ተጨማሪ ወርሃዊ ክፍያ የለውም።
                  </p>
                </div>
              )}
            </div>

            {/* FAQ 4 */}
            <div className="terafab-glass-card rounded-2xl overflow-hidden transition-all duration-300">
              <button 
                type="button"
                className="w-full text-left p-5 sm:p-6 font-bold flex justify-between items-center transition cursor-pointer hover:bg-white/[0.02]" 
                onClick={() => setOpenFaqId(openFaqId === 4 ? null : 4)}
              >
                <span className="text-white text-base sm:text-lg flex items-center gap-3 font-heading font-black">
                  <i className="fa-solid fa-circle-question text-[#f9b03c]"></i>
                  የክፍያ አማራጮች ምንድን ናቸው?
                </span>
                <i className={`fa-solid fa-chevron-down text-[#f9b03c] transition-transform duration-300 ${openFaqId === 4 ? 'rotate-180' : ''}`}></i>
              </button>
              {openFaqId === 4 && (
                <div className="px-5 sm:px-6 pb-6 text-[#a0aec0] border-t border-white/[0.06] pt-4 font-body text-sm sm:text-[15px] leading-relaxed">
                  <p className="ml-8">
                    በኢትዮጵያ ውስጥ በቴሌብር (Telebirr)፣ በኢትዮጵያ ንግድ ባንክ (CBE)፣ በአቢሲኒያ እና በሁሉም ባንኮች በቀላሉ መክፈል ይችላሉ። ከውጭ ሀገር ደግሞ በ PayPal፣ በቪዛ/ማስተርካርድ እንዲሁም በ Crypto (USDT) መክፈል ይችላሉ።
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FOOTER
         ========================================================================= */}
      <Footer />

      {/* =========================================================================
          MODALS & OVERLAYS
         ========================================================================= */}
      {/* Payment Modal */}
      {selectedCourse && (
        <PaymentModal course={selectedCourse} onClose={closePaymentModal} />
      )}

      {/* Dedicated Authentication Required Modal */}
      <RequireAuthModal
        isOpen={showRequireAuthModal}
        onClose={() => { setShowRequireAuthModal(false); setAuthCourseTarget(null); }}
        courseTitle={authCourseTarget?.title}
        courseImage={authCourseTarget?.image}
        isFree={authCourseTarget?.isFree || authCourseTarget?.price === 'Free' || authCourseTarget?.price === '0' || authCourseTarget?.price === 0}
        onContinueAuth={(isSignup) => {
          setShowRequireAuthModal(false);
          window.dispatchEvent(new CustomEvent('open-auth-modal', { 
            detail: { isSignupMode: isSignup, isSignUp: isSignup } 
          }));
        }}
      />

      {/* Course Preview Video Modal */}
      <CoursePreviewModal
        isOpen={Boolean(previewModalCourse)}
        onClose={() => setPreviewModalCourse(null)}
        course={previewModalCourse}
        onGoToClassroom={(c) => openPaymentModal(c)}
        onBuyCourse={(c) => openPaymentModal(c)}
      />

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => {
          setIsWaitlistModalOpen(false);
          setSelectedWaitlistCourse(null);
        }}
        course={selectedWaitlistCourse}
      />

    </main>
  );
}
