// @ts-nocheck
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import SmartSearchInput from '@/components/SmartSearchInput';
import YouTubeVideoSlider from '@/components/YouTubeVideoSlider';
import InstructorYouTubePortfolio from '@/components/InstructorYouTubePortfolio';
import UpcomingEventsSection from '@/components/UpcomingEventsSection';
import CourseCardSkeleton from '@/components/CourseCardSkeleton';
import CoursePreviewModal from '@/components/CoursePreviewModal';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCourseSlug, mergeCoursesLists } from '@/lib/courseCache';
import Hero3DPopoutStage from '@/components/3d/Hero3DPopoutStage';
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import { scrollTriggerEngine } from '@/lib/scrollTriggerEngine';

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
      <div className="flex items-center gap-2 sm:gap-3 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-widest font-heading text-slate-900 dark:text-white" style={{ letterSpacing: '0.15em' }}>
          SHEIN
        </span>
      </div>
    )
  },
  {
    name: 'YouTube',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="w-10 h-7 sm:w-13 sm:h-9 md:w-16 md:h-11 bg-[#FF0000] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md shrink-0">
          <i className="fa-solid fa-play text-white text-xs sm:text-sm md:text-base ml-0.5"></i>
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 dark:text-white font-heading">
          YouTube
        </span>
      </div>
    )
  },
  {
    name: 'Alibaba',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full bg-[#FF6A00] flex items-center justify-center text-white font-black text-lg sm:text-xl md:text-2xl shadow-sm shrink-0">
          a
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#FF6A00] tracking-tight font-heading">
          Alibaba<span className="text-xs sm:text-sm text-slate-400 font-normal">.com</span>
        </span>
      </div>
    )
  },
  {
    name: 'Telegram',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl shadow-sm shrink-0">
          <i className="fa-brands fa-telegram -ml-0.5"></i>
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
          Telegram
        </span>
      </div>
    )
  },
  {
    name: 'Shopify',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <i className="fa-brands fa-shopify text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#95BF47] shrink-0"></i>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#95BF47] tracking-tight font-heading">
          shopify
        </span>
      </div>
    )
  },
  {
    name: 'Telebirr',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-2xl bg-gradient-to-tr from-[#005CB9] to-[#00A4E4] flex items-center justify-center text-white font-black text-sm sm:text-base md:text-lg shadow-md shrink-0">
          tb
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight font-heading">
          <span className="text-[#005CB9] dark:text-[#00A4E4]">tele</span><span className="text-[#F37023]">birr</span>
        </span>
      </div>
    )
  },
  {
    name: 'CBE',
    render: () => (
      <div className="flex items-center gap-2.5 sm:gap-3.5 opacity-95 hover:opacity-100 transition-all duration-300 transform hover:scale-105 cursor-pointer">
        <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-2xl bg-[#7B2082] flex items-center justify-center text-white font-black text-sm sm:text-base md:text-lg shadow-md shrink-0">
          CBE
        </div>
        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#7B2082] dark:text-[#b842c2] tracking-tight font-heading">
          CBE BIRR
        </span>
      </div>
    )
  }
];

