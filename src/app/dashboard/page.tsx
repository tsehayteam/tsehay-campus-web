'use client';
import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';
import FloatingAIButton from '@/components/FloatingAIButton';
import AssessmentModal from '@/components/AssessmentModal';

const ReactPlayer: any = dynamic(() => import('react-player'), { ssr: false });

export default function StudentDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('classroom');
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [hasTakenQuiz, setHasTakenQuiz] = useState(false);
  const [quizMessages, setQuizMessages] = useState([
    { role: 'ai', text: 'ሰላም! የኮርሱን ፈተና ለመውሰድ ዝግጁ ነዎት? አዎ ካሉኝ ፈተናውን እጀምራለሁ።' }
  ]);
  const [quizInput, setQuizInput] = useState('');
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [modules, setModules] = useState<any[]>([]);
  const router = useRouter();
  const [progress, setProgress] = useState<any[]>([]);
  // Settings State
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [settingsEmail, setSettingsEmail] = useState("");
  const [showAssessment, setShowAssessment] = useState(false);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { t } = useLanguage();

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "ሰላም! እኔ Tsehay AI ነኝ። የትምህርት ጥያቄዎች ካሉዎት እባክዎ ይጠይቁኝ!" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    // Fetch courses for the student
    const fetchPurchasedCourses = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        const purchasesRef = collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses');
        const purchasesSnap = await getDocs(purchasesRef);
        
        if (purchasesSnap.empty) {
            setCourses([]);
            setActiveCourse(null);
            setLoading(false);
            return;
        }

        const coursePromises = purchasesSnap.docs.map(async (purchaseDoc) => {
            const courseId = purchaseDoc.data().courseId;
            const courseRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                return { id: courseSnap.id, ...courseSnap.data() };
            }
            return null;
        });

        const allCourses = (await Promise.all(coursePromises)).filter(c => c !== null);
        const userCourses = allCourses;
        setCourses(userCourses);
          
        if (userCourses.length > 0) {
          setActiveCourse(userCourses[0]);
        }
        
        // Initialize settings state
        setSettingsName(user.displayName || '');
        setSettingsPhotoUrl(user.photoURL || '');
        setSettingsEmail(user.email || '');
        
        // Fetch extra profile info
        const profileRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.phone) setSettingsPhone(data.phone);
            if (data.city) setSettingsCity(data.city);
        }
      } catch (error) {
        console.error("Error fetching courses", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchasedCourses();
  }, [user]);

  useEffect(() => {
    if (!activeCourse) return;
    const fetchModules = async () => {
        try {
            let fetchedModules = [];
            if (activeCourse.lessons && activeCourse.lessons.length > 0) {
                fetchedModules = [{ id: 'main', title: 'Course Content', order: 1, lessons: activeCourse.lessons }];
            } else if (activeCourse.modules && activeCourse.modules.length > 0) {
                fetchedModules = activeCourse.modules;
            } else {
                const q = query(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', activeCourse.id, 'modules'), orderBy('order', 'asc'));
                const snap = await getDocs(q);
                fetchedModules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            }
            
            setModules(fetchedModules);
            // Default to first lesson of first module if exists
            if (fetchedModules.length > 0 && fetchedModules[0].lessons && fetchedModules[0].lessons.length > 0) {
                setActiveLesson({ ...fetchedModules[0].lessons[0], moduleIndex: 0, lessonIndex: 0 });
            } else {
                setActiveLesson(null);
            }
        } catch (error) {
            console.error("Error fetching modules", error);
        }
    };
    fetchModules();
  }, [activeCourse]);

  const handleVideoEnd = async () => {
    if (!activeLesson || !activeCourse || !user) return;
    
    // 1. Award points
    const pointsToAward = activeLesson.points || 100;
    
    try {
        const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', activeCourse.id);
        const userDoc = await getDoc(userRef);
        
        let newCompletedLessons = [activeLesson.title];
        let totalPoints = pointsToAward;
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            const currentCompleted = data.completedLessons || [];
            if (!currentCompleted.includes(activeLesson.title)) {
                newCompletedLessons = [...currentCompleted, activeLesson.title];
                totalPoints = (data.points || 0) + pointsToAward;
                
                await updateDoc(userRef, {
                    completedLessons: newCompletedLessons,
                    points: totalPoints,
                    lastPlayedAt: new Date()
                });
                
                // Update local points state to refresh UI
                setProgress(newCompletedLessons);
            }
        } else {
            await setDoc(userRef, {
                courseId: activeCourse.id,
                completedLessons: newCompletedLessons,
                points: totalPoints,
                enrolledAt: new Date(),
                lastPlayedAt: new Date()
            }, { merge: true });
            setProgress(newCompletedLessons);
        }
    } catch (e) {
        console.error("Error updating points:", e);
    }
    
    // 2. Play next video automatically
    const currentModule = modules[activeLesson.moduleIndex];
    if (currentModule && currentModule.lessons) {
        const nextLessonIndex = activeLesson.lessonIndex + 1;
        if (nextLessonIndex < currentModule.lessons.length) {
            setActiveLesson({ ...currentModule.lessons[nextLessonIndex], moduleIndex: activeLesson.moduleIndex, lessonIndex: nextLessonIndex });
        } else {
            // Check next module
            const nextModuleIndex = activeLesson.moduleIndex + 1;
            if (nextModuleIndex < modules.length) {
                const nextModule = modules[nextModuleIndex];
                if (nextModule && nextModule.lessons && nextModule.lessons.length > 0) {
                    setActiveLesson({ ...nextModule.lessons[0], moduleIndex: nextModuleIndex, lessonIndex: 0 });
                }
            } else {
                setIsCourseCompleted(true);
            }
        }
    }
  };

  const handleQuizSubmit = async () => {
    if (!quizInput.trim()) return;
    
    const newMessages = [...quizMessages, { role: 'user', text: quizInput }];
    setQuizMessages(newMessages);
    setQuizInput('');
    setIsQuizLoading(true);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: `I am taking a quiz for this course. Generate a relevant quiz question or evaluate my answer: ${quizInput}` })
        });
        
        const data = await response.json();
        setQuizMessages([...newMessages, { role: 'ai', text: data.reply || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።" }]);
        setHasTakenQuiz(true); // Unlock certificate after first interaction for demo purposes
    } catch (e) {
        setQuizMessages([...newMessages, { role: 'ai', text: "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።" }]);
    } finally {
        setIsQuizLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateProfile(user, {
        displayName: settingsName,
        photoURL: settingsPhotoUrl || user.photoURL
      });
      // Optionally update user doc in firestore if it exists
      const userDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid);
      await updateDoc(userDocRef, {
         displayName: settingsName,
         photoURL: settingsPhotoUrl || user.photoURL
      });
      
      const profileRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
      await setDoc(profileRef, {
          name: settingsName,
          phone: settingsPhone,
          city: settingsCity
      }, { merge: true });

      alert('Profile updated successfully!');
      // Force reload to update context or just let Next.js handle it
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
      if (!user?.email) return;
      try {
          const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
          const auth = getAuth();
          await sendPasswordResetEmail(auth, user.email);
          alert('Password reset email sent! Check your inbox.');
      } catch (error: any) {
          console.error("Error sending reset email:", error);
          alert(error.message);
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    const newMessages = [...chatMessages, { role: 'user', text: userMsg }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: `I am taking the course "${activeCourse?.title}". The lesson is "${activeLesson?.title}". Answer my question: ${userMsg}`, systemInstruction: "You are Tsehay AI Tutor. You are helping a student taking a course on the Tsehay Campus platform. Provide clear, concise, and educational answers in Amharic." })
        });
        const data = await response.json();
        const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "ይቅርታ፣ ማስተናገድ አልቻልኩም።";
        setChatMessages([...newMessages, { role: 'ai', text: aiReply }]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
        setChatMessages([...newMessages, { role: 'ai', text: "የኢንተርኔት ችግር አጋጥሟል።" }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col md:flex-row font-body transition-colors duration-300 -mt-20 relative z-[60]">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-24 lg:w-72 bg-white dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex flex-col items-center lg:items-start shadow-sm z-20 shrink-0">
        <div className="h-16 md:h-20 w-full flex items-center justify-between md:justify-center lg:justify-start px-4 lg:px-6 border-b border-slate-100 dark:border-slate-700">
          <a href="/" className="flex items-center cursor-pointer group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl mx-auto flex items-center justify-center shadow-lg p-0.5 border border-white/20 group-hover:scale-105 transition">
              <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="ml-3 font-heading font-black text-lg md:text-xl tracking-tight dark:text-white">
              Tsehay<span className="text-primary hidden sm:inline">Campus</span>
            </span>
          </a>
          
          <div className="md:hidden flex items-center gap-3">
             <img src={user?.photoURL || "https://ui-avatars.com/api/?name=Nehmiya&background=7b61ff&color=fff"} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="Profile" />
          </div>
        </div>

        <nav className="flex-1 overflow-x-auto md:overflow-y-auto py-3 md:py-6 px-3 space-y-0 md:space-y-1.5 font-body no-scrollbar w-full flex flex-row md:flex-col gap-2 md:gap-0 items-center md:items-stretch">
          <p className="hidden lg:block px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('main_menu')}</p>
          
          <a href="/" className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-auto md:w-full">
            <i className="fa-solid fa-house text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="hidden lg:block">{t('back_to_home')}</span>
          </a>

          <button onClick={() => setCurrentView('classroom')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left ${currentView === 'classroom' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-play-circle text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('classroom')}</span>
          </button>
          
          <button onClick={() => setCurrentView('courses')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left ${currentView === 'courses' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-layer-group text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('my_courses')}</span>
          </button>

          <button onClick={() => setCurrentView('messages')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left ${currentView === 'messages' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-comments text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('messages')}</span>
          </button>

          <p className="hidden lg:block px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-6">{t('tools')}</p>

          <button onClick={() => document.dispatchEvent(new CustomEvent('toggle-ai'))} className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white font-bold transition flex-shrink-0 group w-auto md:w-full text-left">
            <i className="fa-solid fa-wand-magic-sparkles text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">Tsehay AI</span>
          </button>
          
          <button onClick={() => setCurrentView('certificates')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left ${currentView === 'certificates' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-certificate text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('certificates')}</span>
          </button>
          
          <button onClick={() => setCurrentView('settings')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left ${currentView === 'settings' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-gear text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('settings')}</span>
          </button>
        </nav>

        <div className="hidden md:block p-4 w-full border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-center lg:justify-start gap-3 p-2 mb-2">
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=" + (user?.displayName || 'User') + "&background=7b61ff&color=fff"} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="Profile" />
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user?.displayName || 'Tsehay Student'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{courses.some(c => !c.isFree) ? t('pro_member') : 'Free Member'}</p>
            </div>
          </div>
          <button onClick={() => {
              import('firebase/auth').then(({ signOut }) => {
                  import('@/lib/firebase/config').then(({ auth }) => {
                      signOut(auth);
                  });
              });
          }} className="w-full flex items-center justify-center lg:justify-center gap-2 p-2 rounded-xl text-red-500 border border-red-500/20 hover:bg-red-500/10 font-bold transition text-sm">
             <i className="fa-solid fa-arrow-right-from-bracket"></i>
             <span className="hidden lg:block">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dashboard Header */}
        <header className="h-[72px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0">
            <div className="flex items-center gap-4">
                <nav className="hidden md:flex text-sm font-semibold text-gray-500 dark:text-gray-400 items-center gap-2 font-body">
                    <span onClick={() => setCurrentView('courses')} className="hover:text-secondary dark:hover:text-primary transition cursor-pointer">{t('courses')}</span>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span onClick={() => setCurrentView('courses')} className="hover:text-secondary dark:hover:text-primary transition cursor-pointer">{t('my_courses')}</span>
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    <span className="text-dark dark:text-white font-bold truncate max-w-[200px]">{activeCourse ? activeCourse.title : t('loading')}</span>
                </nav>
            </div>
            <div className="flex items-center gap-3 sm:gap-5 shrink-0 relative">
                <button onClick={() => router.push('/courses')} className="hidden md:flex text-sm font-bold text-secondary dark:text-primary bg-blue-50 dark:bg-slate-800 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-slate-700 transition items-center gap-2">
                    <i className="fa-solid fa-cart-shopping"></i> {t('more_courses')}
                </button>
                <button onClick={() => document.documentElement.classList.toggle('dark')} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition shadow-sm shrink-0">
                    <i className="fa-solid fa-moon text-slate-600 dark:text-yellow-400 text-sm"></i>
                </button>
                <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10 border border-primary/30 px-3 py-1.5 rounded-full shadow-sm cursor-help hover:scale-105 transition">
                    <div className="bg-primary/20 p-1 rounded-full"><i className="fa-solid fa-bolt text-primary text-xs"></i></div>
                    <span className="font-black text-dark dark:text-white text-sm font-heading">{progress.length * 10}</span>
                </div>
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-gray-400 dark:text-gray-300 hover:text-dark dark:hover:text-white transition text-xl shrink-0">
                      <i className="fa-regular fa-bell"></i>
                  </button>
                  {showNotifications && (
                    <div className="absolute top-10 right-0 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl rounded-xl p-4 z-50">
                       <p className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-slate-700 pb-2 mb-2">Notifications</p>
                       <div className="flex items-start gap-3 py-2">
                           <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-slate-700 flex items-center justify-center text-secondary dark:text-primary shrink-0"><i className="fa-solid fa-hand-wave"></i></div>
                           <div>
                               <p className="text-xs font-bold text-dark dark:text-white">እንኳን በደህና መጡ!</p>
                               <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">ወደ ፀሐይ ካምፓስ እንኳን በደህና መጡ። ትምህርትዎን ዛሬውኑ ይጀምሩ!</p>
                           </div>
                       </div>
                    </div>
                  )}
                </div>
            </div>
        </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#111111] p-4 lg:p-8">
        
        {currentView === 'classroom' && (
          <>
            {courses.length === 0 ? (
          <div className="text-center py-20 max-w-7xl mx-auto">
            <i className="fa-solid fa-box-open text-6xl text-slate-300 dark:text-slate-700 mb-4"></i>
            <h2 className="text-xl font-bold text-slate-500">{t('no_purchased_courses')}</h2>
            <a href="/courses" className="mt-4 inline-block bg-primary text-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg">{t('visit_courses')}</a>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black font-heading text-dark dark:text-white mb-2">{activeCourse?.title || t('course_loading')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-body text-sm">{t('please_wait')}</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-bold text-sm shadow-sm transition"><i className="fa-regular fa-bookmark"></i> {t('save')}</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-sm transition"><i className="fa-solid fa-check"></i> {t('completed')}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                
                {/* Left Side: Video & Tabs */}
                <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
                    
                    {/* Cinematic Video Player */}
                    <div className="bg-dark rounded-2xl overflow-hidden shadow-2xl relative border border-gray-800 aspect-video flex items-center justify-center">
                        {activeLesson && (activeLesson.video || activeLesson.videoUrl) ? (
                            <ReactPlayer
                                key={activeLesson.video || activeLesson.videoUrl}
                                url={activeLesson.video || activeLesson.videoUrl}
                                width="100%"
                                height="100%"
                                controls={true}
                                playing={true}
                                onEnded={handleVideoEnd}
                                className="absolute inset-0"
                            />
                        ) : (
                            <>
                                <img src={activeCourse?.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-6 lg:p-8">
                                    <div className="self-end bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10">
                                        No Video Available
                                    </div>
                                    <div className="flex justify-center items-center h-full">
                                        <button className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/50 text-dark rounded-full flex items-center justify-center text-2xl lg:text-3xl backdrop-blur-sm transition-transform opacity-50 cursor-not-allowed pl-1.5 z-10">
                                            <i className="fa-solid fa-play"></i>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden min-h-[300px]">
                        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 no-scrollbar bg-gray-50/50 dark:bg-slate-800/50 px-2 pt-2">
                            <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 font-heading text-[15px] font-bold whitespace-nowrap ${activeTab === 'overview' ? 'text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>{t('overview')}</button>
                            <button onClick={() => setActiveTab('notes')} className={`px-6 py-4 font-heading text-[15px] whitespace-nowrap flex items-center gap-2 ${activeTab === 'notes' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                <i className="fa-regular fa-pen-to-square"></i> {t('notes')}
                            </button>
                            <button onClick={() => setActiveTab('qa')} className={`px-6 py-4 font-heading text-[15px] whitespace-nowrap flex items-center gap-2 ${activeTab === 'qa' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('qa')} <i className="fa-regular fa-comments"></i>
                            </button>
                            <button onClick={() => setActiveTab('quiz')} className={`px-6 py-4 font-heading text-[15px] whitespace-nowrap flex items-center gap-2 ${activeTab === 'quiz' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('quiz')} <i className="fa-solid fa-list-check"></i>
                            </button>
                            <button onClick={() => setActiveTab('certificate')} className={`px-6 py-4 font-heading text-[15px] whitespace-nowrap flex items-center gap-2 ${activeTab === 'certificate' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('certificate')} <i className="fa-solid fa-award text-primary"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 sm:p-8">
                            {activeTab === 'overview' && (
                                <>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-100 dark:border-slate-700">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-slate-600 shadow-md bg-blue-50 flex items-center justify-center text-secondary text-2xl">
                                                <i className="fa-solid fa-user-tie"></i>
                                            </div>
                                            <div>
                                                <p className="font-black text-dark dark:text-white text-lg font-heading">{activeCourse?.instructor || 'Eyoub Sahle'}</p>
                                                <p className="text-sm text-secondary dark:text-primary font-bold">{t('lead_instructor')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <a href="#" className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[#26A5E4] flex items-center justify-center hover:bg-[#26A5E4] hover:text-white transition-all shadow-md transform hover:-translate-y-1"><i className="fa-brands fa-telegram text-2xl"></i></a>
                                        </div>
                                    </div>

                                    {activeLesson?.desc && (
                                        <>
                                            <h3 className="font-black text-xl text-dark dark:text-white mb-4 font-heading">የዚህ ትምህርት ({activeLesson.title}) ማብራሪያ፦</h3>
                                            <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-8">
                                                {activeLesson.desc}
                                            </p>
                                        </>
                                    )}

                                    <h3 className="font-black text-xl text-dark dark:text-white mb-4 font-heading">ስለዚህ ኮርስ ማብራሪያ፦</h3>
                                    <p className="text-gray-600 dark:text-gray-300 font-body leading-relaxed text-base mb-6">
                                        {activeCourse?.desc || "ስለዚህ ኮርስ ዝርዝር መረጃ የለም።"}
                                    </p>
                                    
                                    <div className="mt-6 border-t border-gray-100 dark:border-slate-700 pt-6">
                                        <h3 className="font-black text-lg text-dark dark:text-white mb-4 font-heading">ዳውንሎድ የሚደረጉ ማቴሪያሎች</h3>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg border border-red-100 dark:border-red-900/30 font-bold text-sm cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 transition">
                                                <i className="fa-solid fa-file-pdf"></i>
                                                <span>Course Syllabus</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            {activeTab === 'notes' && (
                                <div className="text-center py-10">
                                    <i className="fa-solid fa-pen-to-square text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                                    <h3 className="text-lg font-bold text-gray-500">ማስታወሻዎች በቅርቡ ይመጣሉ (Notes coming soon)</h3>
                                </div>
                            )}

                            {activeTab === 'qa' && (
                                <div className="p-4">
                                    <div className="flex flex-col h-[400px] bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                                        <div className="bg-primary text-dark p-3 font-bold flex items-center justify-between shadow-sm z-10">
                                            <div className="flex items-center gap-2">
                                                <i className="fa-solid fa-robot text-xl"></i>
                                                <span>Tsehay AI - ጥያቄ እና መልስ</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {chatMessages.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-secondary text-white rounded-tr-sm' : 'bg-white dark:bg-slate-700 dark:text-white border border-gray-100 dark:border-slate-600 rounded-tl-sm shadow-sm'}`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {isChatLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-2 items-center">
                                                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                                                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                                            <input 
                                                type="text" 
                                                value={chatInput}
                                                onChange={e => setChatInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage(e as any)}
                                                placeholder="ጥያቄዎን እዚህ ይፃፉ..." 
                                                className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary"
                                            />
                                            <button onClick={handleSendMessage as any} className="w-10 h-10 bg-primary text-dark rounded-xl flex items-center justify-center font-bold hover:bg-secondary hover:text-white transition shadow-sm shrink-0">
                                                <i className="fa-solid fa-paper-plane"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="p-4">
                                    {!isCourseCompleted ? (
                                        <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <i className="fa-solid fa-lock text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                                            <h3 className="text-lg font-bold text-dark dark:text-white mb-2">ፈተናው ዝግ ነው (Quiz Locked)</h3>
                                            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">ፈተናውን ለመውሰድ በመጀመሪያ የኮርሱን ትምህርቶች (Videos) በሙሉ አይተው ማጠናቀቅ አለብዎት።</p>
                                            <button onClick={() => setIsCourseCompleted(true)} className="text-xs bg-gray-200 dark:bg-slate-700 px-3 py-1.5 rounded-lg font-bold text-gray-600 dark:text-gray-300">
                                                (Demo) ኮርሱን ጨርሻለሁ በል
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-[400px] bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                                            <div className="bg-primary text-dark p-3 font-bold flex items-center justify-between shadow-sm z-10">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-robot text-xl"></i>
                                                    <span>Tsehay AI - የኮርስ ፈተና</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                {quizMessages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-secondary text-white rounded-tr-sm' : 'bg-white dark:bg-slate-700 dark:text-white border border-gray-100 dark:border-slate-600 rounded-tl-sm shadow-sm'}`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                ))}
                                                {isQuizLoading && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-2 items-center">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={quizInput}
                                                    onChange={e => setQuizInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleQuizSubmit()}
                                                    placeholder="መልስዎን እዚህ ይፃፉ..." 
                                                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary"
                                                />
                                                <button onClick={handleQuizSubmit} className="w-10 h-10 bg-primary text-dark rounded-xl flex items-center justify-center font-bold hover:bg-secondary hover:text-white transition shadow-sm shrink-0">
                                                    <i className="fa-solid fa-paper-plane"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'certificate' && (
                                <div className="p-4">
                                    {!hasTakenQuiz ? (
                                        <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <i className="fa-solid fa-lock text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                                            <h3 className="text-lg font-bold text-dark dark:text-white mb-2">ሰርተፍኬት ዝግ ነው (Certificate Locked)</h3>
                                            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">ሰርተፍኬትዎን ለማግኘት በመጀመሪያ ፈተናውን ወስደው ማለፍ አለብዎት።</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                                            <i className="fa-solid fa-award text-6xl text-success mb-4 drop-shadow-md"></i>
                                            <h3 className="text-2xl font-black text-dark dark:text-white mb-2 font-heading">እንኳን ደስ አሎት!</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">ኮርሱን እና ፈተናውን በተሳካ ሁኔታ ስላጠናቀቁ ሰርተፍኬትዎ ተዘጋጅቷል።</p>
                                            <button className="bg-success text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-success/30 hover:scale-105 transition transform">
                                                <i className="fa-solid fa-download mr-2"></i> ሰርተፍኬት ዳውንሎድ ያድርጉ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Curriculum/Course Content */}
                <div className="lg:col-span-1 xl:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full lg:h-[calc(100vh-160px)] lg:sticky lg:top-4 overflow-hidden transition-colors duration-300">
                        
                        <div className="p-5 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shadow-sm">
                            <h3 className="font-heading font-black text-lg text-dark dark:text-white">የኮርስ ይዘት (Course Content)</h3>
                            <div className="flex justify-between items-end mt-3 mb-1">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">የኮርሱ ሂደት</p>
                                <p className="text-sm text-secondary dark:text-primary font-black">20%</p>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                                <div className="bg-success h-2 rounded-full" style={{ width: '20%' }}></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {modules.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm font-bold">
                                    ምንም ትምህርት አልተገኘም
                                </div>
                            ) : (
                                modules.map((mod: any, idx: number) => (
                                    <div key={mod.id} className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 p-4">
                                        <h4 className="font-bold text-sm text-dark dark:text-white">ክፍል {idx + 1}: {mod.title}</h4>
                                        <div className="mt-3 space-y-2">
                                            {(mod.lessons || []).map((lesson: any, lidx: number) => {
                                                const isActive = activeLesson?.title === lesson.title;
                                                return (
                                                <div 
                                                    key={lidx} 
                                                    onClick={() => setActiveLesson({...lesson, moduleIndex: idx, lessonIndex: lidx})}
                                                    className={`flex items-center justify-between p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition ${isActive ? 'bg-white dark:bg-slate-700 border-l-4 border-primary' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isActive ? (
                                                            <i className="fa-solid fa-circle-play text-primary text-sm animate-pulse"></i>
                                                        ) : (
                                                            <i className="fa-solid fa-circle-play text-gray-400 text-xs"></i>
                                                        )}
                                                        <div>
                                                            <p className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-dark dark:text-white'}`}>{lesson.title}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                                                <span><i className="fa-solid fa-video"></i> {lesson.duration || '00:00'}</span>
                                                                <span className="text-primary font-bold">+{lesson.points || 100} ነጥብ</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
          </div>
        )}
        </>
      )}

        {currentView === 'courses' && (
          <div className="max-w-7xl mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">የእኔ ኮርሶች (My Courses)</h2>
              <button onClick={() => setShowAssessment(true)} className="bg-primary text-dark font-bold px-4 py-2 rounded-xl hover:bg-yellow-400 transition flex gap-2 items-center text-sm shadow-sm">
                 <i className="fa-solid fa-wand-magic-sparkles"></i>
                 AI ኮርስ አስመራጭ (AI Assessment)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <h2 className="text-xl font-bold text-slate-500">ምንም የተገዛ ኮርስ የለም</h2>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <img src={course.thumbnail || course.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} className="w-full h-48 object-cover rounded-2xl mb-4" />
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{course.title}</h3>
                    <button onClick={() => { setActiveCourse(course); setCurrentView('classroom'); }} className="w-full py-2 bg-primary text-dark font-bold rounded-xl hover:bg-yellow-400">ወደ ትምህርቱ</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentView === 'messages' && (
          <div className="max-w-4xl mx-auto py-6">
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                 <div className="w-20 h-20 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-secondary dark:text-primary text-3xl shadow-inner">
                     <i className="fa-solid fa-robot"></i>
                 </div>
                 <h2 className="text-2xl font-black font-heading text-dark dark:text-white mb-2">Tsehay AI Chat</h2>
                 <p className="text-gray-500 mb-6">የ AI ረዳትዎ ከታች በኩል ባለው Floating Button (<i className="fa-solid fa-sparkles text-primary"></i>) ይገኛል። እባክዎ ጥያቄዎን እዛ ላይ ይጠይቁ።</p>
                 <button onClick={() => document.dispatchEvent(new CustomEvent('toggle-ai'))} className="bg-primary text-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition shadow-sm">
                     <i className="fa-solid fa-message mr-2"></i> ቻት ጀምር (Start Chat)
                 </button>
             </div>
          </div>
        )}

        {currentView === 'certificates' && (
          <div className="max-w-4xl mx-auto py-10">
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                 <div className="w-24 h-24 bg-yellow-50 dark:bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary text-4xl">
                     <i className="fa-solid fa-award"></i>
                 </div>
                 <h2 className="text-2xl font-black font-heading text-dark dark:text-white mb-2">የምስክር ወረቀት (Certificates)</h2>
                 <p className="text-gray-500 max-w-md mx-auto">እስካሁን ያጠናቀቁት ኮርስ የለም። የምስክር ወረቀት ለማግኘት እባክዎ ኮርሶችን አጠናቀው ፈተናዎችን ይውሰዱ።</p>
             </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="max-w-2xl mx-auto py-10 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-2xl font-bold mb-6">ማስተካከያ (Settings)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">ስም (Name)</label>
                <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ስልክ (Phone)</label>
                <input type="tel" value={settingsPhone} onChange={(e) => setSettingsPhone(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ከተማ (City)</label>
                <input type="text" value={settingsCity} onChange={(e) => setSettingsCity(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">ኢሜይል (Email)</label>
                <input type="email" readOnly className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500" value={settingsEmail} />
              </div>
              <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="px-6 py-3 bg-primary text-dark font-bold rounded-xl hover:bg-yellow-400 w-full mt-4 flex justify-center items-center gap-2">
                  {isUpdatingProfile ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>} 
                  አዘምን (Save Changes)
              </button>
              
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-700">
                  <h3 className="font-bold text-lg text-dark dark:text-white mb-2">የይለፍ ቃል ቀይር (Reset Password)</h3>
                  <p className="text-sm text-gray-500 mb-4">የይለፍ ቃልዎን ለመቀየር ከታች ያለውን ቁልፍ ይጫኑ።</p>
                  <button onClick={handlePasswordReset} className="px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-dark dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 w-full">
                      የይለፍ ቃል መቀየሪያ ኢሜይል ላክ
                  </button>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>
      <FloatingAIButton />
      {showAssessment && (
        <AssessmentModal 
           onClose={() => setShowAssessment(false)} 
           onRecommend={(courseId) => {
              setShowAssessment(false);
              router.push(`/courses/${courseId}`);
           }} 
        />
      )}
    </div>
  );
}
