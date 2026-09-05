// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import Footer from '@/components/Footer';
import TypingCourseTitle from '@/components/TypingCourseTitle';
import FormattedAiText from '@/components/FormattedAiText';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCleanCourseImage, getCourseSlug, getCourseBySlugOrId, mergeCoursesLists, subscribeToCourses, formatCleanCategory } from '@/lib/courseCache';
import { parseVideoEmbedUrl } from '@/lib/videoParser';

function CoursePreviewContent() {
  const routeParams = useParams();
  const rawId = routeParams?.id || '';
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [courseReviews, setCourseReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Accordion state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ main: true, 0: true, 1: true });

  // Payment/Enrollment states
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Helper to find matching course
    const findMatchingCourse = (list: any[], searchId: string) => {
      if (!list || list.length === 0) return null;
      return getCourseBySlugOrId(searchId, list) || null;
    };

    // Load from cached courses if present
    try {
      const cached = getCachedCourses();
      if (cached && cached.length > 0) {
        setAllCourses(cached);
        const initialCourse = findMatchingCourse(cached, id);
        if (initialCourse && isMounted) {
          const cleanDesc = formatCourseDesc({ id: initialCourse.id, ...initialCourse });
          setCourse({
            ...initialCourse,
            desc: cleanDesc,
            description: cleanDesc
          });
          if (initialCourse.lessons && initialCourse.lessons.length > 0) {
            setModules([{ id: 'main', title: 'የኮርሱ ይዘትና ክፍሎች', lessons: initialCourse.lessons }]);
          } else if (initialCourse.modules && initialCourse.modules.length > 0) {
            setModules(initialCourse.modules);
          }
          setLoading(false);
        }
      }
    } catch (e) {}

    const fetchCourseData = async () => {
      try {
        let loadedCourseData: any = null;
        let loadedCourseId = id;

        // 0. Authoritative Fetch from /api/courses (Supabase)
        try {
          const apiRes = await fetch(`/api/courses?id=${encodeURIComponent(id)}`);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.success && apiData.course) {
              loadedCourseData = apiData.course;
              loadedCourseId = apiData.course.id || id;
            }
          }
        } catch (e) {}

        // Fetch all courses from /api/courses
        let allList: any[] = [];
        try {
          const allRes = await fetch('/api/courses');
          if (allRes.ok) {
            const allData = await allRes.json();
            if (allData.courses && Array.isArray(allData.courses)) {
              allList = allData.courses;
            }
          }
        } catch (e) {}

        // 1. Fallback Fetch from artifacts/tsehaycampus-e1a6d/public/data/courses
        if (!loadedCourseData) {
          try {
            const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
              loadedCourseData = courseSnap.data();
              loadedCourseId = courseSnap.id;
            }
          } catch (e) {}
        }

        // 2. Fetch from root /courses
        if (!loadedCourseData) {
          try {
            const rootRef = doc(db, 'courses', id);
            const rootSnap = await getDoc(rootRef);
            if (rootSnap.exists()) {
              loadedCourseData = rootSnap.data();
              loadedCourseId = rootSnap.id;
            }
          } catch (e) {}
        }


        try {
          const altQuery = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'courses'));
          const altSnap = await getDocs(altQuery);
          if (!altSnap.empty) {
            const altDocs = altSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            allList = mergeCoursesLists(allList, altDocs);
          }
        } catch (altErr) {}

        if (allList.length > 0 && isMounted) {
          setAllCourses(allList);
          saveCachedCourses(allList);
        }

        if (!loadedCourseData && allList.length > 0) {
          const match = findMatchingCourse(allList, id);
          if (match) {
            loadedCourseData = match;
            loadedCourseId = match.id;
          }
        }

        if (loadedCourseData && isMounted) {
          const cleanDesc = formatCourseDesc({ id: loadedCourseId, ...loadedCourseData });
          setCourse({
            id: loadedCourseId,
            ...loadedCourseData,
            desc: cleanDesc,
            description: cleanDesc
          });

          let modulesList: any[] = [];
          if (loadedCourseData.modules && Array.isArray(loadedCourseData.modules) && loadedCourseData.modules.length > 0) {
            modulesList = loadedCourseData.modules;
          } else if (loadedCourseData.lessons && Array.isArray(loadedCourseData.lessons) && loadedCourseData.lessons.length > 0) {
            modulesList = [{ id: 'main', title: 'የኮርሱ ይዘትና ክፍሎች', lessons: loadedCourseData.lessons }];
          } else {
            try {
              const subCollRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', loadedCourseId, 'modules');
              const subCollSnap = await getDocs(subCollRef);
              if (!subCollSnap.empty) {
                modulesList = subCollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              }
            } catch (subErr) {}
          }
          
          setModules(modulesList);
          
          if (modulesList.length > 0) {
            setExpandedModules({ [modulesList[0].id || 'main']: true, 0: true });
          }
        }

        // Fetch verified course reviews
        try {
          const realReviews: any[] = [];
          if (loadedCourseData?.reviews && Array.isArray(loadedCourseData.reviews)) {
            realReviews.push(...loadedCourseData.reviews);
          }
          const reviewsRef = collection(db, "artifacts", "tsehaycampus-e1a6d", "public", "data", "reviews");
          const qReviews = query(reviewsRef, where("courseId", "==", loadedCourseId));
          const reviewSnaps = await getDocs(qReviews);
          reviewSnaps.forEach((doc) => {
            realReviews.push({ id: doc.id, ...doc.data() });
          });
          if (realReviews.length > 0 && isMounted) {
            setCourseReviews(realReviews);
          }
        } catch (revErr) {}

      } catch (error) {
        console.error("Error fetching live course data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCourseData();

    // Live multi-channel subscription for instant updates
    const unsubscribe = subscribeToCourses((coursesList) => {
      if (!isMounted || !Array.isArray(coursesList) || coursesList.length === 0) return;
      setAllCourses(coursesList);
      const updatedMatch = findMatchingCourse(coursesList, id);
      if (updatedMatch) {
        const cleanDesc = formatCourseDesc({ id: updatedMatch.id, ...updatedMatch });
        setCourse(prev => ({
          ...(prev || {}),
          ...updatedMatch,
          desc: cleanDesc,
          description: cleanDesc
        }));
        if (updatedMatch.lessons && updatedMatch.lessons.length > 0) {
          setModules([{ id: 'main', title: 'የኮርሱ ይዘትና ክፍሎች', lessons: updatedMatch.lessons }]);
        } else if (updatedMatch.modules && updatedMatch.modules.length > 0) {
          setModules(updatedMatch.modules);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  // Seamless Post-Login Action Continuity: Automatically resume Buy/Enroll
  useEffect(() => {
    const handleResume = () => {
      if (user && course) {
        try {
          const savedRaw = sessionStorage.getItem('tsehay_pending_course_action') || sessionStorage.getItem('tsehay_pending_action');
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved.courseId === course.id) {
              sessionStorage.removeItem('tsehay_pending_course_action');
              sessionStorage.removeItem('tsehay_pending_action');
              setShowRequireAuthModal(false);
              if (saved.type === 'buy' || saved.type === 'buy_course') {
                setShowPaymentModal(true);
              } else if (saved.type === 'enroll_free') {
                handleEnroll();
              }
            }
          }
        } catch (e) {}
      }
    };

    handleResume();
    window.addEventListener('tsehay_resume_pending_action', handleResume);
    window.addEventListener('tsehay_auth_state_changed', handleResume);
    return () => {
      window.removeEventListener('tsehay_resume_pending_action', handleResume);
      window.removeEventListener('tsehay_auth_state_changed', handleResume);
    };
  }, [user, course]);

  const handleBuyClick = () => {
    if (!user) {
      try {
        sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
          type: 'buy',
          courseId: course?.id,
          courseTitle: course?.title,
          course: course,
          returnUrl: `/courses/${course?.id}`
        }));
        sessionStorage.setItem('tsehay_pending_action', JSON.stringify({
          type: 'buy_course',
          courseId: course?.id,
          courseTitle: course?.title,
          course: course,
          returnUrl: `/courses/${course?.id}`
        }));
      } catch (e) {}
      setShowRequireAuthModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleEnrollClick = () => {
    if (!user) {
      try {
        sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
          type: 'enroll_free',
          courseId: course?.id,
          courseTitle: course?.title || 'ይህ ኮርስ'
        }));
      } catch (e) {}
      setShowRequireAuthModal(true);
      return;
    }
    handleEnroll();
  };

  const handleEnroll = async () => {
    if (!user) {
      handleEnrollClick();
      return;
    }

    const isFree = course?.isFree || course?.price === 'Free' || course?.price === '0' || course?.price === 0;

    if (isFree) {
      setIsEnrolling(true);
      try {
        try {
          const purchaseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
          await setDoc(purchaseRef, {
            courseId: course.id,
            amount: 0,
            paymentMethod: 'free',
            purchasedAt: serverTimestamp(),
            status: 'active'
          }, { merge: true });
        } catch (dbErr) {}

        try {
          localStorage.setItem('tsehay_user_active_course', JSON.stringify(course));
          if (course.lessons && course.lessons.length > 0) {
            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify({ ...course.lessons[0], moduleIndex: 0, lessonIndex: 0 }));
          }
        } catch (e) {}

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
      setShowPaymentModal(true);
    }
  };

  const isFree = course?.isFree || course?.price === 'Free' || course?.price === '0' || course?.price === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-[#f9b03c]/20 animate-ping"></div>
          <div className="w-16 h-16 rounded-full border-4 border-t-[#f9b03c] border-r-[#3268ba] border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm font-bold tracking-wider animate-pulse">የኮርሱን መረጃ በማዘጋጀት ላይ...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-20 h-20 bg-[#f9b03c]/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
          <i className="fa-solid fa-graduation-cap"></i>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black mb-3 font-heading">ይቅርታ! የተፈለገው ኮርስ አልተገኘም</h2>
        <p className="text-gray-400 max-w-md mb-8 text-sm">የተጠየቀው ኮርስ በአሁኑ ሰዓት ላይገኝ ይችላል። እባክዎ ሌሎች የተዘጋጁ ኮርሶችን ይመልከቱ።</p>
        <Link href="/courses" className="terafab-btn-primary px-8 py-3.5 rounded-2xl font-black text-sm">
          ሁሉንም ኮርሶች ይመልከቱ
        </Link>
      </div>
    );
  }

  const rawVideo = activeVideoUrl || course.previewVideoUrl || course.videoUrl || course.video || (course.lessons && course.lessons[0]?.video) || '';
  const parsedVideo = rawVideo ? parseVideoEmbedUrl(rawVideo, true) : null;

  return (
    <div className="min-h-screen bg-[#030509] text-white flex flex-col selection:bg-[#f9b03c]/30 selection:text-[#f9b03c]">
      <Navbar />

      {/* Dynamic Background Atmosphere (Dual Golden Yellow & Royal Blue Mesh) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/4 w-[650px] h-[650px] bg-gradient-to-br from-[#f9b03c]/10 to-transparent rounded-full blur-[160px] animate-pulse" />
        <div className="absolute top-1/3 right-10 w-[600px] h-[600px] bg-gradient-to-bl from-[#3268ba]/15 to-transparent rounded-full blur-[170px]" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-20">
        
        {/* Breadcrumb Navigation Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-gray-400 mb-8 backdrop-blur-xl">
          <Link href="/" className="hover:text-white transition flex items-center gap-1.5">
            <i className="fa-solid fa-house text-xs text-[#f9b03c]"></i>
            <span>መነሻ</span>
          </Link>
          <span className="text-gray-600">/</span>
          <Link href="/courses" className="hover:text-white transition">ኮርሶች</Link>
          <span className="text-gray-600">/</span>
          <span className="text-[#f9b03c] font-bold truncate max-w-[180px] sm:max-w-xs">{course.title}</span>
        </div>

        {/* Hero Course Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: Details, Curriculum, Highlights (7 Cols)    */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Main Header Block: Typing Title & Badges */}
            <div className="space-y-4">
              
              {/* Category, Rating & Status Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_20px_rgba(249,176,60,0.2)]">
                  {formatCleanCategory(course.category || course.tag || 'Masterclass')}
                </span>
                
                <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-[#f9b03c] font-black backdrop-blur-md">
                  <i className="fa-solid fa-star text-xs text-[#f9b03c] drop-shadow-[0_0_6px_#f9b03c]"></i>
                  <span>{course.ratingAvg || '4.9'}</span>
                  <span className="text-gray-400 font-normal ml-0.5">({course.reviewsCount || courseReviews.length || '34'} አስተያየቶች)</span>
                </div>

                {isFree ? (
                  <span className="bg-[#3268ba] text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(50,104,186,0.4)] border border-white/20">
                    ★ FREE
                  </span>
                ) : (
                  <span className="bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(249,176,60,0.5)]">
                    👑 PREMIUM
                  </span>
                )}
              </div>

              {/* 🌟 Cinematic Typing Title with Alternating Dual Glow Pulse */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-black font-heading tracking-tight leading-[1.15] text-white min-h-[70px] sm:min-h-[90px]">
                <TypingCourseTitle title={course.title} />
              </h1>

              {/* Instructor Capsule */}
              <div className="flex items-center gap-3.5 bg-slate-900/80 border border-white/10 rounded-2xl p-4 max-w-md backdrop-blur-xl shadow-lg">
                <img 
                  src={formatDriveImageUrl(course.instructorImage || course.instructorPhoto) || 'https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000'} 
                  alt={course.instructor || 'Instructor'} 
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#f9b03c]/40 shadow-md"
                />
                <div>
                  <span className="text-[10.5px] text-gray-400 block uppercase font-mono font-bold tracking-wider">ዋና አሰልጣኝ (Lead Instructor)</span>
                  <h4 className="text-sm font-black text-white">{course.instructor || 'Eyoub Sahle'}</h4>
                  <span className="text-xs text-[#f9b03c] font-bold flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-[11px]"></i>
                    <span>{course.instructorTitle || 'Expert Course Instructor'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Course Description Card (Pop-up Reveal with Rich Typography) */}
            <div className="course-section-popout bg-slate-900/85 border border-white/10 hover:border-[#f9b03c]/40 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2.5 font-heading">
                <i className="fa-solid fa-circle-info text-[#f9b03c]"></i>
                <span>ስለ ኮርሱ አጭር ማብራሪያ (Course Overview)</span>
              </h3>
              <div className="text-gray-200 text-sm sm:text-base leading-relaxed font-body">
                <FormattedAiText text={course.desc || course.description || formatCourseDesc(course)} />
              </div>
            </div>

            {/* What You Will Learn Card */}
            {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
              <div className="course-section-popout bg-slate-900/85 border border-white/10 hover:border-[#3268ba]/50 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300">
                <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2.5 font-heading">
                  <i className="fa-solid fa-bullseye text-[#f9b03c]"></i>
                  <span>በዚህ ስልጠና ምን ያገኛሉ? (What You Will Learn)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {course.whatYouWillLearn.map((item: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#f9b03c]/30 transition group"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                        <i className="fa-solid fa-check text-[10px]"></i>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-200 leading-snug font-body">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Curriculum Modules Accordion */}
            <div className="course-section-popout space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white font-heading flex items-center gap-2.5">
                  <i className="fa-solid fa-layer-group text-[#f9b03c]"></i>
                  <span>የኮርሱ ይዘቶችና ክፍሎች (Curriculum)</span>
                </h3>
                <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-mono font-bold">
                  {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} ክፍሎች
                </span>
              </div>

              {modules.length === 0 ? (
                <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
                  የኮርሱ ክፍሎች በቅርቡ ሙሉ በሙሉ ይዘረዘራሉ።
                </div>
              ) : (
                modules.map((mod, modIdx) => {
                  const isExpanded = expandedModules[mod.id] ?? true;
                  return (
                    <div key={mod.id || modIdx} className="bg-slate-900/85 border border-white/10 rounded-2xl overflow-hidden shadow-lg transition">
                      <button
                        type="button"
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-sm sm:text-base hover:bg-white/[0.04] transition cursor-pointer"
                      >
                        <span className="text-white flex items-center gap-3 font-heading">
                          <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#3268ba] to-[#1e4585] text-white text-xs font-black flex items-center justify-center shadow-md">
                            {modIdx + 1}
                          </span>
                          <span className="text-sm sm:text-base">{mod.title || `Module ${modIdx + 1}`}</span>
                        </span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#f9b03c]' : ''}`}></i>
                      </button>

                      {isExpanded && mod.lessons && mod.lessons.length > 0 && (
                        <div className="border-t border-white/10 divide-y divide-white/5 bg-black/30">
                          {mod.lessons.map((lesson: any, lesIdx: number) => (
                            <div 
                              key={lesIdx}
                              onClick={() => {
                                if (lesson.video) {
                                  setActiveVideoUrl(lesson.video);
                                  setIsPlaying(true);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className="p-3.5 sm:p-4 sm:pl-14 flex items-center justify-between hover:bg-white/[0.03] transition cursor-pointer group text-xs sm:text-sm"
                            >
                              <div className="flex items-center gap-3 text-gray-300 group-hover:text-white">
                                <i className="fa-solid fa-circle-play text-[#3268ba] group-hover:text-[#f9b03c] text-sm group-hover:scale-110 transition-transform duration-300"></i>
                                <span className="font-medium font-body">{lesson.title}</span>
                              </div>
                              {lesson.duration && (
                                <span className="text-xs text-gray-400 font-mono bg-white/5 px-2.5 py-0.5 rounded-md">{lesson.duration}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: Sticky Video Preview & Checkout Card       */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <div className="bg-slate-900/90 border border-white/15 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl p-6 sm:p-7 space-y-6">
              
              {/* Video Player / Thumbnail Preview */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg group">
                {isPlaying && parsedVideo ? (
                  parsedVideo.type === 'video' ? (
                    <video 
                      src={parsedVideo.src} 
                      controls 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <iframe
                      src={parsedVideo.src}
                      title="Course Preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-none"
                    />
                  )
                ) : (
                  <div 
                    onClick={() => {
                      if (parsedVideo) setIsPlaying(true);
                    }}
                    className="relative w-full h-full flex items-center justify-center cursor-pointer"
                  >
                    <img 
                      src={getCleanCourseImage(course) || 'https://placehold.co/600x400/3268BA/FFFFFF?text=Tsehay+Campus'} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/45 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#f9b03c] text-slate-950 flex items-center justify-center text-xl shadow-[0_0_30px_rgba(249,176,60,0.6)] group-hover:scale-110 transition-transform pl-1 animate-pulse">
                        <i className="fa-solid fa-play"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Display with Discount Savings */}
              <div className="pt-2">
                <span className="text-xs text-gray-400 uppercase font-mono font-black tracking-wider block mb-1">
                  የኮርሱ ክፍያ (Tuition Fee)
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-heading tracking-tight">
                    {isFree ? 'ነፃ (Free)' : `${Number(course.price || 0).toLocaleString()} ETB`}
                  </span>
                  {course.oldPrice && Number(course.oldPrice) > Number(course.price) && (
                    <span className="text-base text-gray-500 line-through font-bold">
                      {Number(course.oldPrice).toLocaleString()} ETB
                    </span>
                  )}
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-3 pt-1">
                {isFree ? (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="w-full terafab-btn-primary py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.45)] disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    {isEnrolling ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>በመመዝገብ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <span>አሁን በነፃ ይጀምሩ (Start Free Now)</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyClick}
                    className="w-full terafab-btn-primary py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.45)] hover:scale-[1.02] transition-transform"
                  >
                    <i className="fa-solid fa-cart-shopping"></i>
                    <span>አሁኑኑ ይግዙ (Buy Course Now)</span>
                  </button>
                )}

                <Link
                  href="/mentorship"
                  className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-comments text-[#f9b03c]"></i>
                  <span>የ 1-ለ-1 ማማከር ይፈልጋሉ? (Book Mentorship)</span>
                </Link>
              </div>

              {/* Guarantees List */}
              <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-gray-300 font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-xs shrink-0">
                    <i className="fa-solid fa-infinity"></i>
                  </div>
                  <span>የህይወት ዘመን ሙሉ መዳረሻ (Lifetime Access)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-xs shrink-0">
                    <i className="fa-solid fa-certificate"></i>
                  </div>
                  <span>የማጠናቀቂያ ህጋዊ ሰርተፊኬት (Shareable Certificate)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#3268ba]/20 text-[#5a93e8] flex items-center justify-center text-xs shrink-0">
                    <i className="fa-solid fa-mobile-screen"></i>
                  </div>
                  <span>በስልክ እና በኮምፒውተር መማር ይችላሉ</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0">
                    <i className="fa-solid fa-headset"></i>
                  </div>
                  <span>የ 24/7 Tsehay AI መምህር ድጋፍ</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal course={course} onClose={() => setShowPaymentModal(false)} />
      )}

      {/* Require Auth Modal */}
      <RequireAuthModal
        isOpen={showRequireAuthModal}
        onClose={() => setShowRequireAuthModal(false)}
        courseTitle={course?.title}
        courseImage={course?.image}
        isFree={isFree}
        onContinueAuth={(isSignup) => {
          setShowRequireAuthModal(false);
          window.dispatchEvent(new CustomEvent('open-auth-modal', { 
            detail: { isSignupMode: isSignup, isSignUp: isSignup } 
          }));
        }}
      />
    </div>
  );
}

class CourseErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CoursePreview error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-20 h-20 bg-[#f9b03c]/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3 font-heading">ኮርሱን መጫን አልተቻለም (Course Error)</h2>
          <p className="text-gray-400 max-w-md mb-8 text-sm">እባክዎ እንደገና ይሞክሩ ወይም ወደ ሁሉም ኮርሶች ይመለሱ።</p>
          <div className="flex items-center gap-4">
            <a href="/courses" className="terafab-btn-primary px-8 py-3.5 rounded-2xl font-black text-sm">
              ሁሉንም ኮርሶች ይመልከቱ
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CourseDetailPage() {
  return (
    <CourseErrorBoundary>
      <CoursePreviewContent />
    </CourseErrorBoundary>
  );
}