function FloatingElement({ children, depth = 1, className = '', style = {} }: any) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (25 / depth);
      const y = (e.clientY - innerHeight / 2) / (25 / depth);
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [depth]);

  return (
    <div
      className={className}
      style={{
        ...style,
        transform: `${style.transform || ''} translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        willChange: 'transform'
      }}
    >
      {children}
    </div>
  );
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

export default function HomeClient() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>(() => {
    try {
      return getCachedCourses();
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [hasPurchasedCourses, setHasPurchasedCourses] = useState<boolean | null>(null);
  
  // Payment / Auth / Preview Modal States
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [previewModalCourse, setPreviewModalCourse] = useState<any>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [authCourseTarget, setAuthCourseTarget] = useState<any>(null);

  const { t } = useLanguage();
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  // Check if logged in user has purchased any courses
  useEffect(() => {
    if (!user) {
      setHasPurchasedCourses(false);
      return;
    }
    const checkPurchases = async () => {
      try {
        const snap = await getDocs(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses'));
        setHasPurchasedCourses(!snap.empty);
      } catch (e) {
        console.warn("Could not check user purchased courses:", e);
        setHasPurchasedCourses(false);
      }
    };
    checkPurchases();
  }, [user]);

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

  useEffect(() => {
    let artifactList: any[] = [];
    let rootList: any[] = [];
    let altArtifactList: any[] = [];

    const syncAndMerge = () => {
      const merged = mergeCoursesLists(artifactList, rootList, altArtifactList);
      setCourses(merged);
      if (merged.length > 0) {
        saveCachedCourses(merged);
      }
      setLoading(false);
    };

    // 1. Live listener on artifacts public collection
    let unsubArtifact = () => {};
    try {
      const qArtifact = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
      unsubArtifact = onSnapshot(qArtifact, (snapshot) => {
        artifactList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        syncAndMerge();
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
        rootList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        syncAndMerge();
      }, (error) => {
        console.warn("Root courses sync notice:", error);
        setLoading(false);
      });
    } catch (e) {}

    // 3. Live listener on artifacts/tsehaycampus-e1a6d/courses
    let unsubAltArtifact = () => {};
    try {
      const qAlt = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'courses'));
      unsubAltArtifact = onSnapshot(qAlt, (snapshot) => {
        altArtifactList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        syncAndMerge();
      }, (error) => {
        console.warn("Alt artifacts courses sync notice:", error);
        setLoading(false);
      });
    } catch (e) {}

    // 4. Immediate cache-busted HTTP fetch
    fetch(`/api/courses?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses)) {
          const apiMerged = mergeCoursesLists(data.courses);
          setCourses(apiMerged);
          if (apiMerged.length > 0) {
            saveCachedCourses(apiMerged);
          }
        }
      })
      .catch(err => console.warn("API courses fetch notice:", err))
      .finally(() => setLoading(false));

    return () => {
      unsubArtifact();
      unsubRoot();
      unsubAltArtifact();
    };
  }, []);

  // 🌟 Seamless Post-Login Action Continuity: Automatically resume Buy/Enroll where user left off!
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
        // 1. Direct resilient client-side Firestore registration
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

        // 2. Set active course & lesson cache
        try {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(course));
          if (course.lessons && course.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify({ ...course.lessons[0], moduleIndex: 0, lessonIndex: 0 }));
          }
        } catch (e) {}

        // 3. Notify backend API in background
        try {
          const idToken = await user.getIdToken();
          fetch('/api/enroll-free', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ courseId: course.id })
          }).catch(e => console.warn("Background API enrollment notify:", e));
        } catch (authErr) {}

        // 4. Route directly to dashboard classroom
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
      // Paid course -> Open payment modal directly for instant checkout
      setSelectedCourse(course);
    }
  };

  const closePaymentModal = () => {
    setSelectedCourse(null);
  };

  return (
    <main className="relative bg-transparent">
      <section className="terafab-hero-container" id="home">
        {/* Full-Cover Background Image / Mesh with Continuous Ken Burns + Parallax */}
        <div 
          className="terafab-hero-bg" 
          style={{
            backgroundImage: "url('/assets/hero-bg-new.jpg')"
          }}
        ></div>
        {/* Deep Void Black Vignette */}
        <div className="terafab-hero-vignette"></div>
        
        {/* Subtle Wave Boundary at Bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10 pointer-events-none">
            <svg 
              className="relative block w-full h-12 sm:h-16 md:h-20 text-[#030509] fill-current" 
              viewBox="0 0 1200 120" 
              preserveAspectRatio="none"
            >
                <path d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z"></path>
            </svg>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 relative z-20 py-12 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                
                {/* Left Column: Premium Typography & Search */}
                <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left pt-6 sm:pt-10">
                    
                    {/* Live Status Pill */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 via-[#f9b03c]/15 to-transparent border border-amber-400/30 backdrop-blur-md mb-6 sm:mb-8 group cursor-default transition-all duration-300">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b03c] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f9b03c]"></span>
                        </span>
                        <span className="text-[11px] sm:text-xs font-mono font-black uppercase tracking-widest text-[#f9b03c]">
                            {t('hero_badge') || 'በኢትዮጵያ ቀዳሚው ዘመናዊ የዲጂታል አካዳሚ'}
                        </span>
                    </div>

                    {/* Massive Bold Headline with Amber/Gold Metallic Sheen */}
                    <h1 className="font-heading font-black text-4xl sm:text-6xl md:text-7xl lg:text-[76px] tracking-tight leading-[1.12] sm:leading-[1.08] text-white mb-6">
                        {t('hero_title_1') || 'የወደፊት ህይወትዎን'}{' '}
                        <span className="relative inline-block mt-1 sm:mt-0">
                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-[#ffc66b] to-yellow-400">
                                {t('hero_title_2') || 'በተግባራዊ ክህሎት'}
                            </span>
                            <span className="absolute -bottom-2 left-0 w-full h-3 bg-gradient-to-r from-[#f9b03c]/30 to-transparent blur-xs -z-0"></span>
                        </span>{' '}
                        {t('hero_title_3') || 'ይገንቡ'}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-gray-300 dark:text-[#a0aec0] font-body text-base sm:text-lg md:text-xl max-w-2xl font-normal leading-relaxed mb-8 sm:mb-10">
                        {t('hero_desc') || 'በኢ-ኮሜርስ (Shein & ቻይና ኢምፖርት)፣ ዩቲዩብ፣ ዲጂታል ማርኬቲንግ እና ቴክኖሎጂ ዙሪያ የተዘጋጁ ፕሪሚየም ተግባራዊ ስልጠናዎች።'}
                    </p>

                    {/* Global Course Search Bar */}
                    <div className="w-full max-w-xl mb-8 sm:mb-10">
                        <SmartSearchInput 
                          placeholder="ኮርሶችን፣ አስተማሪዎችን ወይም ርዕሶችን ይፈልጉ (ለምሳሌ: Shein, YouTube...)"
                          onSelectCourse={(course) => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                        />
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
                        <MagneticLink 
                            href="#courses"
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#f9b03c] text-slate-950 font-black text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer group shadow-[0_0_30px_rgba(249,176,60,0.45)] hover:shadow-[0_0_45px_rgba(249,176,60,0.65)] hover:scale-[1.03]"
                        >
                            <span>{t('explore_courses') || 'ኮርሶችን ያስሱ'}</span>
                            <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform duration-300"></i>
                        </MagneticLink>

                        <MagneticLink 
                            href="/mentorship"
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-[#f9b03c]/60 text-white font-bold text-sm sm:text-base backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.03]"
                        >
                            <i className="fa-solid fa-calendar-check text-[#f9b03c]"></i>
                            <span>1-ለ-1 ማማከር (Mentorship)</span>
                        </MagneticLink>
                    </div>

                    {/* Social Proof Stats Row */}
                    <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-10 sm:pt-12 mt-4 border-t border-white/10 w-full max-w-xl">
                        <div className="text-center lg:text-left">
                            <h4 className="font-heading font-black text-2xl sm:text-3xl text-white">500+</h4>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">የሰለጠኑ ተማሪዎች</p>
                        </div>
                        <div className="text-center lg:text-left border-x border-white/10 px-2">
                            <h4 className="font-heading font-black text-2xl sm:text-3xl text-[#f9b03c]">4.9 / 5</h4>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">የተማሪዎች እርካታ</p>
                        </div>
                        <div className="text-center lg:text-left">
                            <h4 className="font-heading font-black text-2xl sm:text-3xl text-white">100%</h4>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-0.5">ተግባራዊ ድጋፍ</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: 3D Stage with Popout Graphics */}
                <div className="lg:col-span-5 flex items-center justify-center relative">
                    <Hero3DPopoutStage />
                </div>
            </div>
        </div>
    </section>

    {/* SECTION 2: MASSIVE SOCIAL PROOF (Synthesia Style Trust Banner) */}
    <section className="py-10 sm:py-14 bg-white/5 dark:bg-[#030509]/70 backdrop-blur-xl border-b border-white/[0.06] relative z-20 shadow-xs transition-colors duration-300 overflow-hidden select-none scrolly-reveal">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2.5 bg-[#3268ba]/15 dark:bg-[#3268ba]/20 border border-[#3268ba]/30 rounded-full px-5 py-2 shadow-xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                <p className="font-mono text-[#f9b03c] font-black tracking-widest text-[11px] sm:text-xs uppercase">
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
                        className="shrink-0 flex items-center justify-center grayscale-15 hover:grayscale-0 transition-all duration-300 transform hover:scale-105"
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

    <section id="features" className="py-24 relative overflow-hidden bg-slate-50/40 dark:bg-transparent border-b border-gray-200/80 dark:border-white/[0.06] transition-colors duration-300">
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
                
                {/* Card 1: 100% Practical Courses (3D Tilt Card) */}
                <Tilt3DCard 
                    maxTilt={12} 
                    perspective={1000}
                    onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
                    className="cursor-pointer"
                >
                    <div 
                        data-scrolly-order="1"
                        className="h-full bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-200/70 dark:border-white/[0.08] hover:border-[#f9b03c]/60 dark:hover:border-[#f9b03c]/60 hover:shadow-[0_25px_60px_rgba(249,176,60,0.22)] transition-all duration-500 group flex flex-col justify-between"
                    >
                        <div>
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/15 dark:bg-[#f9b03c]/15 text-[#f9b03c] border border-amber-400/30 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-inner"
                                style={{ transform: 'translateZ(35px)' }}
                            >
                                <i className="fa-solid fa-laptop-code"></i>
                            </div>
                            <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading" style={{ transform: 'translateZ(25px)' }}>{t('practical_title')}</h3>
                            <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px]" style={{ transform: 'translateZ(15px)' }}>{t('practical_desc')}</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300" style={{ transform: 'translateZ(20px)' }}>
                            <span>ተጨማሪ ዝርዝር</span>
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                        </div>
                    </div>
                </Tilt3DCard>

                {/* Card 2: AI Integrated Learning (Featured Center Holographic Glow Card) */}
                <Tilt3DCard 
                    maxTilt={15}
                    scale={1.03}
                    perspective={1000}
                    glare={true}
                    onClick={() => window.dispatchEvent(new Event('open-ai-chat'))}
                    className="cursor-pointer"
                >
                    <div 
                        data-scrolly-order="2"
                        className="h-full bg-gradient-to-b from-white dark:from-slate-900/90 to-amber-50/50 dark:to-slate-950/90 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl border-2 border-amber-400/60 dark:border-[#f9b03c]/40 hover:border-[#f9b03c] hover:shadow-[0_30px_70px_rgba(249,176,60,0.35)] transition-all duration-500 group relative overflow-hidden flex flex-col justify-between"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        <div className="absolute -right-10 -top-10 bg-gradient-to-br from-amber-400/20 via-primary/10 to-transparent w-48 h-48 rounded-full -z-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
                        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full shadow-md animate-pulse" style={{ transform: 'translateZ(40px)' }}>
                            {t('new_badge')}
                        </div>
                        <div>
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-400/15 dark:bg-[#f9b03c]/15 text-[#f9b03c] border border-amber-400/30 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#f9b03c] group-hover:text-slate-950 transition-all duration-300 shadow-inner relative z-10"
                                style={{ transform: 'translateZ(45px)' }}
                            >
                                <i className="fa-solid fa-robot"></i>
                            </div>
                            <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading relative z-10" style={{ transform: 'translateZ(30px)' }}>
                                {t('ai_tutor_card_title') || 'የ 24/7 የግል AI መምህር'}
                            </h3>
                            <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px] relative z-10" style={{ transform: 'translateZ(20px)' }}>{t('ai_integration_desc')}</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-black text-[#f9b03c] group-hover:translate-x-1.5 transition-transform duration-300" style={{ transform: 'translateZ(25px)' }}>
                            <span>Tsehay AI ን ይሞክሩ</span>
                            <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                        </div>
                    </div>
                </Tilt3DCard>

                {/* Card 3: Accredited Certificate (3D Tilt Card) */}
                <Tilt3DCard 
                    maxTilt={12}
                    perspective={1000}
                    onClick={() => document.getElementById('courses')?.scrollIntoView({behavior: 'smooth'})}
                    className="cursor-pointer"
                >
                    <div 
                        data-scrolly-order="3"
                        className="h-full bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-gray-200/70 dark:border-white/[0.08] hover:border-[#3268ba]/60 dark:hover:border-[#3268ba]/60 hover:shadow-[0_25px_60px_rgba(50,104,186,0.22)] transition-all duration-500 group flex flex-col justify-between"
                    >
                        <div>
                            <div 
                                className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 dark:bg-[#3268ba]/15 text-[#3268ba] dark:text-[#5a93e8] border border-blue-500/20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-[#3268ba] group-hover:text-white transition-all duration-300 shadow-inner"
                                style={{ transform: 'translateZ(35px)' }}
                            >
                                <i className="fa-solid fa-award"></i>
                            </div>
                            <h3 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white mb-3 sm:mb-4 font-heading" style={{ transform: 'translateZ(25px)' }}>{t('cert_title')}</h3>
                            <p className="text-gray-600 dark:text-[#8a95a5] font-body leading-relaxed text-sm sm:text-[15px]" style={{ transform: 'translateZ(15px)' }}>{t('cert_desc')}</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-xs sm:text-sm font-bold text-[#3268ba] dark:text-[#5a93e8] group-hover:translate-x-1.5 transition-transform duration-300" style={{ transform: 'translateZ(20px)' }}>
                            <span>ሰርተፍኬት ያረጋግጡ</span>
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                        </div>
                    </div>
                </Tilt3DCard>
            </div>
        </div>
    </section>

    
    <section id="courses" className="py-20 sm:py-28 bg-slate-50/40 dark:bg-transparent border-b border-gray-200/80 dark:border-white/[0.06] transition-colors duration-300 relative overflow-hidden">
        {/* 🌟 Terafub-inspired 3D Deep Atmospheric Background Aura & Cyber Mesh */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[700px] h-[700px] bg-gradient-to-bl from-[#f9b03c]/20 via-[#f9b03c]/5 to-transparent rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] bg-gradient-to-tr from-[#3268ba]/25 via-[#3268ba]/8 to-transparent rounded-full blur-[150px]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(249,176,60,0.12),rgba(50,104,186,0.1),transparent_70%)] blur-[120px]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(#3268ba_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.06] dark:opacity-[0.035]"></div>
        </div>

        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col items-center text-center mb-14 sm:mb-18 gap-3 scrolly-reveal">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400/15 via-[#f9b03c]/10 to-[#3268ba]/15 border border-[#f9b03c]/30 px-5 py-2 rounded-full shadow-[0_0_25px_rgba(249,176,60,0.2)] backdrop-blur-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-ping"></span>
                    <span className="text-xs font-black uppercase tracking-widest text-[#f9b03c]">FEATURED MASTERCLASSES</span>
                </div>
                <h2 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#f9b03c] to-amber-600 dark:from-white dark:via-[#f9b03c] dark:to-[#5a93e8] drop-shadow-[0_5px_25px_rgba(249,176,60,0.3)]">
                        {t('popular_courses') || 'የፀሐይ ካምፓስ ኮርሶች'}
                    </span>
                </h2>
                <div className="w-28 h-1.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_15px_rgba(249,176,60,0.8)]"></div>
                <p className="text-gray-600 dark:text-[#8a95a5] font-body text-base sm:text-lg max-w-2xl mt-1">
                    {t('popular_courses_desc')}
                </p>
            </div>

            {loading && courses.length === 0 ? (
                <div className="w-full scrolly-reveal">
                    <CourseCardSkeleton count={3} />
                </div>
            ) : courses.length === 0 ? (
                <div className="text-center py-16 w-full max-w-lg mx-auto rounded-3xl bg-white/80 dark:bg-slate-900/40 border border-gray-200/80 dark:border-white/10 backdrop-blur-xl p-8 shadow-2xl scrolly-reveal">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-[#f9b03c]/30 text-[#f9b03c] flex items-center justify-center text-3xl mx-auto mb-3">
                        <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">አዳዲስ ኮርሶች በቅርቡ ይጨመራሉ</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">በቅርቡ አዳዲስ የተሟሉ የሥልጠና ኮርሶች ይለቀቃሉ</p>
                </div>
            ) : (
                <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-full" 
                    id="courseList"
                >
                    {courses.slice(0, 6).map((course, index) => {
                        const isFree = course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free';
                        return (
                        <Tilt3DCard
                            key={course.id}
                            maxTilt={12}
                            scale={1.025}
                            perspective={1100}
                            glare={true}
                            onClick={() => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                            className="cursor-pointer group"
                        >
                            <div 
                                data-scrolly-order={index + 1}
                                onClick={() => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                                className="h-full course-card bg-white/90 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col justify-between border border-gray-200/80 dark:border-white/[0.08] hover:border-[#f9b03c]/60 dark:hover:border-[#f9b03c]/60 shadow-[0_15px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_70px_rgba(249,176,60,0.22),0_0_30px_rgba(50,104,186,0.15)] transition-all duration-500 relative select-none"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div>
                                    {/* Thumbnail Wrapper with 3D Z-Popout */}
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/courses/${getCourseSlug(course) || course.id}`);
                                        }}
                                        className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center m-0 cursor-pointer"
                                        style={{ transform: 'translateZ(30px)' }}
                                    >
                                        <img 
                                            src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                            alt="" 
                                            aria-hidden="true" 
                                            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none" 
                                        />
                                        <img 
                                            src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                                            alt={course.title} 
                                            className="relative z-10 w-full h-full object-contain p-2 group-hover:scale-[1.04] transition-transform duration-500" 
                                        />
                                        
                                        {/* Floating Popout Badges */}
                                        {!isFree ? (
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

                                        {/* Category Badge on Image */}
                                        {course.category && (
                                            <div 
                                                className="absolute bottom-3.5 left-3.5 z-20 bg-[#030509]/85 backdrop-blur-md text-[#f9b03c] border border-white/15 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md"
                                                style={{ transform: 'translateZ(40px)' }}
                                            >
                                                {course.category}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Details */}
                                    <div className="p-6 sm:p-7">
                                        {/* Title */}
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/courses/${getCourseSlug(course) || course.id}`);
                                            }}
                                        >
                                            <h3 
                                                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading cursor-pointer"
                                                style={{ transform: 'translateZ(25px)' }}
                                            >
                                                {course.title || t('course_unknown')}
                                            </h3>
                                        </div>

                                        {/* Instructor & Rating Info */}
                                        <div 
                                            className="flex items-center justify-between gap-2 mb-3.5"
                                            style={{ transform: 'translateZ(22px)' }}
                                        >
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8a95a5] font-semibold">
                                                <div className="w-6 h-6 rounded-full bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-[11px]">
                                                    <i className="fa-solid fa-chalkboard-user"></i>
                                                </div>
                                                <span>{course.instructor || 'Eyoub Sahle'}</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-[#f9b03c]/15 text-[#f9b03c] font-black px-2.5 py-0.5 rounded-full text-xs border border-[#f9b03c]/30 shadow-xs">
                                                <i className="fa-solid fa-star text-[10px]"></i>
                                                <span>{course.ratingAvg || '4.9'}</span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p 
                                            className="text-gray-600 dark:text-[#a0aec0] text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5 font-body"
                                            style={{ transform: 'translateZ(15px)' }}
                                        >
                                            {formatCourseDesc(course) || t('course_desc_placeholder')}
                                        </p>
                                        
                                        {/* Meta Capsules */}
                                        <div 
                                            className="flex flex-wrap gap-2 mb-2"
                                            style={{ transform: 'translateZ(20px)' }}
                                        >
                                            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/80 dark:border-white/[0.08] backdrop-blur-md">
                                                <i className="fa-regular fa-clock text-[#f9b03c] text-[10px]"></i>
                                                <span>{course.duration || '00:50:00'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/80 dark:border-white/[0.08] backdrop-blur-md">
                                                <i className="fa-solid fa-layer-group text-[#f9b03c] text-[10px]"></i>
                                                <span>{course.lessons?.length || 0} {t('course_lessons')}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-100/90 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/80 dark:border-white/[0.08] backdrop-blur-md">
                                                <i className="fa-solid fa-signal text-[#f9b03c] text-[10px]"></i>
                                                <span>{course.level || 'ጀማሪ'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Price & CTA Row (Bottom) with 3D Depth */}
                                <div 
                                    className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3 mt-auto bg-slate-50/50 dark:bg-white/[0.01]"
                                    style={{ transform: 'translateZ(32px)' }}
                                >
                                    <div>
                                        {isFree ? (
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewModalCourse(course);
                                            }}
                                            className="bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white text-xs font-bold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition border border-gray-200 dark:border-white/10 flex items-center gap-1.5 cursor-pointer hover:border-[#f9b03c]/40 active:scale-95"
                                            title="ማስተዋወቂያ ቪዲዮ ይመልከቱ (Watch Preview Video)"
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
                                                <>{isEnrolling ? 'እባክዎ ይጠብቁ...' : t('btn_go_to_class')} <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
                                            ) : (
                                                <>{t('btn_buy_course')} <i className="fa-solid fa-cart-shopping buy-icon-animated group-hover:scale-110 group-hover:-rotate-6 transition-transform"></i></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Tilt3DCard>
                    );
                    })}
                </div>
            )}

            {/* 🌟 3D "Explore All Courses" CTA Banner */}
            <div className="mt-14 sm:mt-18 text-center scrolly-reveal">
                <a 
                    href="/courses"
                    className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-4.5 rounded-2xl bg-gradient-to-r from-[#3268ba] via-[#25549c] to-[#3268ba] text-white font-black text-sm sm:text-base border-2 border-white/20 hover:border-[#f9b03c] shadow-[0_15px_40px_rgba(50,104,186,0.35)] hover:shadow-[0_20px_50px_rgba(249,176,60,0.4)] transition-all duration-300 hover:scale-105 group cursor-pointer"
                >
                    <i className="fa-solid fa-layer-group text-[#f9b03c] text-lg group-hover:rotate-12 transition-transform"></i>
                    <span>{t('all_courses') || 'ሁሉንም ኮርሶች ያስሱ'}</span>
                    <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform"></i>
                </a>
            </div>
        </div>
    </section>

    {/* YouTube Free Video Lessons Horizontal Slider */}
    <div className="scrolly-reveal">
      <YouTubeVideoSlider />
    </div>

    {/* Instructor's YouTube Portfolio (2-Column Terafab Glassmorphism Section) */}
    <InstructorYouTubePortfolio />
    
    {/* Upcoming Events & Workshops Section */}
    <UpcomingEventsSection />
    
    <section id="faq" className="py-16 bg-slate-50/40 dark:bg-transparent border-b border-gray-200 dark:border-gray-800 transition-colors duration-300 scrolly-reveal">
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

    {/* Render Payment Modal if a course is selected */}
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

    {/* Cinema-Grade Course Preview Video Modal */}
    <CoursePreviewModal
      isOpen={Boolean(previewModalCourse)}
      onClose={() => setPreviewModalCourse(null)}
      course={previewModalCourse}
      onGoToClassroom={(c) => openPaymentModal(c)}
      onBuyCourse={(c) => openPaymentModal(c)}
    />

    </main>
  );
}
