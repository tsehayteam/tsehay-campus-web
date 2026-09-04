// @ts-nocheck
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';

import SmartSearchInput from '@/components/SmartSearchInput';
import CourseCardSkeleton from '@/components/CourseCardSkeleton';
import CoursePreviewModal from '@/components/CoursePreviewModal';
import WaitlistModal from '@/components/WaitlistModal';
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import TypingCoursesHeadline from '@/components/TypingCoursesHeadline';
import { searchCourses } from '@/lib/smartSearch';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCleanCourseImage, getCourseSlug, mergeCoursesLists, subscribeToCourses, getComingSoonCourses, ComingSoonCourse, DEFAULT_COURSES, formatCleanCategory } from '@/lib/courseCache';

export default function CoursesClient({ initialCourses }: { initialCourses?: any[] }) {
  const [isMounted, setIsMounted] = useState(false);
  const [courses, setCourses] = useState<any[]>(() => {
    if (initialCourses && Array.isArray(initialCourses) && initialCourses.length > 0) {
      return initialCourses;
    }
    try {
      const cached = getCachedCourses();
      if (cached && cached.length > 0) return cached;
    } catch {}
    return DEFAULT_COURSES;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !(initialCourses && initialCourses.length > 0);
  });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [previewModalCourse, setPreviewModalCourse] = useState<any>(null);
  const [selectedWaitlistCourse, setSelectedWaitlistCourse] = useState<ComingSoonCourse | null>(null);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [authCourseTarget, setAuthCourseTarget] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [isReferralWelcome, setIsReferralWelcome] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    setIsMounted(true);
    if (!initialCourses || initialCourses.length === 0) {
      try {
        const cached = getCachedCourses();
        if (cached && cached.length > 0) {
          setCourses(cached);
          setLoading(false);
        }
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('welcome') === 'true' || params.get('ref')) {
          setIsReferralWelcome(true);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    let artifactList: any[] = [];
    let rootList: any[] = [];

    const syncAndMerge = () => {
      let merged: any[] = [];
      if (artifactList.length > 0 || rootList.length > 0) {
        merged = mergeCoursesLists(DEFAULT_COURSES, artifactList, rootList);
      } else if (initialCourses && initialCourses.length > 0) {
        merged = initialCourses;
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

    // 4. Cross-tab Broadcast Channel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('tsehay_live_courses_channel');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'COURSES_UPDATED' && Array.isArray(event.data.courses)) {
            setCourses(event.data.courses);
            saveCachedCourses(event.data.courses);
          }
        };
      }
    } catch (e) {}

    const handleCustomUpdate = (event: any) => {
      if (event.detail && Array.isArray(event.detail)) {
        setCourses(event.detail);
      }
    };
    window.addEventListener('tsehay_courses_updated', handleCustomUpdate);

    return () => {
      unsubArtifact();
      unsubRoot();
      if (bc) bc.close();
      window.removeEventListener('tsehay_courses_updated', handleCustomUpdate);
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
            returnUrl: '/courses'
          }));
          sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
            type: 'enroll_free',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/courses'
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
        } catch (authErr) {
          console.warn("Token fetch warning:", authErr);
        }

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
            returnUrl: '/courses'
          }));
          sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
            type: 'buy_course',
            courseId: course.id,
            courseTitle: course.title,
            course: course,
            returnUrl: '/courses'
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

  const COURSE_CATEGORY_TABS = [
    { id: 'All', label: 'All Courses', icon: 'fa-layer-group' },
    { id: 'Ecommerce', label: 'E-Commerce', icon: 'fa-cart-shopping' },
    { id: 'YouTube', label: 'YouTube', icon: 'fa-youtube' },
    { id: 'ContentCreation', label: 'Content Creation', icon: 'fa-clapperboard' },
    { id: 'VideoEditing', label: 'Video Editing', icon: 'fa-film' },
    { id: 'Marketing', label: 'Digital Marketing', icon: 'fa-bullhorn' },
    { id: 'Brokerage', label: 'Brokerage', icon: 'fa-building' },
    { id: 'Career', label: 'Career', icon: 'fa-briefcase' },
  ];

  // Helper to match category flexibly
  const isCategoryMatch = (courseCat: string = '', tabId: string) => {
    if (!courseCat) return false;
    const catLower = courseCat.toLowerCase();
    if (tabId === 'Ecommerce' && (catLower.includes('e-commerce') || catLower.includes('ecommerce') || catLower.includes('shein') || catLower.includes('ሼን') || catLower.includes('ኢምፖርት'))) return true;
    if (tabId === 'YouTube' && (catLower.includes('youtube') || catLower.includes('ዩቲዩብ'))) return true;
    if (tabId === 'ContentCreation' && (catLower.includes('content') || catLower.includes('ይዘት'))) return true;
    if (tabId === 'VideoEditing' && (catLower.includes('video editing') || catLower.includes('ኤዲቲንግ') || catLower.includes('editing') || catLower.includes('capcut'))) return true;
    if (tabId === 'Marketing' && (catLower.includes('marketing') || catLower.includes('ማርኬቲንግ') || catLower.includes('ads'))) return true;
    if (tabId === 'Brokerage' && (catLower.includes('brokerage') || catLower.includes('real estate') || catLower.includes('ደላላ') || catLower.includes('ብሮከሬጅ'))) return true;
    if (tabId === 'Career' && (catLower.includes('career') || catLower.includes('ስራ') || catLower.includes('leadership') || catLower.includes('ካሪየር'))) return true;
    return catLower.includes(tabId.toLowerCase());
  };

  const getFilteredCourses = () => {
    const comingSoonList = getComingSoonCourses().map(c => ({ ...c, isComingSoon: true }));
    let result = [...courses, ...comingSoonList];

    if (searchQuery.trim()) {
      result = searchCourses(result, searchQuery);
    }

    if (selectedCategory === "Free") {
      result = result.filter(c => !c.isComingSoon && (c.price === "Free" || c.price === "0" || c.price === 0 || c.isFree));
    } else if (selectedCategory === "Paid") {
      result = result.filter(c => !c.isComingSoon && (c.price !== "Free" && c.price !== "0" && c.price !== 0 && !c.isFree));
    } else if (selectedCategory !== "All") {
      result = result.filter(c => isCategoryMatch(c.category || c.tag, selectedCategory));
    }

    return result;
  };

  const filteredCourses = getFilteredCourses();

  return (
    <React.Fragment>
      <main className="min-h-screen bg-[#030509] text-white selection:bg-[#f9b03c] selection:text-black relative flex flex-col overflow-x-hidden">
        

        {/* Ambient Top Glow Orbs */}
        <div className="fixed top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#f9b03c]/15 to-transparent rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
        <div className="fixed top-1/3 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-[#3268ba]/20 via-[#5a93e8]/10 to-transparent rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-1/3 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(249,176,60,0.08),transparent_70%)] blur-[120px] pointer-events-none -z-10" />

        {/* Referral Welcome Notification Banner */}
        {isReferralWelcome && (
          <div className="relative z-30 bg-gradient-to-r from-amber-500 via-[#f9b03c] to-amber-500 text-slate-950 font-black text-xs sm:text-sm py-2.5 px-4 text-center shadow-lg animate-in slide-in-from-top-4 duration-500">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
              <i className="fa-solid fa-gift text-sm sm:text-base animate-bounce"></i>
              <span>እንኳን ደህና መጡ! ከጓደኛዎ በተላከ ጥቆማ ስለገቡ በሁሉም ኮርሶች ላይ ልዩ ቅናሽ ያገኛሉ! 🎉</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            🌟 HERO SECTION: BOLD SYNTHESIA-GRADE HEADLINE & SEARCH BAR
           ========================================================================= */}
        <section className="pt-28 pb-12 sm:pt-36 sm:pb-16 relative z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#f9b03c]/15 via-amber-400/10 to-[#3268ba]/15 border border-[#f9b03c]/30 rounded-full px-5 py-2 mb-6 backdrop-blur-md shadow-[0_0_25px_rgba(249,176,60,0.2)] animate-in fade-in zoom-in-95 duration-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f9b03c] shadow-[0_0_10px_#f9b03c] animate-ping" />
              <span className="font-mono text-[#f9b03c] font-black text-xs uppercase tracking-widest">
                PREMIUM VIDEO MASTERCLASSES
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight leading-[1.1] mb-6 min-h-[80px] sm:min-h-[110px] course-title-glow-pulse">
              <TypingCoursesHeadline text="ሁሉንም የተግባር ኮርሶች በአንድ ቦታ" />
            </h1>

            <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-body font-medium">
              በዘመናዊ የኢ-ኮሜርስ፣ የዩቲዩብ፣ የዲጂታል ማርኬቲንግ እና የፈጠራ ስራዎች ዙሪያ የተዘጋጁ ፕሪሚየም የቪዲዮ ስልጠናዎች።
            </p>

            {/* Smart Search Bar */}
            <div className="max-w-2xl mx-auto mb-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-2xl">
              <SmartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSelectCourse={(course) => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                placeholder="ኮርሶችን፣ አስተማሪዎችን ወይም ርዕሶችን ይፈልጉ (ለምሳሌ: Shein, YouTube, ማርኬቲንግ...)"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="inline-flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
              {COURSE_CATEGORY_TABS.map((catTab) => {
                const isSelected = selectedCategory === catTab.id;
                return (
                  <button
                    key={catTab.id}
                    type="button"
                    onClick={() => setSelectedCategory(catTab.id)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? catTab.isFree
                          ? 'bg-[#3268ba] text-white font-black border border-[#5a93e8] shadow-[0_0_20px_rgba(50,104,186,0.6)] scale-105'
                          : 'bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black shadow-[0_0_20px_rgba(249,176,60,0.45)] border border-[#f9b03c] scale-105'
                        : catTab.isFree
                          ? 'bg-white/[0.03] text-[#5a93e8] hover:text-white border border-[#3268ba]/30 hover:border-[#3268ba] hover:bg-[#3268ba]/20'
                          : catTab.isPaid
                            ? 'bg-white/[0.03] text-[#f9b03c] hover:text-slate-950 hover:bg-[#f9b03c] border border-[#f9b03c]/30'
                            : 'bg-white/[0.03] text-slate-300 hover:text-white border border-white/10 hover:border-[#f9b03c]/40 hover:bg-white/[0.08]'
                    }`}
                  >
                    {catTab.icon === 'fa-youtube' ? (
                      <svg className={`w-3.5 h-3.5 fill-current ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    ) : (
                      <i className={`fa-solid ${catTab.icon} text-[11px] ${isSelected ? (catTab.isFree ? 'text-white' : 'text-slate-950') : 'text-[#f9b03c]'}`}></i>
                    )}
                    <span>{catTab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        
        {/* =========================================================================
            🌟 COURSE GRID WITH PREMIUM GLASSMORPHISM CARDS
           ========================================================================= */}
        <section className="py-12 sm:py-20 relative z-10 flex-1">
          <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8">
            
            {(!isMounted || (loading && courses.length === 0)) ? (
              <div className="w-full">
                <CourseCardSkeleton count={6} />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-24 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl p-8 max-w-xl mx-auto shadow-2xl">
                {courses.length === 0 ? (
                  <>
                    <div className="w-18 h-18 rounded-3xl bg-amber-500/10 border border-[#f9b03c]/30 text-[#f9b03c] flex items-center justify-center text-4xl mx-auto mb-4">
                      <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">አዳዲስ ኮርሶች በቅርቡ ይጨመራሉ</h3>
                    <p className="text-sm text-slate-300">በቅርቡ አዳዲስ የተሟሉ የሥልጠና ኮርሶች ይለቀቃሉ። ተከታተሉን!</p>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-magnifying-glass text-5xl text-[#f9b03c]/60 mb-4 animate-pulse"></i>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">የተፈለገው ኮርስ አልተገኘም</h3>
                    <p className="text-sm text-slate-400">እባክዎ ሌላ ምድብ ወይም የፍለጋ ቃል ይሞክሩ</p>
                  </>
                )}
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-full"
              >
                {filteredCourses.map((course) => {
                  const isComingSoon = Boolean(course.isComingSoon || course.status === 'Coming Soon');
                  const isFree = !isComingSoon && (course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0);

                  return (
                    <Tilt3DCard
                      key={course.id}
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
                      className="h-full group cursor-pointer course-popup-card"
                    >
                      {/* Premium Glassmorphic Card Container with Smooth Hover translateY(-8px) & Golden Aura */}
                      <div 
                        className={`h-full course-card bg-[#0a0e17]/85 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col justify-between border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(249,176,60,0.06)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.35)] transition-all duration-500 cursor-pointer relative hover:-translate-y-2 select-none ${
                          isComingSoon ? 'border-[#f9b03c]/40 hover:border-[#f9b03c]' : 'hover:border-[#f9b03c]/70'
                        }`}
                        style={{ 
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          transformStyle: 'preserve-3d' 
                        }}
                      >
                        <div>
                          {/* Thumbnail Wrapper: 100% full view with ambient glow & 1.05 scale hover zoom */}
                          <div 
                            className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center block cursor-pointer"
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
                              className="relative z-10 w-full h-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105" 
                            />
                            
                            {/* PREMIUM / FREE / COMING SOON Badge */}
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
                            
                            {/* Category Badge on Image */}
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
                            <div>
                              <h3 
                                className="text-xl sm:text-2xl font-black text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading cursor-pointer tracking-tight"
                                style={{ transform: 'translateZ(25px)' }}
                              >
                                {course.title || t('course_unknown')}
                              </h3>
                            </div>
                            
                            {/* Instructor & Rating Row */}
                            <div 
                              className="flex items-center justify-between gap-2 mb-3.5"
                              style={{ transform: 'translateZ(22px)' }}
                            >
                              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
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
                            
                            <p 
                              className="text-slate-300 text-xs sm:text-sm line-clamp-2 mb-5 leading-relaxed font-medium"
                              style={{ transform: 'translateZ(18px)' }}
                            >
                              {formatCourseDesc(course) || t('course_desc_placeholder')}
                            </p>
                          </div>
                        </div>

                        {/* Card Bottom / Action Row */}
                        <div className="px-6 pb-6 pt-3 border-t border-white/[0.06] flex items-center justify-between mt-auto">
                          <div>
                            {isComingSoon ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                                  ሁኔታ
                                </span>
                                <span className="text-base sm:text-lg font-black text-[#f9b03c] font-heading tracking-tight flex items-center gap-1.5">
                                  <i className="fa-solid fa-sparkles text-xs"></i> {course.expectedDate || 'በቅርቡ የሚለቀቅ'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                                  {t('tuition_fee')}
                                </span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
                                    {isFree ? 'ነፃ (Free)' : `${Number(course.price || 0).toLocaleString()} ETB`}
                                  </span>
                                  {course.oldPrice && Number(course.oldPrice) > Number(course.price) && (
                                    <span className="text-xs text-slate-500 line-through font-bold">
                                      {Number(course.oldPrice).toLocaleString()} ETB
                                    </span>
                                  )}
                                </div>
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
                                <span>ተጠባባቂ ዝርዝር ውስጥ ግባ (Join Waitlist)</span>
                              </button>
                            ) : (
                              <>
                                {/* Preview Trailer Video Button */}
                                {course.video && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewModalCourse(course);
                                    }}
                                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#f9b03c]/20 text-slate-300 hover:text-[#f9b03c] border border-white/10 hover:border-[#f9b03c]/40 flex items-center justify-center transition-all cursor-pointer text-xs"
                                    title="ትሬይለር ይመልከቱ (Watch Trailer)"
                                  >
                                    <i className="fa-solid fa-play"></i>
                                  </button>
                                )}

                                {/* Main CTA: Buy Course or Go to Classroom */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentModal(course);
                                  }} 
                                  disabled={isEnrolling} 
                                  className="btn-shimmer-interactive px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-xs cursor-pointer active:scale-95 disabled:opacity-50 group font-black shadow-lg"
                                >
                                  {isFree ? (
                                    <>{isEnrolling ? 'እባክዎ ይጠብቁ...' : t('btn_go_to_class')} <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
                                  ) : (
                                    <>{t('btn_buy_course')} <i className="fa-solid fa-cart-shopping buy-icon-animated group-hover:scale-110 group-hover:-rotate-6 transition-transform"></i></>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Tilt3DCard>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
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

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => {
          setIsWaitlistModalOpen(false);
          setSelectedWaitlistCourse(null);
        }}
        course={selectedWaitlistCourse}
      />
    </React.Fragment>
  );
}


