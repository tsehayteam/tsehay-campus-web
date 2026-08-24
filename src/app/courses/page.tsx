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
import { searchCourses } from '@/lib/smartSearch';
import { getCachedCourses, saveCachedCourses, formatCourseDesc, formatDriveImageUrl } from '@/lib/courseCache';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    // Instant cache fallback on client mount
    try {
      const cached = getCachedCourses();
      if (cached.length > 0) setCourses(cached);
    } catch (e) {}

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
      <main className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
        <section className="relative bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 pt-8 pb-10 lg:pt-12 lg:pb-16 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-secondary dark:text-blue-400 font-bold px-4 py-1.5 rounded-full text-xs sm:text-sm mb-6 shadow-sm">
              <i className="fa-solid fa-graduation-cap"></i> {t('courses_badge')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark dark:text-white mb-6 leading-tight drop-shadow-sm font-heading">
              {t('courses_title_1')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-500">Tsehay Campus</span> {t('courses_title_2')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed mb-10">
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

            {/* Enhanced Categories including Free and Paid */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <button onClick={() => setSelectedCategory('All')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition shadow-sm ${selectedCategory === 'All' ? 'bg-primary text-dark' : 'bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_all')}</button>
                <button onClick={() => setSelectedCategory('Free')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Free' ? 'bg-success text-white border-success' : 'bg-transparent text-success hover:bg-success hover:text-white border-success/30'}`}>{t('cat_free')}</button>
                <button onClick={() => setSelectedCategory('Paid')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Paid' ? 'bg-primary text-dark border-primary' : 'bg-transparent text-primary hover:bg-primary hover:text-dark border-primary/30'}`}>{t('cat_paid')}</button>
                <div className="w-full sm:w-auto h-0 sm:h-8 border-l border-gray-300 dark:border-gray-700 mx-2 hidden sm:block"></div>
                <button onClick={() => setSelectedCategory('Ecommerce')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Ecommerce' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_ecommerce')}</button>
                <button onClick={() => setSelectedCategory('Marketing')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Marketing' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_marketing')}</button>
                <button onClick={() => setSelectedCategory('Crypto')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Crypto' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_crypto')}</button>
                <button onClick={() => setSelectedCategory('Tech')} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition border ${selectedCategory === 'Tech' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_tech')}</button>
            </div>
          </div>
        </section>
        
        <section className="py-6 sm:py-12 relative">
          <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-[#f9b03c] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold tracking-widest uppercase text-xs sm:text-sm">{t('loading_courses_2')}</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-20">
                <i className="fa-solid fa-folder-open text-6xl text-gray-300 dark:text-gray-700 mb-4"></i>
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('no_courses_found')}</h3>
              </div>
            ) : (
              <div 
                className="grid gap-7 sm:gap-8"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}
              >
                {filteredCourses.map((course) => (
                  <div 
                    key={course.id} 
                    className="course-card bg-white/95 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col justify-between border border-slate-200/90 dark:border-white/[0.05] shadow-md dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] group cursor-pointer"
                  >
                    <div>
                      {/* Thumbnail Wrapper: 100% full view, non-cropped with ambient glow */}
                      <a href={`/courses/${course.id}`} className="relative aspect-video w-full overflow-hidden bg-slate-950 flex items-center justify-center block cursor-pointer">
                        <img 
                          src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                          alt="" 
                          aria-hidden="true" 
                          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none select-none" 
                        />
                        <img 
                          src={formatDriveImageUrl(course.image) || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} 
                          alt={course.title} 
                          className="relative z-10 w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.03]" 
                        />
                        
                        {/* PREMIUM / FREE Badge - Strictly Royal Blue / Gold (NO GREEN) */}
                        {(!course.isFree && course.price !== 0 && course.price !== '0' && course.price !== 'Free') ? (
                          <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-[#f9b03c] to-amber-500 text-slate-950 text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                            <i className="fa-solid fa-crown text-[10px]"></i> PREMIUM
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 z-20 bg-[#3268ba]/90 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-white/20">
                            <i className="fa-solid fa-sparkles text-[10px] text-[#f9b03c]"></i> FREE
                          </div>
                        )}
                        
                        {/* CATEGORY Badge */}
                        {course.category && (
                          <div className="absolute bottom-3 left-3 z-20 bg-[#030509]/85 backdrop-blur-md text-[#f9b03c] border border-white/10 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                            {course.category}
                          </div>
                        )}
                      </a>
                      
                      {/* Content Details (24px padding for breathing room) */}
                      <div className="p-6 sm:p-7">
                        <a href={`/courses/${course.id}`}>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2.5 line-clamp-2 leading-snug group-hover:text-[#f9b03c] transition-colors font-heading cursor-pointer">
                            {course.title || t('course_unknown')}
                          </h3>
                        </a>
                        
                        <div className="flex items-center justify-between gap-2 mb-3.5">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8a95a5] font-semibold">
                            <i className="fa-solid fa-chalkboard-user text-[#f9b03c]"></i>
                            <span>{course.instructor || 'Eyoub Sahle'}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-[#f9b03c]/10 text-[#f9b03c] font-black px-2 py-0.5 rounded-full text-xs border border-[#f9b03c]/20">
                            <i className="fa-solid fa-star text-[10px]"></i>
                            <span>{course.ratingAvg || '4.9'}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 dark:text-[#a0aec0] text-xs sm:text-[13.5px] leading-relaxed line-clamp-3 mb-5 font-body">
                          {formatCourseDesc(course) || t('course_desc_placeholder')}
                        </p>
                        
                        {/* Metadata Pills */}
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
                    
                    {/* Price & Action Row (Bottom) */}
                    <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-3 mt-auto">
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
                          className="bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/10 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition border border-gray-200/60 dark:border-white/10 flex items-center gap-1.5"
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
