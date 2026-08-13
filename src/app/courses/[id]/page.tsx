// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import PaymentModal from '@/components/PaymentModal';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import { getCachedCourses } from '@/lib/courseCache';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function CoursePreviewPage() {
  const routeParams = useParams();
  const rawId = routeParams?.id || '';
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [allCourses, setAllCourses] = useState<any[]>(() => getCachedCourses());
  const [course, setCourse] = useState<any>(() => {
    if (!id) return null;
    try {
      const cached = getCachedCourses();
      return cached.find((c: any) => c.id === id) || null;
    } catch (e) {
      return null;
    }
  });
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Accordion state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Payment/Enrollment states
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchCourseData = async () => {
      try {
        // 1. Fetch current course details
        const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id);
        const courseSnap = await getDoc(courseRef);
        
        if (isMounted && courseSnap.exists()) {
          const courseData = courseSnap.data();
          setCourse({ id: courseSnap.id, ...courseData });
          
          let modulesList = [];
          
          if (courseData.lessons && courseData.lessons.length > 0) {
            modulesList = [{ id: 'main', title: 'Course Content', lessons: courseData.lessons }];
          } else if (courseData.modules && courseData.modules.length > 0) {
            modulesList = courseData.modules;
          } else {
            // Fallback for older courses that used the subcollection
            try {
              const modulesQuery = query(
                collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id, 'modules'),
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

        // 2. Fetch all courses dynamically to compute instructor metrics and live course count
        try {
          const allCoursesQuery = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses'));
          const allCoursesSnap = await getDocs(allCoursesQuery);
          if (isMounted && !allCoursesSnap.empty) {
            const list = allCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllCourses(list);
            saveCachedCourses(list);
          }
        } catch (allErr) {
          console.warn("All courses fetch fallback:", allErr);
        }
      } catch (error) {
        console.error("Error fetching course data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCourseData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleEnroll = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }

    const isFree = course?.isFree || course?.price === 'Free' || course?.price === '0' || course?.price === 0;

    if (isFree) {
      setIsEnrolling(true);
      try {
        const docRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', course.id);
        await setDoc(docRef, {
            courseId: course.id,
            amount: 0,
            purchasedAt: serverTimestamp(),
            status: 'active'
        });
        router.push('/dashboard');
      } catch (error) {
        console.error("Error enrolling in free course", error);
        alert("Failed to enroll. Please try again.");
      } finally {
        setIsEnrolling(false);
      }
    } else {
      setShowPaymentModal(true);
    }
  };

  const totalLessons = (modules || []).reduce((total, mod) => total + (mod?.lessons?.length || 0), 0);
  const isFreeCourse = course?.isFree || course?.price === 'Free' || course?.price === '0' || course?.price === 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex justify-center items-center bg-gray-50 dark:bg-dark">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex justify-center items-center bg-gray-50 dark:bg-dark text-center px-4">
        <div className="max-w-md bg-white dark:bg-[#1c1d1f] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
          <i className="fa-solid fa-triangle-exclamation text-6xl text-amber-500 mb-4"></i>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">ኮርሱ አልተገኘም (Course Not Found)</h2>
          <p className="text-gray-500 text-sm mb-6">የፈለጉት ኮርስ አልተገኘም ወይም ተወግዷል። እባክዎ ወደ ሁሉም ኮርሶች ይመለሱ።</p>
          <button onClick={() => router.push('/courses')} className="bg-primary hover:bg-yellow-400 text-dark font-black px-6 py-3 rounded-xl transition">
            ወደ ሁሉም ኮርሶች ይመለሱ
          </button>
        </div>
      </div>
    );
  }

  const extractIframeSrc = (url: any) => {
    if (!url || typeof url !== 'string') return null;
    let clean = url.trim();
    if (clean.includes('<iframe') && clean.includes('src="')) {
      const match = clean.match(/src="([^"]+)"/);
      if (match) clean = match[1];
    }
    clean = clean.replace(/&amp;/g, '&');
    return clean;
  };

  const previewVideoUrl = extractIframeSrc(course?.video);
  const defaultVideoUrl = previewVideoUrl || extractIframeSrc(course?.videoUrl) || (modules.length > 0 && modules[0].lessons?.length > 0 ? extractIframeSrc(modules[0].lessons[0].videoUrl) : null);
  const currentVideoUrl = activeVideoUrl ? extractIframeSrc(activeVideoUrl) : defaultVideoUrl;

  const fixDriveLink = (url: any) => {
    if (!url || typeof url !== 'string') return url;
    const match = url.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
  };
  
  const displayImage = fixDriveLink(course?.image);
  const displayInstructorImage = fixDriveLink(course?.instructorImage);
  const displayBanner = fixDriveLink(course?.banner);

  const formatPrice = (val: any) => {
    if (typeof val === 'number') return val.toLocaleString();
    const num = Number(String(val || '').replace(/[^0-9.]/g, ''));
    return isNaN(num) || num === 0 ? '4,500' : num.toLocaleString();
  };

  const instructorName = course?.instructorName || course?.instructor || 'Eyoub Sahle';

  // Find all courses taught by this instructor (case-insensitive)
  const instructorCourses = (allCourses || []).filter(c => {
    const inst = (c.instructor || c.instructorName || '').trim().toLowerCase();
    const target = instructorName.trim().toLowerCase();
    if (!inst && (target.includes('eyoub') || target.includes('ኢዮብ'))) return true;
    return inst === target || (target.includes('eyoub') && inst.includes('eyoub')) || (target.includes('ኢዮብ') && inst.includes('ኢዮብ'));
  });

  const instructorCoursesCount = Math.max(instructorCourses.length, course?.instructorCourses || 1);

  let totalReviews = 0;
  let totalRatingsSum = 0;
  let ratingEntries = 0;
  let totalStudents = 0;

  instructorCourses.forEach(c => {
    const rCount = Number(c.ratingCount || c.reviewsCount) || 0;
    totalReviews += rCount;
    const rAvg = Number(c.ratingAvg || c.rating);
    if (!isNaN(rAvg) && rAvg > 0) {
      totalRatingsSum += rAvg;
      ratingEntries++;
    }
    const stCount = Number(c.studentsCount || c.students) || 0;
    totalStudents += stCount;
  });

  // Calculate synchronized instructor rating
  const instructorRatingScore = ratingEntries > 0 
    ? Number((totalRatingsSum / ratingEntries).toFixed(1))
    : Number(course?.instructorRatingAvg || course?.instructorRating || course?.ratingAvg || course?.rating || 4.9);
  const instructorRatingFormatted = instructorRatingScore.toFixed(1);

  // Course rating
  const courseRatingScore = Number(course?.ratingAvg || course?.rating || 4.9);
  const courseRatingFormatted = courseRatingScore.toFixed(1);

  // Course reviews and students
  const courseReviewsCount = Number(course?.ratingCount || course?.reviewsCount || (totalReviews > 0 ? Math.max(1, Math.round(totalReviews / Math.max(1, instructorCoursesCount))) : 18));
  const courseStudentsCount = Number(course?.studentsCount || course?.students || (course?.isPopular ? 185 : 120));

  // Instructor total reviews (realistic count, not 120!)
  const instructorReviewsCount = totalReviews > 0 ? totalReviews : (Number(course?.instructorReviews) && course?.instructorReviews < 60 ? course?.instructorReviews : 28);

  // Instructor total students (realistic count ~420, always consistent with landing page 500+)
  const instructorStudentsCount = totalStudents > 0 
    ? Math.min(totalStudents, 480) 
    : (Number(course?.instructorStudents) && course?.instructorStudents <= 500 ? course?.instructorStudents : 420);

  const renderStars = (ratingNum: number) => {
    const score = Math.max(0, Math.min(5, Number(ratingNum) || 5));
    const fullStars = Math.floor(score);
    const decimal = score - fullStars;
    const hasHalfStar = decimal >= 0.3 && decimal <= 0.7;
    const extraFull = decimal > 0.7 ? 1 : 0;
    const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0) - extraFull);

    return (
      <div className="flex text-amber-400 text-xs items-center gap-0.5" aria-label={`Rating: ${score} out of 5`}>
        {[...Array(fullStars + extraFull)].map((_, i) => (
          <i key={`full-${i}`} className="fa-solid fa-star"></i>
        ))}
        {hasHalfStar && <i key="half" className="fa-solid fa-star-half-stroke"></i>}
        {[...Array(emptyStars)].map((_, i) => (
          <i key={`empty-${i}`} className="fa-regular fa-star text-gray-400/50"></i>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Dark Header Section */}
      <div className="hero-mesh text-white pt-24 md:pt-28 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {displayBanner && (
          <div className="absolute inset-0 z-0">
            <img src={displayBanner} alt="Course Banner" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B]/90 to-transparent"></div>
          </div>
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay z-0"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 relative z-10">
          <div className="w-full md:w-2/3 pr-0 md:pr-12 lg:pr-24">
            <div className="text-blue-100 text-sm font-bold flex gap-2 items-center mb-6">
              <span className="cursor-pointer hover:text-white transition" onClick={() => router.push('/courses')}>{course?.category || 'Tech'}</span>
              {course?.title && (
                <>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  <span className="cursor-pointer hover:text-white transition">{course.title}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black font-heading mb-4 leading-tight text-primary">
              {course.title}
            </h1>
            <p className="text-lg md:text-xl mb-6 text-blue-100 line-clamp-3">
              {course?.desc || "No description provided for this course."}
            </p>
            
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              {course?.isPopular && (
                <div className="bg-primary text-dark font-black px-2 py-1 text-xs rounded-sm shadow-sm">
                  Bestseller
                </div>
              )}
              <div className="flex items-center gap-2 text-primary font-black">
                <span className="text-base">{courseRatingFormatted}</span>
                {renderStars(courseRatingScore)}
              </div>
              <span className="text-blue-100 underline font-bold">({courseReviewsCount} ratings)</span>
              <span className="text-blue-100">{courseStudentsCount.toLocaleString()} students</span>
            </div>

            <div className="text-sm mb-4 flex flex-wrap items-center gap-3">
              <span>Created by <span className="text-primary font-black">{instructorName}</span></span>
              <span className="bg-amber-400/20 text-amber-300 font-black px-3 py-1 rounded-full text-xs border border-amber-400/40 shadow-xs flex items-center gap-1.5">
                <i className="fa-solid fa-star text-amber-400"></i>
                <span>{instructorRatingFormatted} (Instructor Rating)</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>Last updated 5/2026</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-globe"></i>
                <span>{course.language || 'English / Amharic'}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-signal"></i>
                <span>{course.level || 'ጀማሪ (Beginner)'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-12 relative">
        <div className="w-full md:w-2/3">
          {/* What you'll learn */}
          <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-sm mb-10">
            <h2 className="text-2xl font-black font-heading text-secondary dark:text-primary mb-6">What you&apos;ll learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
              {course.whatYouWillLearn && Array.isArray(course.whatYouWillLearn) && course.whatYouWillLearn.length > 0 ? (
                course.whatYouWillLearn.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <i className="fa-solid fa-check mt-1"></i>
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No learning objectives specified for this course.</div>
              )}
            </div>
          </div>

          {/* Course Content */}
          <h2 className="text-2xl font-black font-heading text-secondary dark:text-primary mb-4">Course content</h2>
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
            <div>
              <span>{modules.length} sections</span> • <span>{totalLessons} lectures</span> • <span>{course.duration || '22h 45m'} total length</span>
            </div>
            <button 
              onClick={() => {
                const allExpanded = Object.keys(expandedModules).length === modules.length;
                if (allExpanded) {
                  setExpandedModules({});
                } else {
                  const expandAll = {};
                  modules.forEach(m => { expandAll[m.id] = true; });
                  setExpandedModules(expandAll);
                }
              }}
              className="text-primary font-bold hover:underline"
            >
              {Object.keys(expandedModules).length === modules.length ? 'Collapse all sections' : 'Expand all sections'}
            </button>
          </div>

          <div className="border border-gray-300 dark:border-gray-700 rounded-sm mb-10">
            {modules.map((mod, index) => (
              <div key={mod.id || index} className="border-b border-gray-300 dark:border-gray-700 last:border-b-0">
                <button 
                  onClick={() => toggleModule(mod.id || `mod_${index}`)}
                  className="w-full text-left px-4 py-4 bg-gray-50 dark:bg-[#111111] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] flex justify-between items-center transition-colors"
                >
                  <div className="flex items-center gap-3 font-bold text-dark dark:text-white">
                    <i className={`fa-solid fa-chevron-${expandedModules[mod.id || `mod_${index}`] ? 'up' : 'down'} text-xs`}></i>
                    <span>{mod.title}</span>
                  </div>
                  <div className="text-sm text-gray-500 font-normal">
                    {mod.lessons?.length || 0} lectures
                  </div>
                </button>
                
                {expandedModules[mod.id || `mod_${index}`] && (
                  <div className="px-4 py-2 bg-white dark:bg-[#0a0a0a]">
                    {mod.lessons?.map((lesson: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 group">
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <i className="fa-solid fa-circle-play text-secondary dark:text-primary group-hover:scale-110 transition-transform"></i>
                          <span className={i === 0 && index === 0 ? "text-primary underline cursor-pointer font-bold" : ""}>
                            {lesson.title}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-4">
                          {(i === 0 && index === 0) && (
                            <span onClick={() => { const vid = lesson.video || lesson.videoUrl; if(vid) { setActiveVideoUrl(vid); setIsPlaying(true); window.scrollTo({top: 0, behavior: 'smooth'}); } }} className="text-primary font-bold underline cursor-pointer hover:text-secondary">Preview</span>
                          )}
                          <span>{lesson.duration || '10:00'}</span>
                        </div>
                      </div>
                    ))}
                    {(!mod.lessons || mod.lessons.length === 0) && (
                      <div className="text-sm text-gray-500 py-2">No lessons available yet.</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Requirements */}
          <h2 className="text-2xl font-black font-heading text-secondary dark:text-primary mb-4">Requirements</h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300 mb-10">
            {course.requirements && Array.isArray(course.requirements) && course.requirements.length > 0 ? (
              course.requirements.map((req: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm sm:text-base font-medium">
                  <i className="fa-solid fa-circle-check text-green-500 mt-1 shrink-0"></i>
                  <span>{req}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 italic list-none">No requirements specified for this course.</li>
            )}
          </ul>

          {/* Instructor Section */}
          <div className="mb-10 border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-2xl font-black font-heading text-secondary dark:text-primary mb-6">Instructor</h2>
            
            <div className="mb-4">
              <span className="text-xl font-bold text-secondary font-heading">
                {instructorName}
              </span>
              <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {course?.instructorTitle || 'Leading Online Skills & Business Instructor'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-4">
              <img 
                src={displayInstructorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=F9B03C&color=fff&size=128`} 
                onError={(e) => { 
                  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=F9B03C&color=fff&size=128`;
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                alt="Instructor" 
                className="w-28 h-28 rounded-full object-cover shrink-0 border-2 border-gray-100 dark:border-gray-800 shadow-md" 
              />
              <div className="flex flex-col justify-center space-y-2 text-sm text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-star text-[#f69c08]"></i>
                  <span className="font-bold">{instructorRatingFormatted} Instructor Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-award text-primary"></i>
                  <span>{instructorReviewsCount.toLocaleString()} Reviews</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-user-group text-blue-500"></i>
                  <span>{instructorStudentsCount.toLocaleString()} Students</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-play text-emerald-500"></i>
                  <span>{instructorCoursesCount} {instructorCoursesCount === 1 ? 'Course' : 'Courses'}</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4 leading-relaxed max-w-3xl">
              <p>
                {course?.instructorBio || 'በኢ-ኮሜርስ፣ ዲጂታል ማርኬቲንግ እና ክሪፕቶ ከረንሲ ዘርፍ የብዙ አመታት የተግባር ልምድ ያለው እና በመቶዎች የሚቆጠሩ ተማሪዎችን ወደ ስኬት ያበቃ ባለሙያ።'}
              </p>
            </div>

            {/* More Courses by this Instructor */}
            {instructorCourses.filter(c => c.id !== course.id).length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-book-open text-primary"></i>
                  <span>{instructorName} የሚያስተምሯቸው ሌሎች ኮርሶች ({instructorCourses.filter(c => c.id !== course.id).length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {instructorCourses.filter(c => c.id !== course.id).slice(0, 4).map((otherCourse) => (
                    <div 
                      key={otherCourse.id} 
                      onClick={() => router.push(`/courses/${otherCourse.id}`)}
                      className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary transition cursor-pointer flex gap-3 items-center bg-gray-50 dark:bg-[#111111] group shadow-xs hover:shadow-md"
                    >
                      <img 
                        src={fixDriveLink(otherCourse.image) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200'} 
                        alt={otherCourse.title} 
                        className="w-16 h-12 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {otherCourse.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                          <span className="text-amber-500 font-bold flex items-center gap-0.5">
                            <i className="fa-solid fa-star text-[10px]"></i> {otherCourse.ratingAvg || otherCourse.rating || 4.9}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-primary">
                            {(otherCourse.isFree || otherCourse.price === 0 || otherCourse.price === '0') ? 'FREE' : `${formatPrice(otherCourse.price)} ETB`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sticky Card) */}
        <div className="w-full md:w-1/3">
          <div className="md:sticky md:top-24 bg-white dark:bg-[#1c1d1f] border border-gray-200 dark:border-gray-800 shadow-xl rounded-sm overflow-hidden z-10 md:-mt-[350px]">
            {/* Video Preview Thumbnail */}
            <div className="relative group border-b border-gray-200 dark:border-gray-800 overflow-hidden rounded-t-sm">
              {isPlaying && currentVideoUrl ? (
                <div className="w-full aspect-video bg-black overflow-hidden relative">
                  {(() => {
                      let finalUrl = currentVideoUrl;
                      if (finalUrl.includes('mediadelivery.net')) {
                          return (
                              <iframe
                                  src={finalUrl}
                                  loading="lazy"
                                  className="w-full h-full border-none block"
                                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                  allowFullScreen
                              ></iframe>
                          );
                      } else if (finalUrl.includes('drive.google.com')) {
                          return (
                              <iframe
                                  src={finalUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview')}
                                  loading="lazy"
                                  className="w-full h-full border-none block"
                                  allow="autoplay; encrypted-media"
                                  allowFullScreen
                              ></iframe>
                          );
                      } else {
                          return (
                              <ReactPlayer
                                key={finalUrl}
                                url={finalUrl}
                                width="100%"
                                height="100%"
                                controls={true}
                                playing={true}
                                className="w-full h-full"
                              />
                          );
                      }
                  })()}
                </div>
              ) : (
                <div className="cursor-pointer relative w-full aspect-video bg-black overflow-hidden" onClick={() => { if (currentVideoUrl) setIsPlaying(true); }}>
                  <img src={displayImage || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} alt={course.title} className="w-full h-full object-cover block" onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop' }} />
                  {currentVideoUrl && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center group-hover:bg-black/20 transition-colors">
                      <div className="w-16 h-16 bg-white rounded-full flex justify-center items-center text-dark text-2xl shadow-lg transform group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-play ml-1 text-primary"></i>
                      </div>
                      <span className="text-white font-bold mt-4 shadow-sm">Preview this course</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-6">
              <div className="mb-4">
                {isFreeCourse ? (
                  <span className="text-4xl font-black text-dark dark:text-white">FREE</span>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-dark dark:text-white">{formatPrice(course?.price)} ETB</span>
                    {course?.originalPrice && (
                      <span className="text-lg text-gray-500 line-through">{formatPrice(course.originalPrice)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mb-6">
                {isFreeCourse ? (
                  <button 
                    onClick={handleEnroll} 
                    disabled={isEnrolling}
                    className="w-full bg-primary hover:bg-yellow-400 text-dark font-black py-3.5 rounded-xl transition-all duration-300 text-lg shadow-[0_0_20px_rgba(249,176,60,0.3)] hover:shadow-[0_0_30px_rgba(249,176,60,0.5)] transform hover:-translate-y-1"
                  >
                    {isEnrolling ? 'Processing...' : 'Enroll Now'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-primary hover:bg-yellow-400 text-dark font-black py-3.5 rounded-xl transition-all duration-300 text-lg shadow-[0_0_20px_rgba(249,176,60,0.3)] hover:shadow-[0_0_30px_rgba(249,176,60,0.5)] transform hover:-translate-y-1"
                  >
                    Buy now
                  </button>
                )}
              </div>

              <div className="text-xs text-center text-gray-500 mb-6">
                30-Day Money-Back Guarantee
              </div>

              {/* Includes */}
              <div className="mb-6">
                <h4 className="font-bold text-dark dark:text-white mb-3">This course includes:</h4>
                <div className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-video text-primary w-4"></i>
                    <span>{course?.duration || '0 hours'} on-demand video</span>
                  </div>
                  {course?.includes && Array.isArray(course.includes) && course.includes.length > 0 ? (
                    course.includes.map((inc: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-check text-green-500 w-4"></i>
                        <span>{inc}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-check text-green-500 w-4"></i>
                        <span>{course?.assignmentsInfo || `${course?.lessons?.length || 0} assignments`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-check text-green-500 w-4"></i>
                        <span>{course?.accessInfo || 'Access on mobile and TV'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <i className="fa-solid fa-circle-check text-green-500 w-4"></i>
                        <span>{course?.certificateInfo || 'Certificate of completion'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal course={course} onClose={() => setShowPaymentModal(false)} />
      )}
      
      <Footer />
    </div>
  );
}
