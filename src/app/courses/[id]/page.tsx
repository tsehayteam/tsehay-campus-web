// @ts-nocheck
'use client';

import React, { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import PaymentModal from '@/components/PaymentModal';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function CoursePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
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
    const fetchCourseData = async () => {
      try {
        const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id);
        const courseSnap = await getDoc(courseRef);
        
        if (courseSnap.exists()) {
          const courseData = courseSnap.data();
          setCourse({ id: courseSnap.id, ...courseData });
          
          let modulesList = [];
          
          if (courseData.lessons && courseData.lessons.length > 0) {
            modulesList = [{ id: 'main', title: 'Course Content', lessons: courseData.lessons }];
          } else if (courseData.modules && courseData.modules.length > 0) {
            modulesList = courseData.modules;
          } else {
            // Fallback for older courses that used the subcollection
            const modulesQuery = query(
              collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', id, 'modules'),
              orderBy('order', 'asc')
            );
            const modulesSnap = await getDocs(modulesQuery);
            modulesList = modulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
          
          setModules(modulesList);
          
          // Expand first module by default
          if (modulesList.length > 0) {
            setExpandedModules({ [modulesList[0].id || 'main']: true });
          }
        }
      } catch (error) {
        console.error("Error fetching course data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
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

  const totalLessons = modules.reduce((total, mod) => total + (mod.lessons?.length || 0), 0);
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
      <div className="min-h-screen pt-32 pb-20 flex justify-center items-center bg-gray-50 dark:bg-dark text-center">
        <div>
          <i className="fa-solid fa-triangle-exclamation text-6xl text-gray-300 dark:text-gray-700 mb-4"></i>
          <h2 className="text-2xl font-black text-gray-500 dark:text-gray-400">Course Not Found</h2>
        </div>
      </div>
    );
  }

  const extractIframeSrc = (url: string) => {
    if (!url) return url;
    if (url.includes('<iframe') && url.includes('src="')) {
      const match = url.match(/src="([^"]+)"/);
      if (match) return match[1];
    }
    return url;
  };

  const previewVideoUrl = extractIframeSrc(course?.video);
  const defaultVideoUrl = previewVideoUrl || extractIframeSrc(course?.videoUrl) || (modules.length > 0 && modules[0].lessons?.length > 0 ? extractIframeSrc(modules[0].lessons[0].videoUrl) : null);
  const currentVideoUrl = activeVideoUrl ? extractIframeSrc(activeVideoUrl) : defaultVideoUrl;

  const fixDriveLink = (url: string) => {
    if (!url) return url;
    
    // Match any Google Drive ID (file/d/ID, thumbnail?id=ID, uc?id=ID, lh3.../d/ID)
    const match = url.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }

    return url;
  };
  
  const displayImage = fixDriveLink(course?.image);
  const displayInstructorImage = fixDriveLink(course?.instructorImage);
  const displayBanner = fixDriveLink(course?.banner);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Dark Header Section (Udemy Style) */}
      <div className="hero-mesh text-white pt-24 md:pt-28 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {displayBanner && (
          <div className="absolute inset-0 z-0">
            <img src={displayBanner} alt="Course Banner" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B]/90 to-transparent"></div>
          </div>
        )}
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay z-0"></div>
        {displayInstructorImage && (
          <div className="absolute right-10 bottom-0 opacity-20 pointer-events-none hidden lg:block z-0">
            <img src={displayInstructorImage} alt="" className="h-64 object-cover object-bottom" />
          </div>
        )}
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 relative z-10">
          
          <div className="w-full md:w-2/3 pr-0 md:pr-12 lg:pr-24">
            {/* Breadcrumb */}
            <div className="text-blue-100 text-sm font-bold flex gap-2 items-center mb-6">
              <span className="cursor-pointer hover:text-white transition">{course?.category || 'Tech'}</span>
              {course?.title && (
                <>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  <span className="cursor-pointer hover:text-white transition">{course.title}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black font-heading mb-4 leading-tight text-primary animate-float" style={{animationDuration: "6s"}}>
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
              <div className="flex items-center gap-1 text-primary font-bold">
                <span>{course?.rating || 0}</span>
                <i className="fa-solid fa-star text-xs text-primary"></i>
                <i className="fa-solid fa-star text-xs text-primary"></i>
                <i className="fa-solid fa-star text-xs text-primary"></i>
                <i className="fa-solid fa-star text-xs text-primary"></i>
                <i className="fa-solid fa-star-half-stroke text-xs text-primary"></i>
              </div>
              <span className="text-blue-100 underline font-semibold">({course?.reviewsCount || 0} ratings)</span>
              <span>{(course?.studentsCount || 0).toLocaleString()} students</span>
            </div>

            <div className="text-sm mb-4">
              Created by <span className="text-primary underline font-bold">{course?.instructor || course?.instructorName || 'Instructor'}</span>
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
        
        {/* Left Column (Course Details) */}
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
                  modules.forEach(m => expandAll[m.id] = true);
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
              <div key={mod.id} className="border-b border-gray-300 dark:border-gray-700 last:border-b-0">
                <button 
                  onClick={() => toggleModule(mod.id)}
                  className="w-full text-left px-4 py-4 bg-gray-50 dark:bg-[#111111] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] flex justify-between items-center transition-colors"
                >
                  <div className="flex items-center gap-3 font-bold text-dark dark:text-white">
                    <i className={`fa-solid fa-chevron-${expandedModules[mod.id] ? 'up' : 'down'} text-xs`}></i>
                    <span>{mod.title}</span>
                  </div>
                  <div className="text-sm text-gray-500 font-normal">
                    {mod.lessons?.length || 0} lectures
                  </div>
                </button>
                
                {expandedModules[mod.id] && (
                  <div className="px-4 py-2 bg-white dark:bg-[#0a0a0a]">
                    {mod.lessons?.map((lesson: any, i: number) => (
                      <div key={i} className="flex justify-between items-center py-2 group">
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <i className="fa-brands fa-youtube text-gray-400 group-hover:text-primary transition-colors"></i>
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
          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 mb-10 space-y-2">
            {course.requirements && Array.isArray(course.requirements) && course.requirements.length > 0 ? (
              course.requirements.map((req: string, idx: number) => (
                <li key={idx}>{req}</li>
              ))
            ) : (
              <li className="text-gray-500 italic list-none -ml-5">No requirements specified for this course.</li>
            )}
          </ul>

          {/* Instructor Section */}
          <div className="mb-10 border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-2xl font-black font-heading text-secondary dark:text-primary mb-6">Instructor</h2>
            
            <div className="mb-4">
              <a href="#" className="text-xl font-bold text-secondary hover:text-[#254b8a] underline font-heading">
                {course?.instructorName || course?.instructor || 'Instructor'}
              </a>
              <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {course?.instructorTitle || 'Leading Online Skills Instructor'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-4">
              <img 
                src={displayInstructorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(course?.instructorName || course?.instructor || 'Instructor')}&background=F9B03C&color=fff&size=128`} 
                onError={(e) => { 
                  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(course?.instructorName || course?.instructor || 'Instructor')}&background=F9B03C&color=fff&size=128`;
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
                  <span>{course?.instructorRating || 0} Instructor Rating</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-award text-gray-500"></i>
                  <span>{(course?.instructorReviews || 0).toLocaleString()} Reviews</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-user-group text-gray-500"></i>
                  <span>{(course?.instructorStudents || 0).toLocaleString()} Students</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-play text-gray-500"></i>
                  <span>{course?.instructorCourses || 1} Courses</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4 leading-relaxed max-w-3xl">
              <p>
                {course?.instructorBio || 'No biography available for this instructor.'}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (Sticky Card) */}
        <div className="w-full md:w-1/3">
          <div className="md:sticky md:top-24 bg-white dark:bg-[#1c1d1f] border border-gray-200 dark:border-gray-800 shadow-xl rounded-sm overflow-hidden z-10 md:-mt-[350px]">
            
            {/* Video Preview Thumbnail */}
            <div className="relative group border-b border-gray-200 dark:border-gray-800">
              {isPlaying && currentVideoUrl ? (
                <div className="w-full h-[250px] bg-black">
                  {(() => {
                      let finalUrl = currentVideoUrl;
                      if (finalUrl.includes('mediadelivery.net')) {
                          return (
                              <iframe
                                  src={finalUrl}
                                  loading="lazy"
                                  className="w-full h-full border-none"
                                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                  allowFullScreen
                              ></iframe>
                          );
                      } else if (finalUrl.includes('drive.google.com')) {
                          return (
                              <iframe
                                  src={finalUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview')}
                                  loading="lazy"
                                  className="w-full h-full border-none"
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
                                className="w-full h-full object-contain"
                              />
                          );
                      }
                  })()}
                </div>
              ) : (
                <div className="cursor-pointer" onClick={() => { if (currentVideoUrl) setIsPlaying(true); }}>
                  <img src={displayImage || `https://placehold.co/600x400/3268BA/FFFFFF?text=${encodeURIComponent(course.title || 'Tsehay Campus')}&font=Montserrat`} alt={course.title} className="w-full h-[250px] object-cover" onError={(e) => { 
                    const fallback = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop';
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }} />
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
                    <span className="text-4xl font-black text-dark dark:text-white">{Number(course.price).toLocaleString()} {t('course_currency')}</span>
                    {course.originalPrice && (
                      <span className="text-lg text-gray-500 line-through">{Number(course.originalPrice).toLocaleString()}</span>
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
                    onClick={handleEnroll} 
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
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-video w-4"></i>
                    <span>{course?.duration || '0 hours'} on-demand video</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="fa-regular fa-file-lines w-4"></i>
                    <span>{course?.lessons?.length || 0} assignments</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-mobile-screen-button w-4"></i>
                    <span>Access on mobile and TV</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-trophy w-4"></i>
                    <span>Certificate of completion</span>
                  </div>
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
