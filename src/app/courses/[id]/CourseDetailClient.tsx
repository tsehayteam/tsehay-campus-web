// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import Footer from '@/components/Footer';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl, getCleanCourseImage, getCourseSlug, getCourseBySlugOrId, mergeCoursesLists, subscribeToCourses } from '@/lib/courseCache';

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
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({ main: true, 0: true });

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
            setModules([{ id: 'main', title: 'Course Content', lessons: initialCourse.lessons }]);
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

        // 1. Fetch from artifacts/tsehaycampus-e1a6d/public/data/courses
        try {
          const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            loadedCourseData = courseSnap.data();
            loadedCourseId = courseSnap.id;
          }
        } catch (e) {}

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

        // 3. Fetch from artifacts/tsehaycampus-e1a6d/courses
        if (!loadedCourseData) {
          try {
            const altRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'courses', id);
            const altSnap = await getDoc(altRef);
            if (altSnap.exists()) {
              loadedCourseData = altSnap.data();
              loadedCourseId = altSnap.id;
            }
          } catch (e) {}
        }

        // 4. Fetch all live courses from Firestore
        let allList: any[] = [];
        try {
          const allCoursesQuery = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
          const allCoursesSnap = await getDocs(allCoursesQuery);
          if (!allCoursesSnap.empty) {
            allList = allCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        } catch (allErr) {}

        try {
          const rootQuery = query(collection(db, 'courses'));
          const rootSnap = await getDocs(rootQuery);
          if (!rootSnap.empty) {
            const rootDocs = rootSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            allList = mergeCoursesLists(allList, rootDocs);
          }
        } catch (rootErr) {}

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

        // Resolve by slug or ID match in live list
        if (!loadedCourseData && allList.length > 0) {
          const matched = findMatchingCourse(allList, id);
          if (matched) {
            loadedCourseData = matched;
            loadedCourseId = matched.id;
          }
        }

        // 5. Direct HTTP API fetch fallback with cache busting
        if (!loadedCourseData) {
          try {
            const res = await fetch(`/api/courses?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            const data = await res.json();
            if (data && data.success && data.course) {
              loadedCourseData = data.course;
              loadedCourseId = data.course.id || id;
            }
          } catch (e) {}
        }

        if (isMounted && loadedCourseData) {
          const cleanDesc = formatCourseDesc({ id: loadedCourseId, ...loadedCourseData });
          setCourse({ 
            id: loadedCourseId, 
            ...loadedCourseData,
            desc: cleanDesc,
            description: cleanDesc
          });
          
          let modulesList = [];
          
          if (loadedCourseData.lessons && loadedCourseData.lessons.length > 0) {
            modulesList = [{ id: 'main', title: 'Course Content', lessons: loadedCourseData.lessons }];
          } else if (loadedCourseData.modules && loadedCourseData.modules.length > 0) {
            modulesList = loadedCourseData.modules;
          } else {
            // Fallback for older courses that used the subcollection
            try {
              const modulesQuery = query(
                collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', loadedCourseId, 'modules'),
                orderBy('order', 'asc')
              );
              const modulesSnap = await getDocs(modulesQuery);
              modulesList = modulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (subErr) {
              console.warn("Subcollection modules query fallback:", subErr);
            }
          }
          
          setModules(modulesList);
          
          if (modulesList.length > 0) {
            setExpandedModules({ [modulesList[0].id || 'main']: true });
          }
        }

        // Fetch verified course reviews from Firestore across all possible locations
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
        } catch (revErr) {
          console.warn("Firestore reviews sync notice:", revErr);
        }

      } catch (error) {
        console.error("Error fetching live course data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCourseData();

    // 6. Live multi-channel subscription for instant zero-refresh updates
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
          setModules([{ id: 'main', title: 'Course Content', lessons: updatedMatch.lessons }]);
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

  // 🌟 Seamless Post-Login Action Continuity: Automatically resume Buy/Enroll where user left off!
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
      setShowPaymentModal(true);
    }
  };

  const isFree = course?.isFree || course?.price === 'Free' || course?.price === '0' || course?.price === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-amber-400/20 animate-ping"></div>
          <div className="w-16 h-16 rounded-full border-4 border-t-[#f9b03c] border-r-[#f9b03c] border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <p className="text-gray-400 text-sm font-bold tracking-wider animate-pulse">የኮርሱን መረጃ በማዘጋጀት ላይ...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#030509] text-white flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
          <i className="fa-solid fa-graduation-cap"></i>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black mb-3">ይቅርታ! የተፈለገው ኮርስ አልተገኘም</h2>
        <p className="text-gray-400 max-w-md mb-8">የተጠየቀው ኮርስ በአሁኑ ሰዓት ላይገኝ ይችላል። እባክዎ ሌሎች የተዘጋጁ ኮርሶችን ይመልከቱ።</p>
        <Link href="/courses" className="btn-buy-now-vibe px-8 py-3.5 rounded-2xl font-black text-sm">
          ሁሉንም ኮርሶች ይመልከቱ
        </Link>
      </div>
    );
  }

  const rawVideo = activeVideoUrl || course.previewVideoUrl || course.videoUrl || course.video || (course.lessons && course.lessons[0]?.video);
  const embedUrl = rawVideo ? (
    rawVideo.includes('embed') ? rawVideo :
    rawVideo.includes('watch?v=') ? rawVideo.replace('watch?v=', 'embed/') :
    rawVideo.includes('youtu.be/') ? rawVideo.replace('youtu.be/', 'www.youtube.com/embed/') :
    rawVideo
  ) : null;

  return (
    <div className="min-h-screen bg-[#030509] text-white selection:bg-[#f9b03c] selection:text-black">
      {/* Dynamic Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#f9b03c]/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-[#3268ba]/15 to-transparent rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link href="/" className="hover:text-white transition">መነሻ (Home)</Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-white transition">ኮርሶች (Courses)</Link>
          <span>/</span>
          <span className="text-[#f9b03c] font-bold truncate max-w-[200px] sm:max-w-xs">{course.title}</span>
        </div>

        {/* Hero Course Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Details & Curriculum (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              {/* Category & Rating Badges */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                  {course.category || 'Masterclass'}
                </span>
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-amber-400 font-bold">
                  <i className="fa-solid fa-star text-xs"></i>
                  <span>{course.ratingAvg || '4.9'}</span>
                  <span className="text-gray-400 font-normal">({course.reviewsCount || courseReviews.length || '34'} አስተያየቶች)</span>
                </div>
                {isFree ? (
                  <span className="bg-[#3268ba] text-white text-xs font-black px-3 py-1 rounded-full">FREE</span>
                ) : (
                  <span className="bg-gradient-to-r from-amber-500 to-[#f9b03c] text-black text-xs font-black px-3 py-1 rounded-full">PREMIUM</span>
                )}
              </div>

              {/* Course Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight text-white leading-tight mb-4">
                {course.title}
              </h1>

              {/* Course Subtitle/Description */}
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 font-normal">
                {course.desc || course.description || formatCourseDesc(course)}
              </p>

              {/* Instructor Capsule */}
              <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-2xl p-3.5 max-w-md">
                <img 
                  src={formatDriveImageUrl(course.instructorImage || course.instructorPhoto) || 'https://drive.google.com/thumbnail?id=1rdjkUc6ZwK6NbbgHaZ-7BtEi8A9aA5Uq&sz=w1000'} 
                  alt={course.instructor || 'Instructor'} 
                  className="w-12 h-12 rounded-xl object-cover border border-[#f9b03c]/40"
                />
                <div>
                  <span className="text-xs text-gray-400 block font-medium">አሰልጣኝ (Instructor)</span>
                  <h4 className="text-sm font-black text-white">{course.instructor || 'Eyoub Sahle'}</h4>
                  <span className="text-[11px] text-[#f9b03c] font-bold">{course.instructorTitle || 'Lead Instructor'}</span>
                </div>
              </div>
            </div>

            {/* What You Will Learn Card */}
            {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2 font-heading">
                  <i className="fa-solid fa-bullseye text-[#f9b03c]"></i>
                  <span>በዚህ ስልጠና ምን ያገኛሉ? (What you'll learn)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {course.whatYouWillLearn.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-300">
                      <i className="fa-solid fa-check text-emerald-400 text-xs mt-1 shrink-0"></i>
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Curriculum Modules Accordion */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white font-heading flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-[#f9b03c]"></i>
                  <span>የኮርሱ ይዘቶች (Curriculum)</span>
                </h3>
                <span className="text-xs text-gray-400">
                  {modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} ክፍሎች
                </span>
              </div>

              {modules.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
                  የኮርሱ ክፍሎች በቅርቡ ሙሉ በሙሉ ይዘረዘራሉ።
                </div>
              ) : (
                modules.map((mod, modIdx) => {
                  const isExpanded = expandedModules[mod.id] ?? true;
                  return (
                    <div key={mod.id || modIdx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-sm sm:text-base hover:bg-white/[0.03] transition cursor-pointer"
                      >
                        <span className="text-white flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-[#f9b03c]/20 text-[#f9b03c] text-xs font-black flex items-center justify-center">
                            {modIdx + 1}
                          </span>
                          <span>{mod.title || `Module ${modIdx + 1}`}</span>
                        </span>
                        <i className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                      </button>

                      {isExpanded && mod.lessons && mod.lessons.length > 0 && (
                        <div className="border-t border-white/10 divide-y divide-white/5">
                          {mod.lessons.map((lesson: any, lesIdx: number) => (
                            <div 
                              key={lesIdx}
                              onClick={() => {
                                if (lesson.video) {
                                  setActiveVideoUrl(lesson.video);
                                  setIsPlaying(true);
                                }
                              }}
                              className="p-3.5 sm:p-4 sm:pl-12 flex items-center justify-between hover:bg-white/[0.02] transition cursor-pointer group text-xs sm:text-sm"
                            >
                              <div className="flex items-center gap-3 text-gray-300 group-hover:text-white">
                                <i className="fa-solid fa-circle-play text-[#f9b03c] text-sm group-hover:scale-110 transition-transform"></i>
                                <span className="font-medium">{lesson.title}</span>
                              </div>
                              {lesson.duration && (
                                <span className="text-xs text-gray-400 font-mono">{lesson.duration}</span>
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

          {/* Right Column: Sticky Video Preview & Checkout Card (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="bg-slate-900/90 border border-white/15 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl p-6 sm:p-7 space-y-6">
              
              {/* Video Player / Thumbnail Preview */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-lg group">
                {isPlaying && embedUrl ? (
                  <iframe
                    src={`${embedUrl}?autoplay=1&rel=0`}
                    title="Course Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <div 
                    onClick={() => {
                      if (embedUrl) setIsPlaying(true);
                    }}
                    className="relative w-full h-full flex items-center justify-center cursor-pointer"
                  >
                    <img 
                      src={getCleanCourseImage(course) || 'https://placehold.co/600x400/3268BA/FFFFFF?text=Tsehay+Campus'} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#f9b03c] text-slate-950 flex items-center justify-center text-xl shadow-[0_0_30px_rgba(249,176,60,0.6)] group-hover:scale-110 transition-transform pl-1">
                        <i className="fa-solid fa-play"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Display */}
              <div>
                <span className="text-xs text-gray-400 uppercase font-black tracking-wider block mb-1">
                  የኮርሱ ዋጋ (Tuition Fee)
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-heading">
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
              <div className="space-y-3">
                {isFree ? (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="w-full btn-buy-now-vibe py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.4)] disabled:opacity-50"
                  >
                    {isEnrolling ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>በመመዝገብ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-arrow-right"></i>
                        <span>አሁን በነፃ ይጀምሩ (Start Free Now)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyClick}
                    className="w-full btn-buy-now-vibe py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(249,176,60,0.4)]"
                  >
                    <i className="fa-solid fa-cart-shopping"></i>
                    <span>አሁኑኑ ይግዙ (Buy Course Now)</span>
                  </button>
                )}

                <Link
                  href="/mentorship"
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-comments text-[#f9b03c]"></i>
                  <span>የ 1-ለ-1 ማማከር ይፈልጋሉ? (Book Mentorship)</span>
                </Link>
              </div>

              {/* Guarantees List */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-gray-300 font-medium">
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-infinity text-[#f9b03c]"></i>
                  <span>የህይወት ዘመን ሙሉ መዳረሻ (Lifetime Access)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-certificate text-[#f9b03c]"></i>
                  <span>የማጠናቀቂያ ህጋዊ ሰርተፊኬት (Shareable Certificate)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-mobile-screen text-[#f9b03c]"></i>
                  <span>በስልክ እና በኮምፒውተር መማር ይችላሉ</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <i className="fa-solid fa-headset text-[#f9b03c]"></i>
                  <span>የ 24/7 Tsehay AI መምህር ድጋፍ</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

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
          <div className="w-20 h-20 bg-amber-500/10 border-2 border-[#f9b03c] rounded-3xl flex items-center justify-center text-4xl text-[#f9b03c] mb-6 shadow-[0_0_30px_rgba(249,176,60,0.3)]">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">ኮርሱን መጫን አልተቻለም (Course Error)</h2>
          <p className="text-gray-400 max-w-md mb-8">እባክዎ እንደገና ይሞክሩ ወይም ወደ ሁሉም ኮርሶች ይመለሱ።</p>
          <div className="flex items-center gap-4">
            <a href="/courses" className="btn-buy-now-vibe px-8 py-3.5 rounded-2xl font-black text-sm">
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
