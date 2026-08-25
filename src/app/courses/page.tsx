// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import PaymentModal from '@/components/PaymentModal';
import RequireAuthModal from '@/components/RequireAuthModal';
import { useLanguage } from '@/context/LanguageContext';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

import SmartSearchInput from '@/components/SmartSearchInput';
import CourseCardSkeleton from '@/components/CourseCardSkeleton';
import Tilt3DCard from '@/components/3d/Tilt3DCard';
import { searchCourses } from '@/lib/smartSearch';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl } from '@/lib/courseCache';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>(() => {
    try {
      return getCachedCourses();
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return getCachedCourses().length === 0;
    } catch (e) {
      return true;
    }
  });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showRequireAuthModal, setShowRequireAuthModal] = useState(false);
  const [authCourseTarget, setAuthCourseTarget] = useState<any>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  // Restored Features: Search and Category Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    // Fetch courses from Firestore in real-time
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

  const openPaymentModal = async (course) => {
    const isFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;
    
    if (!user) {
      try {
        sessionStorage.setItem('tsehay_pending_course_action', JSON.stringify({
          type: isFree ? 'enroll_free' : 'buy',
          courseId: course.id,
          courseTitle: course.title,
          course: course
        }));
      } catch (e) {}
      setAuthCourseTarget(course);
      setShowRequireAuthModal(true);
      return;
    }

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
        } catch (authErr) {
          console.warn("Token fetch warning:", authErr);
        }

        // 4. Route to dashboard classroom
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        } else {
          router.push('/dashboard');
        }
      } catch (err: any) {
         console.error("Free enrollment failed:", err);
         if (typeof window !== 'undefined') {
           window.location.href = '/dashboard';
         } else {
           router.push('/dashboard');
         }
      } finally {
         setIsEnrolling(false);
      }
    } else {
      setSelectedCourse(course);
    }
  };

  const closePaymentModal = () => {
    setSelectedCourse(null);
  };

  const filteredCourses = (() => {
    let matched = searchQuery ? searchCourses(courses, searchQuery) : courses;

    if (selectedCategory === "All") return matched;
    if (selectedCategory === "Free") return matched.filter(course => course.price === "Free" || course.price === "0" || course.price === 0 || course.isFree);
    if (selectedCategory === "Paid") return matched.filter(course => course.price !== "Free" && course.price !== "0" && course.price !== 0 && !course.isFree);
    
    return matched.filter(course => course.category === selectedCategory);
  })();

  return (
    <React.Fragment>
      <main className="min-h-screen bg-slate-50 dark:bg-[#030509] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
        {/* 🌟 3D Deep Atmospheric Background Aura & Cyber Mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-b from-[#3268ba]/20 via-[#f9b03c]/10 to-transparent rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute top-[35%] -left-36 w-[550px] h-[550px] bg-[#3268ba]/15 dark:bg-[#3268ba]/20 rounded-full blur-[160px]"></div>
          <div className="absolute top-[60%] -right-36 w-[550px] h-[550px] bg-[#f9b03c]/15 dark:bg-[#f9b03c]/20 rounded-full blur-[160px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.035] dark:opacity-[0.02]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <section className="relative border-b border-gray-200/80 dark:border-white/[0.06] pt-10 pb-12 lg:pt-16 lg:pb-18 transition-colors duration-300 z-10">
          <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400/15 via-[#f9b03c]/10 to-amber-400/15 border border-[#f9b03c]/30 text-[#f9b03c] font-black px-5 py-2 rounded-full text-xs sm:text-sm mb-6 shadow-[0_0_20px_rgba(249,176,60,0.15)] backdrop-blur-md">
              <i className="fa-solid fa-graduation-cap text-[#f9b03c]"></i> {t('courses_badge')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight drop-shadow-sm font-heading tracking-tight">
              {t('courses_title_1')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3268ba] via-blue-400 to-[#f9b03c]">Tsehay Campus</span> {t('courses_title_2')}
            </h1>
            <div className="w-24 h-1.5 bg-gradient-to-r from-transparent via-[#f9b03c] to-transparent mx-auto rounded-full shadow-[0_0_12px_rgba(249,176,60,0.6)] mb-6"></div>
            <p className="text-gray-600 dark:text-[#8a95a5] text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed mb-10">
              {t('courses_subtitle')}
            </p>

            {/* Smart Semantic & Bilingual Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
                <SmartSearchInput 
                  courses={courses}
                  placeholder="ኮርሶችን ይፈልጉ (e.g. Social Media, Facebook, ዌብሳይት, Python)..."
                  onSearchChange={(searchResults, q) => {
                    setSearchQuery(q);
                  }}
                />
            </div>

            {/* Enhanced Categories including Free and Paid with Glassmorphic styling */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <button onClick={() => setSelectedCategory('All')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition shadow-sm ${selectedCategory === 'All' ? 'bg-[#f9b03c] text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.4)]' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>{t('cat_all')}</button>
                <button onClick={() => setSelectedCategory('Free')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Free' ? 'bg-[#3268ba] text-white border-[#3268ba] shadow-[0_0_15px_rgba(50,104,186,0.5)]' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md text-secondary dark:text-blue-300 hover:bg-[#3268ba] hover:text-white border-[#3268ba]/30'}`}>{t('cat_free')}</button>
                <button onClick={() => setSelectedCategory('Paid')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Paid' ? 'bg-[#f9b03c] text-slate-950 border-[#f9b03c] shadow-[0_0_15px_rgba(249,176,60,0.4)]' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md text-[#f9b03c] hover:bg-[#f9b03c] hover:text-slate-950 border-[#f9b03c]/30'}`}>{t('cat_paid')}</button>
                <div className="w-full sm:w-auto h-0 sm:h-8 border-l border-gray-300 dark:border-white/10 mx-2 hidden sm:block"></div>
                <button onClick={() => setSelectedCategory('Ecommerce')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Ecommerce' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>{t('cat_ecommerce')}</button>
                <button onClick={() => setSelectedCategory('Marketing')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Marketing' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>{t('cat_marketing')}</button>
                <button onClick={() => setSelectedCategory('Crypto')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Crypto' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>{t('cat_crypto')}</button>
                <button onClick={() => setSelectedCategory('Tech')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Tech' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md' : 'bg-white/80 dark:bg-white/[0.04] backdrop-blur-md border-gray-200/80 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}>{t('cat_tech')}</button>
            </div>
          </div>
        </section>
        
        <section className="py-10 sm:py-16 relative z-10">
          <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8">
            {loading && courses.length === 0 ? (
              <div className="w-full">
                <CourseCardSkeleton count={6} />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-24">
                <i className="fa-solid fa-folder-open text-6xl text-gray-300 dark:text-gray-700 mb-4 animate-bounce"></i>
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('no_courses_found')}</h3>
              </div>
            ) : (
              <div 
                className="grid gap-7 sm:gap-8"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}
              >
                {filteredCourses.map((course) => (
                  <Tilt3DCard
                    key={course.id}
                    maxTilt={10}
                    scale={1.02}
                    perspective={1100}
                    glare={true}
                    className="h-full group"
                  >
                    <div 
                      className="h-full course-card bg-white/90 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col justify-between border border-gray-200/80 dark:border-white/[0.08] hover:border-[#f9b03c]/60 dark:hover:border-[#f9b03c]/60 shadow-[0_15px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_70px_rgba(249,176,60,0.22),0_0_30px_rgba(50,104,186,0.15)] transition-all duration-500 cursor-pointer relative"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <div>
                        {/* Thumbnail Wrapper: 100% full view, non-cropped with ambient glow */}
                        <a 
                          href={`/courses/${course.id}`} 
                          className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center block cursor-pointer"
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
                            className="relative z-10 w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.04]" 
                          />
                          
                          {/* PREMIUM / FREE Badge */}
                          {(!course.isFree && course.price !== 0 && course.price !== '0' && course.price !== 'Free') ? (
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
                          
                          {/* CATEGORY Badge */}
                          {course.category && (
                            <div 
                              className="absolute bottom-3.5 left-3.5 z-20 bg-[#030509]/85 backdrop-blur-md text-[#f9b03c] border border-white/15 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md"
                              style={{ transform: 'translateZ(40px)' }}
                            >
                              {course.category}
                            </div>
                          )}
                        </a>
                        
                        {/* Content Details */}
                        <div className="p-6 sm:p-7">
                          <a href={`/courses/${course.id}`}>
                            <h3 
                              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading cursor-pointer"
                              style={{ transform: 'translateZ(25px)' }}
                            >
                              {course.title || t('course_unknown')}
                            </h3>
                          </a>
                          
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
                          
                          <p 
                            className="text-gray-600 dark:text-[#a0aec0] text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5 font-body"
                            style={{ transform: 'translateZ(15px)' }}
                          >
                            {formatCourseDesc(course) || t('course_desc_placeholder')}
                          </p>
                          
                          {/* Metadata Pills */}
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
                      
                      {/* Price & Action Row (Bottom) */}
                      <div 
                        className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3 mt-auto bg-slate-50/50 dark:bg-white/[0.01]"
                        style={{ transform: 'translateZ(32px)' }}
                      >
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
                        
                        <div className="flex items-center gap-2">
                          <a 
                            href={`/courses/${course.id}`} 
                            className="bg-gray-100/90 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/10 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition border border-gray-200/80 dark:border-white/10 flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-eye text-[#f9b03c]"></i>
                            <span>ይመልከቱ</span>
                          </a>
                          <button 
                            onClick={() => openPaymentModal(course)} 
                            disabled={isEnrolling} 
                            className="btn-shimmer-interactive px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-xs cursor-pointer active:scale-95 disabled:opacity-50 group font-black shadow-lg"
                          >
                            {(course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free') ? (
                              <>{isEnrolling ? 'እባክዎ ይጠብቁ...' : t('btn_go_to_class')} <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
                            ) : (
                              <>{t('btn_buy_course')} <i className="fa-solid fa-cart-shopping buy-icon-animated group-hover:scale-110 group-hover:-rotate-6 transition-transform"></i></>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Tilt3DCard>
                ))}
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

      {/* 🌟 Dedicated Friendly Authentication Required Modal */}
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
    </React.Fragment>
  );
}
