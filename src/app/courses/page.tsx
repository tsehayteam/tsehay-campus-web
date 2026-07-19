// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import PaymentModal from '@/components/PaymentModal';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
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
      const coursesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openPaymentModal = async (course) => {
    const isFree = course.isFree || course.price === 'Free' || course.price === '0' || course.price === 0;
    
    if (isFree) {
      if (!user) {
        window.dispatchEvent(new CustomEvent('open-auth-modal'));
        return;
      }
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
      } catch (err: any) {
         console.error("Free enrollment failed:", err);
         alert(`Failed to enroll: ${err.message || 'Please try again.'}`);
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          course.desc?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === "All") return matchesSearch;
    if (selectedCategory === "Free") return matchesSearch && (course.price === "Free" || course.price === "0" || course.price === 0 || course.isFree);
    if (selectedCategory === "Paid") return matchesSearch && (course.price !== "Free" && course.price !== "0" && course.price !== 0 && !course.isFree);
    
    return matchesSearch && course.category === selectedCategory;
  });

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

            {/* Standard Course Filter Search Bar */}
            <div className="max-w-2xl mx-auto relative mb-8 shadow-xl rounded-full group">
                <i className="fa-solid fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-secondary dark:group-focus-within:text-primary transition-colors"></i>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder_2')}
                  className="w-full bg-white dark:bg-[#111111] border-2 border-gray-200 dark:border-gray-800 rounded-full py-4 pl-14 pr-6 text-dark dark:text-white font-bold outline-none focus:border-secondary dark:focus:border-primary transition shadow-inner text-base lg:text-lg"
                />
            </div>

            {/* Enhanced Categories including Free and Paid */}
            <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => setSelectedCategory('All')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition shadow-md ${selectedCategory === 'All' ? 'bg-primary text-dark' : 'bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_all')}</button>
                <button onClick={() => setSelectedCategory('Free')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Free' ? 'bg-success text-white border-success' : 'bg-transparent text-success hover:bg-success hover:text-white border-success/30'}`}>{t('cat_free')}</button>
                <button onClick={() => setSelectedCategory('Paid')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Paid' ? 'bg-primary text-dark border-primary' : 'bg-transparent text-primary hover:bg-primary hover:text-dark border-primary/30'}`}>{t('cat_paid')}</button>
                <div className="w-full sm:w-auto h-0 sm:h-8 border-l border-gray-300 dark:border-gray-700 mx-2 hidden sm:block"></div>
                <button onClick={() => setSelectedCategory('Ecommerce')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Ecommerce' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_ecommerce')}</button>
                <button onClick={() => setSelectedCategory('Marketing')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Marketing' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_marketing')}</button>
                <button onClick={() => setSelectedCategory('Crypto')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Crypto' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_crypto')}</button>
                <button onClick={() => setSelectedCategory('Tech')} className={`px-6 py-2.5 rounded-full font-bold text-sm transition border ${selectedCategory === 'Tech' ? 'bg-gray-800 dark:bg-white text-white dark:text-dark border-gray-800 dark:border-white' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t('cat_tech')}</button>
            </div>
          </div>
        </section>
        
        <section className="py-8 lg:py-12 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">{t('loading_courses_2')}</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-20">
                <i className="fa-solid fa-folder-open text-6xl text-gray-300 dark:text-gray-700 mb-4"></i>
                <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400">{t('no_courses_found')}</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="bg-white dark:bg-[#111111] rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] group relative border border-gray-200 dark:border-gray-800">
                    
                    <div className="relative h-56 md:h-64 overflow-hidden bg-white">
                      <img 
                        src={(course.image && course.image.includes('drive.google.com/uc?export=view&id=')) ? `https://drive.google.com/thumbnail?id=${course.image.split('id=')[1]}&sz=w1000` : (course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop')} 
                        alt={course.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1000&auto=format&fit=crop'; }}
                      />
                      
                      {/* PREMIUM Badge */}
                      {(!course.isFree && course.price !== 0 && course.price !== '0' && course.price !== 'Free') ? (
                        <div className="absolute top-4 right-4 bg-primary text-dark text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                          <i className="fa-solid fa-star"></i> PREMIUM
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 bg-success text-white text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                          <i className="fa-solid fa-gift"></i> FREE
                        </div>
                      )}
                      
                      {/* CATEGORY Badge */}
                      {course.category && (
                        <div className="absolute bottom-4 left-4 bg-[#111111] text-white text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider shadow-md">
                          {course.category}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-black text-dark dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {course.title || t('course_unknown')}
                      </h3>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <i className="fa-solid fa-folder-open text-primary"></i>
                        <span className="text-gray-400 text-sm font-bold">{course.instructor || 'Eyoub Sahle'}</span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">
                        {course.desc || t('course_desc_placeholder')}
                      </p>
                      
                      {/* Metadata Pills */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800">
                          <i className="fa-regular fa-clock text-primary"></i> {course.duration || '00:50:00'}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800">
                          <i className="fa-solid fa-list text-primary"></i> {course.lessons?.length || 0} {t('course_lessons')}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800">
                          <i className="fa-solid fa-signal text-primary"></i> {course.level || 'ጀማሪ (Beginner)'}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800">
                          <i className="fa-solid fa-language text-primary"></i> {t('course_language')}
                        </div>
                      </div>
                      
                      {/* Price & Action */}
                      <div className="mt-auto pt-5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div>
                          {(course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free') ? (
                            <span className="text-2xl font-black text-success tracking-tight">{t('course_free')}</span>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-dark dark:text-white tracking-tight">{Number(course.price).toLocaleString()} {t('course_currency')}</span>
                              {course.originalPrice && (
                                <span className="text-sm font-medium text-gray-500 line-through">{Number(course.originalPrice).toLocaleString()} {t('course_currency')}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button onClick={() => openPaymentModal(course)} disabled={isEnrolling} className="bg-primary text-dark font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-yellow-400 transition-colors shadow-md disabled:opacity-50">
                          {(course.isFree || course.price === 0 || course.price === '0' || course.price === 'Free') ? (
                            <>{isEnrolling ? 'እባክዎ ይጠብቁ...' : t('btn_go_to_class')} <i className="fa-solid fa-arrow-right"></i></>
                          ) : (
                            <>{t('btn_buy_course')} <i className="fa-solid fa-cart-shopping"></i></>
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

      {/* Footer from Landing Page */}
      <footer id="footer" className="bg-dark text-gray-300 pt-16 pb-8 font-body border-t-[6px] border-primary mt-auto z-10 relative">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                  <div className="lg:col-span-2 pr-4">
                      <div className="flex items-center gap-3 cursor-pointer mb-6 group" onClick={() => { window.location.href = '/' }}>
                          <div className="bg-white p-1 rounded-md">
                              <img src="tc-logo.jpg" alt="Logo" className="h-10 w-auto object-contain rounded-sm" onError={(e) => { e.currentTarget.src='https://ui-avatars.com/api/?name=TC&background=fff&color=0f172a' }} />
                          </div>
                          <span className="font-heading font-black text-2xl text-white tracking-tight notranslate" translate="no">Tsehay<span className="text-primary">Campus</span></span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                          {t('footer_desc')}
                      </p>
                      <div className="mt-4">
                          <a href="https://youtube.com/@eyoubsahle?si=p29sAFFmLagXd52X" target="_blank" className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-primary text-white hover:text-dark font-bold rounded-full shadow-lg transition-all transform hover:-translate-y-1">
                              {t('footer_secret_btn')}
                          </a>
                      </div>
                  </div>
                  
                  <div className="flex flex-col items-center text-center">
                      <h4 className="text-white font-black mb-5 font-heading tracking-wide text-base border-b-2 border-primary pb-2 inline-block">{t('quick_links')}</h4>
                      <ul className="space-y-3 text-sm">
                          <li><a href="/courses" className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_shein')}</a></li>
                          <li><a href="/courses" className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_digital')}</a></li>
                          <li><a href="/courses" className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_web')}</a></li>
                          <li><a href="/courses" className="hover:text-primary transition flex items-center gap-2 cursor-pointer">{t('link_crypto')}</a></li>
                      </ul>
                  </div>

                  <div className="flex flex-col items-end text-right">
                      <h4 className="text-white font-black mb-5 font-heading tracking-wide text-base border-b-2 border-primary pb-2 inline-block">{t('contact_us')}</h4>
                      <ul className="space-y-3 text-sm text-gray-200">
                          <li><a href="/#faq" className="hover:text-primary transition flex items-center gap-2">{t('link_faq')}</a></li>
                          <li><a href="javascript:void(0)" onClick={() => { window.dispatchEvent(new Event('open-terms-modal')) }} className="hover:text-primary transition flex items-center gap-2">{t('link_terms')}</a></li>
                          <li><a href="javascript:void(0)" onClick={() => { window.dispatchEvent(new Event('open-terms-modal')) }} className="hover:text-primary transition flex items-center gap-2">{t('link_privacy')}</a></li>
                      </ul>
                  </div>
              </div>
              
              <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                  <div className="text-center md:text-left">
                      <p>&copy; {new Date().getFullYear()} <span className="notranslate" translate="no">Tsehay Campus</span> {t('all_rights_reserved')}</p>
                      <div className="mt-2.5 flex items-center justify-center md:justify-start gap-2 text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                          <span>Powered By</span>
                          <img src="https://ui-avatars.com/api/?name=TD&background=F9B03C&color=0f172a&rounded=true&bold=true" alt="Tsehay Digital Logo" className="h-6 w-auto rounded-sm shadow-sm" />
                          <span className="text-primary notranslate" translate="no">Tsehay Digital</span>
                      </div>
                  </div>
              </div>
          </div>
      </footer>

      {/* Render Payment Modal if a course is selected */}
      {selectedCourse && (
        <PaymentModal course={selectedCourse} onClose={closePaymentModal} />
      )}
    </React.Fragment>
  );
}
