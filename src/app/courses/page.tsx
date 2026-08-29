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
import { DEFAULT_COURSES, getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCourseSlug, mergeCoursesLists } from '@/lib/courseCache';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>(() => {
    try {
      return getCachedCourses();
    } catch (e) {
      return DEFAULT_COURSES;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
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
      let merged: any[] = [];
      if (artifactList.length > 0 || rootList.length > 0) {
        merged = mergeCoursesLists(artifactList, rootList);
      } else {
        merged = mergeCoursesLists(DEFAULT_COURSES);
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
        artifactList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        syncAndMerge();
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
        rootList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        syncAndMerge();
        setLoading(false);
      }, (error) => {
        console.warn("Root courses sync notice:", error);
        setLoading(false);
      });
    } catch (e) {}

    // 3. Immediate HTTP fallback fetch
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(mergeCoursesLists(data.courses));
          saveCachedCourses(data.courses);
        }
      })
      .catch(err => console.warn("API courses fetch notice:", err))
      .finally(() => setLoading(false));

    return () => {
      unsubArtifact();
      unsubRoot();
    };
  }, []);

  // 🌟 Seamless Post-Login Action Continuity: Automatically resume Buy/Enroll where user left off!
  useEffect(() => {
    if (user && courses.length > 0) {
      try {
        const savedRaw = sessionStorage.getItem('tsehay_pending_course_action');
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          const found = courses.find((c: any) => c.id === saved.courseId) || saved.course;
          if (found) {
            sessionStorage.removeItem('tsehay_pending_course_action');
            setShowRequireAuthModal(false);
            setAuthCourseTarget(null);
            openPaymentModal(found);
          }
        }
      } catch (e) {
        console.warn("Error restoring pending course action:", e);
      }
    }
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
            course: course
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
      // Paid course -> Open payment modal directly for instant checkout
      setSelectedCourse(course);
    }
  };

  const closePaymentModal = () => {
    setSelectedCourse(null);
  };

  const COURSE_CATEGORY_TABS = [
    { id: 'E-Commerce', labelKey: 'cat_ecommerce', defaultLabel: 'E-Commerce', icon: 'fa-cart-shopping' },
    { id: 'YouTube', labelKey: 'cat_youtube', defaultLabel: 'YouTube', icon: 'fa-youtube' },
    { id: 'Content Creation', labelKey: 'cat_content_creation', defaultLabel: 'Content Creation', icon: 'fa-wand-magic-sparkles' },
    { id: 'Marketing', labelKey: 'cat_marketing', defaultLabel: 'Marketing', icon: 'fa-bullhorn' },
    { id: 'Brokerage', labelKey: 'cat_brokerage', defaultLabel: 'Brokerage', icon: 'fa-handshake' },
    { id: 'Film Making', labelKey: 'cat_filmmaking', defaultLabel: 'Film Making', icon: 'fa-video' },
    { id: 'Career Development', labelKey: 'cat_career', defaultLabel: 'Career Development', icon: 'fa-briefcase' },
  ];

  const filteredCourses = (() => {
    let matched = searchQuery ? searchCourses(courses, searchQuery) : courses;

    if (selectedCategory === "All") return matched;
    if (selectedCategory === "Free") return matched.filter(course => course.price === "Free" || course.price === "0" || course.price === 0 || course.isFree);
    if (selectedCategory === "Paid") return matched.filter(course => course.price !== "Free" && course.price !== "0" && course.price !== 0 && !course.isFree);
    
    return matched.filter(course => {
      if (!course.category) return false;
      const cat = String(course.category).toLowerCase().trim();
      const sel = selectedCategory.toLowerCase().trim();
      if (cat === sel) return true;
      if (sel === 'e-commerce' && (cat === 'ecommerce' || cat.includes('commerce') || cat.includes('shein') || cat.includes('aliexpress') || cat.includes('ኢኮሜርስ'))) return true;
      if (sel === 'youtube' && (cat === 'youtube' || cat.includes('youtube') || cat.includes('ዩቲዩብ'))) return true;
      if (sel === 'content creation' && (cat === 'content creation' || cat.includes('content') || cat.includes('creation') || cat.includes('ክሬሽን'))) return true;
      if (sel.includes('marketing') && (cat.includes('marketing') || cat.includes('digital') || cat.includes('facebook') || cat.includes('ማርኬቲንግ'))) return true;
      if (sel.includes('brokerage') && (cat.includes('broker') || cat.includes('real estate') || cat.includes('ደላላ'))) return true;
      if (sel.includes('film') && (cat.includes('film') || cat.includes('cinema') || cat.includes('editing') || cat.includes('ፊልም'))) return true;
      if (sel.includes('career') && (cat.includes('career') || cat.includes('development') || cat.includes('job') || cat.includes('ስራ'))) return true;
      return false;
    });
  })();

  return (
    <React.Fragment>
      <main className="min-h-screen flex flex-col bg-[#030509] text-slate-100 transition-colors duration-300 relative overflow-hidden animate-in fade-in duration-700">
        
        {/* =========================================================================
            🌟 3D PARTICLE NETWORK & MESH GRADIENT CANVAS BACKGROUND (TERAFAB AESTHETIC)
           ========================================================================= */}
        <Courses3DParticleMeshCanvas />

        {/* Deep Void Stardust Mesh & Subtle Ambient Lighting Atmosphere */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-15 mix-blend-overlay pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(50,104,186,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(249,176,60,0.14),transparent_55%)] pointer-events-none z-0" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-b from-[#3268ba]/20 via-[#f9b03c]/12 to-transparent rounded-full blur-[160px] pointer-events-none -z-10 animate-pulse" />
        <div className="absolute top-[35%] -left-36 w-[500px] h-[500px] bg-[#3268ba]/15 rounded-full blur-[160px] pointer-events-none -z-10" />
        <div className="absolute top-[65%] -right-36 w-[500px] h-[500px] bg-[#f9b03c]/12 rounded-full blur-[160px] pointer-events-none -z-10" />

        {/* =========================================================================
            🌟 HERO TITLE, SEARCH & FUTURISTIC GLASS FILTER SECTION
           ========================================================================= */}
        <section className="pt-28 pb-6 sm:pt-36 sm:pb-8 relative z-10 text-center px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Top Silicon Valley Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md text-[#f9b03c] text-xs font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(249,176,60,0.2)] animate-pulse">
              <i className="fa-solid fa-graduation-cap text-[#f9b03c]"></i>
              <span>{t('courses_badge')}</span>
            </div>
            
            {/* Futuristic Silicon Valley Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight drop-shadow-sm font-heading tracking-tight">
              {t('courses_title_1')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f9b03c] via-amber-300 to-[#5a93e8] animate-pulse drop-shadow-[0_5px_25px_rgba(249,176,60,0.35)]">
                Tsehay Campus
              </span>{' '}
              {t('courses_title_2')}
            </h1>
            
            {/* Golden Yellow Glow Divider */}
            <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)] mb-6" />
            
            <p className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed mb-8 font-body">
              {t('courses_subtitle')}
            </p>

            {/* 🎁 Referral Invitee Welcome Banner */}
            {isReferralWelcome && (
              <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#f9b03c]/20 to-blue-500/20 border border-[#f9b03c]/50 text-white max-w-2xl mx-auto shadow-lg backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                  🎁
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-[#f9b03c] uppercase tracking-wider font-heading">የጓደኛ ልዩ ግብዣ • Exclusive Referral Welcome</p>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium">በጓደኛዎ ልዩ ግብዣ መጥተዋል! አሁን ማንኛውንም ኮርስ በመምረጥ ነፃ የቪዲዮ ትምህርቶችን በቅድሚያ ይመልከቱ እና ይመዝገቡ።</p>
                </div>
              </div>
            )}

            {/* Futuristic Glassmorphic Search Bar */}
            <div className="max-w-2xl mx-auto mb-8 relative z-30">
              <SmartSearchInput 
                courses={courses}
                placeholder="ኮርሶችን ይፈልጉ (e.g. E-Commerce, YouTube, Marketing, Brokerage, Film, Career)..."
                onSearchChange={(searchResults, q) => {
                  setSearchQuery(q);
                }}
              />
            </div>

            {/* Futuristic Glassmorphic Category Filter Tabs */}
            <div 
              className="inline-flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.5)]"
              style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              {/* All Filter */}
              <button 
                type="button"
                onClick={() => setSelectedCategory('All')} 
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer ${
                  selectedCategory === 'All' 
                    ? 'bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black shadow-[0_0_20px_rgba(249,176,60,0.45)] border border-[#f9b03c]' 
                    : 'bg-white/[0.03] text-slate-300 hover:text-white border border-white/10 hover:border-[#f9b03c]/40 hover:bg-white/[0.08]'
                }`}
              >
                {t('cat_all')}
              </button>

              {/* Free Filter (Brand Royal Blue - NO GREEN) */}
              <button 
                type="button"
                onClick={() => setSelectedCategory('Free')} 
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'Free' 
                    ? 'bg-[#3268ba] text-white font-black border border-[#5a93e8] shadow-[0_0_20px_rgba(50,104,186,0.6)]' 
                    : 'bg-white/[0.03] text-[#5a93e8] hover:text-white border border-[#3268ba]/30 hover:border-[#3268ba] hover:bg-[#3268ba]/20'
                }`}
              >
                <i className="fa-solid fa-sparkles text-[10px] text-[#f9b03c]"></i>
                <span>{t('cat_free')}</span>
              </button>

              {/* Paid Filter (Brand Golden Yellow) */}
              <button 
                type="button"
                onClick={() => setSelectedCategory('Paid')} 
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'Paid' 
                    ? 'bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 font-black shadow-[0_0_20px_rgba(249,176,60,0.45)] border border-[#f9b03c]' 
                    : 'bg-white/[0.03] text-[#f9b03c] hover:text-slate-950 hover:bg-[#f9b03c] border border-[#f9b03c]/30'
                }`}
              >
                <i className="fa-solid fa-crown text-[10px]"></i>
                <span>{t('cat_paid')}</span>
              </button>

              <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

              {/* 🌟 6 Specific Updated Categories */}
              {COURSE_CATEGORY_TABS.map((catTab) => {
                const isSelected = selectedCategory === catTab.id;
                return (
                  <button
                    key={catTab.id}
                    type="button"
                    onClick={() => setSelectedCategory(catTab.id)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#3268ba] to-[#5a93e8] text-white font-black border border-[#5a93e8] shadow-[0_0_20px_rgba(50,104,186,0.6)] scale-105'
                        : 'bg-white/[0.03] text-slate-300 hover:text-white border border-white/10 hover:border-[#f9b03c]/40 hover:bg-white/[0.08]'
                    }`}
                  >
                    {catTab.id === 'YouTube' ? (
                      <svg className="w-4 h-4 text-red-500 fill-current shrink-0 drop-shadow-sm" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    ) : (
                      <i className={`fa-solid ${catTab.icon} text-[11px] ${isSelected ? 'text-[#f9b03c]' : 'text-slate-400'}`}></i>
                    )}
                    <span>{t(catTab.labelKey) || catTab.defaultLabel}</span>
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
            
            {loading && courses.length === 0 ? (
              <div className="w-full">
                <CourseCardSkeleton count={6} />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-24 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl p-8 max-w-xl mx-auto shadow-2xl">
                <i className="fa-solid fa-folder-open text-6xl text-[#f9b03c]/60 mb-4 animate-bounce"></i>
                <h3 className="text-xl font-bold text-slate-200 mb-2">{t('no_courses_found')}</h3>
                <p className="text-sm text-slate-400">እባክዎ ሌላ ምድብ ወይም የፍለጋ ቃል ይሞክሩ</p>
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
                            
                            {/* Course Description */}
                            <p 
                              className="text-slate-300 text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5 font-body"
                              style={{ transform: 'translateZ(15px)' }}
                            >
                              {formatCourseDesc(course) || t('course_desc_placeholder')}
                            </p>
                            
                            {/* Metadata Glass Pills */}
                            <div 
                              className="flex flex-wrap gap-2 mb-2"
                              style={{ transform: 'translateZ(20px)' }}
                            >
                              <div className="flex items-center gap-1.5 bg-white/[0.04] text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                <i className="fa-regular fa-clock text-[#f9b03c] text-[10px]"></i>
                                <span>{course.duration || '00:50:00'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/[0.04] text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                <i className="fa-solid fa-layer-group text-[#f9b03c] text-[10px]"></i>
                                <span>{course.lessons?.length || 0} {t('course_lessons')}</span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-white/[0.04] text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-white/[0.08] backdrop-blur-md">
                                <i className="fa-solid fa-signal text-[#f9b03c] text-[10px]"></i>
                                <span>{course.level || 'ጀማሪ'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Price & Action Row (Bottom Glass Footer) */}
                        <div 
                          className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 mt-auto bg-white/[0.02]"
                          style={{ transform: 'translateZ(32px)' }}
                        >
                          <div>
                            {isFree ? (
                              <span className="text-xl sm:text-2xl font-black text-[#f9b03c] tracking-tight">
                                {t('course_free') || 'ነፃ (Free)'}
                              </span>
                            ) : (
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                  {Number(course.price).toLocaleString()} {t('course_currency') || 'ብር'}
                                </span>
                                {course.originalPrice && (
                                  <span className="text-xs sm:text-sm font-medium text-slate-500 line-through">
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
                              className="bg-white/[0.05] hover:bg-white/10 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition border border-white/10 flex items-center gap-1.5 cursor-pointer hover:border-[#f9b03c]/40 active:scale-95"
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

        const scale = 300 / (300 + p.z);
        const alpha = Math.max(0.15, Math.min(0.7, (p.z + 200) / 400)) * 0.65;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const lineAlpha = (1 - dist / 135) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#f9b03c';
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.75;
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
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-70"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    />
  );
}
