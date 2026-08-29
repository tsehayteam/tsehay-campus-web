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
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import { searchCourses } from '@/lib/smartSearch';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCourseSlug, mergeCoursesLists } from '@/lib/courseCache';

export default function CoursesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [previewModalCourse, setPreviewModalCourse] = useState<any>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [authCourseTarget, setAuthCourseTarget] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [isReferralWelcome, setIsReferralWelcome] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const cached = getCachedCourses();
      if (cached && cached.length > 0) {
        setCourses(cached);
        setLoading(false);
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('welcome') === 'true' || params.get('ref')) {
          setIsReferralWelcome(true);
        }
      } catch (e) {}
    }
  }, []);
  
  // Search and Category Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    let artifactList: any[] = [];
    let rootList: any[] = [];

    const syncAndMerge = () => {
      const merged = mergeCoursesLists(artifactList, rootList);
      if (merged.length > 0) {
        setCourses(merged);
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
        setLoading(false);
      });
    } catch (e) {}

    // 3. Immediate cache-busted HTTP fetch
    fetch(`/api/courses?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          const apiMerged = mergeCoursesLists(data.courses);
          setCourses(apiMerged);
          saveCachedCourses(apiMerged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => {
      unsubArtifact();
      unsubRoot();
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
    { id: 'All', label: 'ሁሉም', icon: 'fa-layer-group' },
    { id: 'Free', label: 'ነፃ ኮርሶች', icon: 'fa-sparkles', isFree: true },
    { id: 'Paid', label: 'ፕሪሚየም', icon: 'fa-crown', isPaid: true },
    { id: 'Ecommerce', label: 'ኢ-ኮሜርስ (Shein)', icon: 'fa-cart-shopping' },
    { id: 'YouTube', label: 'ዩቲዩብ እና ቪዲዮ', icon: 'fa-youtube' },
    { id: 'Marketing', label: 'ዲጂታል ማርኬቲንግ', icon: 'fa-bullhorn' },
  ];

  // Helper to match category flexibly
  const isCategoryMatch = (courseCat: string = '', tabId: string) => {
    if (!courseCat) return false;
    const catLower = courseCat.toLowerCase();
    const tabLower = tabId.toLowerCase();
    if (tabId === 'Ecommerce' && (catLower.includes('e-commerce') || catLower.includes('ecommerce') || catLower.includes('shein') || catLower.includes('ንግድ') || catLower.includes('ኢምፖርት'))) return true;
    if (tabId === 'YouTube' && (catLower.includes('youtube') || catLower.includes('ዩቲዩብ') || catLower.includes('video') || catLower.includes('content'))) return true;
    if (tabId === 'Marketing' && (catLower.includes('marketing') || catLower.includes('ማርኬቲንግ') || catLower.includes('sales') || catLower.includes('ሽያጭ') || catLower.includes('digital'))) return true;
    return catLower.includes(tabLower) || tabLower.includes(catLower);
  };

  const getFilteredCourses = () => {
    let result = courses;

    if (searchQuery.trim()) {
      result = searchCourses(result, searchQuery);
    }

    if (selectedCategory === "Free") {
      result = result.filter(c => c.price === "Free" || c.price === "0" || c.price === 0 || c.isFree);
    } else if (selectedCategory === "Paid") {
      result = result.filter(c => c.price !== "Free" && c.price !== "0" && c.price !== 0 && !c.isFree);
    } else if (selectedCategory !== "All") {
      result = result.filter(c => isCategoryMatch(c.category, selectedCategory));
    }

    return result;
  };

  const filteredCourses = getFilteredCourses();

  return (
    <React.Fragment>
      <main className="min-h-screen bg-[#030509] text-white selection:bg-[#f9b03c] selection:text-black relative flex flex-col overflow-x-hidden">
        
        {/* 🌟 3D MESH & PARTICLE CANVAS BACKGROUND */}
        <Courses3DParticleMeshCanvas />

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
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight leading-[1.1] mb-6">
              <span className="text-white">ሁሉንም </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-400 drop-shadow-[0_5px_30px_rgba(249,176,60,0.4)]">
                የተግባር ኮርሶች
              </span>
              <span className="text-white"> በአንድ ቦታ</span>
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
                  const isFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;

                  return (
                    <Tilt3DCard
                      key={course.id}
                      maxTilt={10}
                      scale={1.02}
                      perspective={1100}
                      glare={true}
                      onClick={() => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                      className="h-full group cursor-pointer"
                    >
                      {/* Premium Glassmorphic Card Container with Smooth Hover translateY(-8px) & Golden Aura */}
                      <div 
                        onClick={() => router.push(`/courses/${getCourseSlug(course) || course.id}`)}
                        className="h-full course-card bg-slate-900/80 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col justify-between border border-white/[0.08] hover:border-[#f9b03c]/70 shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_60px_rgba(249,176,60,0.25),0_0_35px_rgba(50,104,186,0.18)] transition-all duration-500 cursor-pointer relative hover:-translate-y-2 select-none"
                        style={{ 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          transformStyle: 'preserve-3d' 
                        }}
                      >
                        <div>
                          {/* Thumbnail Wrapper: 100% full view with ambient glow & 1.05 scale hover zoom */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/courses/${getCourseSlug(course) || course.id}`);
                            }}
                            className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center block cursor-pointer"
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
                              className="relative z-10 w-full h-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-105" 
                            />
                            
                            {/* PREMIUM / FREE Badge (Brand Colors: Yellow/Blue - NO GREEN) */}
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
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/courses/${getCourseSlug(course) || course.id}`);
                              }}
                            >
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
                              <div className="flex items-center gap-1 bg-[#f9b03c]/15 text-[#f9b03c] font-black px-2.5 py-0.5 rounded-full text-xs border border-[#f9b03c]/30 shadow-xs">
                                <i className="fa-solid fa-star text-[10px]"></i>
                                <span>{course.ratingAvg || '4.9'}</span>
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

                          <div className="flex items-center gap-2">
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
    </React.Fragment>
  );
}

// =========================================================================
// 🌟 3D PARTICLE NETWORK & MESH GRADIENT CANVAS (MATCHING LANDING & ABOUT)
// =========================================================================
function Courses3DParticleMeshCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = Math.min(Math.floor((width * height) / 20000), 75);
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      color: string;
    }> = [];

    const colors = ['#f9b03c', '#3268ba', '#5a93e8', '#ffe066'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 400 - 200,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.8 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.z < -200) p.z = 200;
        if (p.z > 200) p.z = -200;

        const fov = 350;
        const scale = fov / (fov + p.z);
        const screenX = p.x;
        const screenY = p.y;
        const r = p.radius * scale;

        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.15, Math.min(0.65, scale * 0.7));
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#f9b03c';
            ctx.globalAlpha = (1 - dist / 110) * 0.15;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none -z-20 opacity-80"
    />
  );
}
