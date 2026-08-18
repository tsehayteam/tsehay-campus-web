'use client';
import React, { useEffect, useState, useRef } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, setDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';

const ReactPlayer: any = dynamic(() => import('react-player'), { ssr: false });

import CourseRatingModal from '@/components/CourseRatingModal';
import { formatDriveImageUrl } from '@/lib/courseCache';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('classroom');
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [hasTakenQuiz, setHasTakenQuiz] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratedCourses, setRatedCourses] = useState<Record<string, boolean>>({});
  const [dismissedRatingOverlay, setDismissedRatingOverlay] = useState<Record<string, boolean>>({});
  const [quizMessages, setQuizMessages] = useState([
    { role: 'ai', text: 'ሰላም! የኮርሱን ፈተና ለመውሰድ ዝግጁ ነዎት? አዎ ካሉኝ ፈተናውን እጀምራለሁ።' }
  ]);
  const [quizInput, setQuizInput] = useState('');
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('tsehay_user_courses_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem('tsehay_user_courses_cache');
  });
  const [activeCourse, setActiveCourse] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedCourse = localStorage.getItem('tsehay_user_active_course');
      return cachedCourse ? JSON.parse(cachedCourse) : null;
    } catch (e) { return null; }
  });
  const [activeLesson, setActiveLesson] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cachedLesson = localStorage.getItem('tsehay_user_active_lesson');
      return cachedLesson ? JSON.parse(cachedLesson) : null;
    } catch (e) { return null; }
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [modules, setModules] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cachedModules = localStorage.getItem('tsehay_user_active_modules');
      return cachedModules ? JSON.parse(cachedModules) : [];
    } catch (e) { return []; }
  });
  const router = useRouter();
  const [progress, setProgress] = useState<any[]>([]);
  // Settings State
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [settingsEmail, setSettingsEmail] = useState("");
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Notes State with resilient multi-tier instant local loading
  const [studentNotes, setStudentNotes] = useState<Array<{ id: string; text: string; createdAt: string; lessonTitle?: string; courseId?: string; source?: string }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      let uid = '';
      const cachedAuth = localStorage.getItem('tsehay_auth_user_cache');
      if (cachedAuth) {
        try { uid = JSON.parse(cachedAuth)?.uid || ''; } catch (e) {}
      }
      if (uid) {
        const uNotes = localStorage.getItem(`tsehay_user_notes_${uid}`);
        if (uNotes) {
          const parsed = JSON.parse(uNotes);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      const allNotes = localStorage.getItem('tsehay_user_notes_all');
      if (allNotes) {
        const parsed = JSON.parse(allNotes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tsehay_user_notes_') || key.startsWith('tsehay_notes_'))) {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      }
    } catch (e) {}
    return [];
  });
  const [noteInput, setNoteInput] = useState("");
  const [noteSavedMessage, setNoteSavedMessage] = useState("");

  // Q&A State with Instructor
  const [studentTickets, setStudentTickets] = useState<any[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [questionSentMessage, setQuestionSentMessage] = useState('');

  // Notifications State
  const [notificationsList, setNotificationsList] = useState<any[]>([
    {
      id: 'welcome',
      title: 'እንኳን በደህና መጡ!',
      message: 'ወደ ፀሐይ ካምፓስ እንኳን በደህና መጡ። ትምህርትዎን ዛሬውኑ ይጀምሩ!',
      read: false,
      createdAt: 'አሁን'
    }
  ]);
  
  const { t, lang } = useLanguage();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDarkTheme(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkTheme(true);
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkTheme(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkTheme(false);
    }
    localStorage.setItem('theme', newTheme);
  };

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "ሰላም! እኔ Tsehay AI ነኝ። የትምህርት ጥያቄዎች ካሉዎት እባክዎ ይጠይቁኝ!" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentVideoPlayedFraction, setCurrentVideoPlayedFraction] = useState(0);

  // Enterprise Classroom States
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [watermarkPos, setWatermarkPos] = useState({ x: 14, y: 18 });
  const [resumeToast, setResumeToast] = useState<{ seconds: number; timeStr: string } | null>(null);
  const playerRef = useRef<any>(null);
  const [lessonSummary, setLessonSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showLessonAiModal, setShowLessonAiModal] = useState(false);
  const [lessonAiQuery, setLessonAiQuery] = useState('');
  const [lessonAiMessages, setLessonAiMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [isLessonAiLoading, setIsLessonAiLoading] = useState(false);
  const [showKnowledgeCheck, setShowKnowledgeCheck] = useState(false);
  const [knowledgeCheckPassed, setKnowledgeCheckPassed] = useState<Record<string, boolean>>({});

  // Dynamic subtle watermark motion
  useEffect(() => {
    const interval = setInterval(() => {
      const newX = Math.floor(Math.random() * 60) + 10;
      const newY = Math.floor(Math.random() * 55) + 15;
      setWatermarkPos({ x: newX, y: newY });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Auto-Resume Timestamp Tracker
  useEffect(() => {
    if (!activeCourse?.id || !activeLesson?.title) return;
    setLessonSummary(null);
    try {
      const key = `tsehay_resume_${activeCourse.id}_${encodeURIComponent(activeLesson.title)}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const sec = parseInt(saved, 10);
        if (sec > 10) {
          const mins = Math.floor(sec / 60);
          const remSecs = sec % 60;
          const timeStr = `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
          setResumeToast({ seconds: sec, timeStr });
        } else {
          setResumeToast(null);
        }
      } else {
        setResumeToast(null);
      }
    } catch(e) {
      setResumeToast(null);
    }
  }, [activeCourse?.id, activeLesson?.title]);

  const handleGenerateLessonSummary = async () => {
    if (!activeLesson) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `እባክዎ ለዚህ ትምህርት ("${activeLesson.title}") ቁልፍ የሆኑትን 3 ዋና ዋና ነጥቦች (Key Takeaways) እና ተግባራዊ እርምጃዎችን በአጭሩ አዘጋጅተው ይስጡኝ።`,
          courseContext: {
            courseTitle: activeCourse?.title,
            lessonTitle: activeLesson?.title,
            lessonDesc: activeLesson?.desc || activeCourse?.desc,
            courseAiPrompt: activeCourse?.aiPrompt,
            isSummaryRequest: true
          }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setLessonSummary(data.reply);
      }
    } catch (err) {
      console.error("Summary error:", err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAskLessonAi = async (customPrompt?: string) => {
    const queryText = customPrompt || lessonAiQuery;
    if (!queryText.trim() || isLessonAiLoading) return;

    const userMsg = { role: 'user' as const, text: queryText };
    setLessonAiMessages(prev => [...prev, userMsg]);
    setLessonAiQuery('');
    setIsLessonAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          courseContext: {
            courseTitle: activeCourse?.title,
            lessonTitle: activeLesson?.title,
            lessonDesc: activeLesson?.desc || activeCourse?.desc,
            courseAiPrompt: activeCourse?.aiPrompt,
            isLessonQuery: true
          }
        })
      });
      const data = await res.json();
      setLessonAiMessages(prev => [...prev, { role: 'ai', text: data.reply || 'ይቅርታ፣ ማግኘት አልቻልኩም።' }]);
    } catch (err) {
      setLessonAiMessages(prev => [...prev, { role: 'ai', text: 'የኔትወርክ ችግር አጋጥሟል። እባክዎ እንደገና ይሞክሩ።' }]);
    } finally {
      setIsLessonAiLoading(false);
    }
  };

  useEffect(() => {
    // Fetch courses for the student
    const fetchPurchasedCourses = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        // Clean up URL parameters after returning from payment gateway
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.has('success') || urlParams.has('reference') || urlParams.has('tx_ref')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
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
        try {
          localStorage.setItem('tsehay_user_courses_cache', JSON.stringify(userCourses));
        } catch(e) {}
          
        if (userCourses.length > 0) {
          setActiveCourse((prev: any) => {
            if (prev && userCourses.some(c => c.id === prev.id)) {
              const updated = userCourses.find(c => c.id === prev.id) || prev;
              try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(updated)); } catch(e) {}
              return updated;
            }
            try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(userCourses[0])); } catch(e) {}
            return userCourses[0];
          });
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
            try {
              localStorage.setItem('tsehay_user_active_modules', JSON.stringify(fetchedModules));
            } catch(e) {}

            // Retain active lesson if already matching this course, otherwise default to first
            if (fetchedModules.length > 0) {
              setActiveLesson((prev: any) => {
                if (prev) {
                  for (let mIdx = 0; mIdx < fetchedModules.length; mIdx++) {
                    const mod = fetchedModules[mIdx];
                    if (mod.lessons) {
                      const foundIdx = mod.lessons.findIndex((l: any) => l.title === prev.title || l.id === prev.id);
                      if (foundIdx !== -1) {
                        const updated = { ...mod.lessons[foundIdx], moduleIndex: mIdx, lessonIndex: foundIdx };
                        try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(updated)); } catch(e) {}
                        return updated;
                      }
                    }
                  }
                }
                if (fetchedModules[0].lessons && fetchedModules[0].lessons.length > 0) {
                  const first = { ...fetchedModules[0].lessons[0], moduleIndex: 0, lessonIndex: 0 };
                  try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(first)); } catch(e) {}
                  return first;
                }
                return null;
              });
            } else {
              setActiveLesson(null);
            }
        } catch (error) {
            console.error("Error fetching modules", error);
        }
    };
    fetchModules();
  }, [activeCourse]);

  // Persistent Global Notes Sync
  useEffect(() => {
    let isMounted = true;
    const currentUser = user || auth.currentUser;
    let uid = currentUser?.uid || '';
    if (!uid && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_auth_user_cache');
        if (cached) uid = JSON.parse(cached)?.uid || '';
      } catch (e) {}
    }

    // 1. Sync from local storage immediately for instant UI display
    try {
      if (uid) {
        const cached = localStorage.getItem(`tsehay_user_notes_${uid}`);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setStudentNotes(parsed);
        }
      }
      const genericCached = localStorage.getItem('tsehay_user_notes_all');
      if (genericCached && isMounted) {
        const parsed = JSON.parse(genericCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudentNotes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = parsed.filter((n: any) => !existingIds.has(n.id));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          });
        }
      }
    } catch (e) {}

    // 2. Fetch permanent notes list from Firestore
    if (uid) {
      const fetchGlobalNotes = async () => {
        try {
          const globalNotesRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', uid, 'notes', 'all_notes');
          const snap = await getDoc(globalNotesRef);
          if (isMounted && snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
            const firestoreNotes = snap.data().list;
            setStudentNotes(prev => {
              const existingIds = new Set(prev.map(n => n.id));
              const newOnes = firestoreNotes.filter((n: any) => !existingIds.has(n.id));
              const merged = [...prev, ...newOnes];
              try { 
                localStorage.setItem(`tsehay_user_notes_${uid}`, JSON.stringify(merged));
                localStorage.setItem('tsehay_user_notes_all', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        } catch (err) {
          console.warn("Could not load global notes from Firestore:", err);
        }
      };
      fetchGlobalNotes();
    }

    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!activeCourse || !user) return;
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', activeCourse.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          const completed = data.completedLessons || [];
          setProgress(completed);
          if (data.isCompleted) {
            setIsCourseCompleted(true);
          }
          if (data.hasRated) {
            setRatedCourses(prev => ({ ...prev, [activeCourse.id]: true }));
            try { localStorage.setItem(`rated_course_${activeCourse.id}`, 'true'); } catch (e) {}
          } else if (typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse.id}`)) {
            setRatedCourses(prev => ({ ...prev, [activeCourse.id]: true }));
          }
          // Merge course notes with existing student notes if any
          if (data.notes && Array.isArray(data.notes) && data.notes.length > 0) {
            setStudentNotes(prev => {
              const existingIds = new Set(prev.map(n => n.id));
              const newItems = data.notes.filter((n: any) => !existingIds.has(n.id));
              if (newItems.length > 0) {
                const merged = [...newItems, ...prev];
                try { 
                  localStorage.setItem(`tsehay_user_notes_${user.uid}`, JSON.stringify(merged));
                  localStorage.setItem('tsehay_user_notes_all', JSON.stringify(merged));
                } catch (e) {}
                return merged;
              }
              return prev;
            });
          }
        } else if (typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse.id}`)) {
          setRatedCourses(prev => ({ ...prev, [activeCourse.id]: true }));
        }
      } catch (e) {
        console.error("Error loading user progress & notes:", e);
      }
    };
    fetchUserData();
  }, [activeCourse, user]);

  const handleSaveNote = async (textToSave?: string, customTitle?: string) => {
    const text = (textToSave || noteInput || '').trim();
    if (!text) return;

    const currentUser = user || auth.currentUser;
    let uid = currentUser?.uid || '';
    if (!uid && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_auth_user_cache');
        if (cached) uid = JSON.parse(cached)?.uid || '';
      } catch (e) {}
    }

    const targetCourse = activeCourse || (courses && courses.length > 0 ? courses[0] : null);
    
    let defaultTitle = 'Tsehay AI ማስታወሻ';
    if (customTitle) {
      defaultTitle = customTitle;
    } else if (textToSave) {
      defaultTitle = activeLesson?.title 
        ? `${activeCourse?.title ? activeCourse.title + ' - ' : ''}${activeLesson.title} (Tsehay AI)`
        : (targetCourse?.title ? `${targetCourse.title} - Tsehay AI` : 'Tsehay AI ማስታወሻ');
    } else if (activeLesson?.title) {
      defaultTitle = `${activeCourse?.title ? activeCourse.title + ' - ' : ''}${activeLesson.title}`;
    } else if (targetCourse?.title) {
      defaultTitle = targetCourse.title;
    }

    const newNote = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
      text: text,
      createdAt: new Date().toLocaleString('am-ET', { dateStyle: 'medium', timeStyle: 'short' }),
      lessonTitle: defaultTitle,
      courseId: targetCourse?.id || 'general',
      source: textToSave ? 'ai' : 'lesson'
    };

    // 1. Immediately update React state
    setStudentNotes(prevNotes => {
      const filtered = prevNotes.filter(n => n.text !== newNote.text || n.id === newNote.id);
      const updatedNotes = [newNote, ...filtered];
      
      // 2. Persist to localStorage synchronously across all keys
      try {
        if (uid) {
          localStorage.setItem(`tsehay_user_notes_${uid}`, JSON.stringify(updatedNotes));
        }
        localStorage.setItem('tsehay_user_notes_all', JSON.stringify(updatedNotes));
      } catch (e) {}

      return updatedNotes;
    });

    if (!textToSave) {
      setNoteInput('');
      setNoteSavedMessage("ማስታወሻዎ በተሳካ ሁኔታ ተመዝግቧል!");
      setTimeout(() => setNoteSavedMessage(""), 3500);
    }

    // 3. Asynchronously persist to Firestore if uid is available
    if (uid) {
      try {
        const globalNotesRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', uid, 'notes', 'all_notes');
        const currentSaved = localStorage.getItem(`tsehay_user_notes_${uid}`) || localStorage.getItem('tsehay_user_notes_all');
        const notesToSave = currentSaved ? JSON.parse(currentSaved) : [newNote];
        await setDoc(globalNotesRef, { list: notesToSave, updatedAt: serverTimestamp() }, { merge: true });

        if (targetCourse?.id && targetCourse.id !== 'general') {
          const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', uid, 'purchased_courses', targetCourse.id);
          await setDoc(userRef, { notes: notesToSave }, { merge: true });
        }
      } catch (err) {
        console.warn("Error persisting note to Firestore:", err);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const currentUser = user || auth.currentUser;
    let uid = currentUser?.uid || '';
    if (!uid && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tsehay_auth_user_cache');
        if (cached) uid = JSON.parse(cached)?.uid || '';
      } catch (e) {}
    }

    setStudentNotes(prevNotes => {
      const updatedNotes = prevNotes.filter(n => n.id !== noteId);
      try {
        if (uid) {
          localStorage.setItem(`tsehay_user_notes_${uid}`, JSON.stringify(updatedNotes));
        }
        localStorage.setItem('tsehay_user_notes_all', JSON.stringify(updatedNotes));
      } catch (e) {}

      if (uid) {
        (async () => {
          try {
            const globalNotesRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', uid, 'notes', 'all_notes');
            await setDoc(globalNotesRef, { list: updatedNotes, updatedAt: serverTimestamp() }, { merge: true });

            if (activeCourse?.id) {
              const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', uid, 'purchased_courses', activeCourse.id);
              await setDoc(userRef, { notes: updatedNotes }, { merge: true });
            }
          } catch (err) {
            console.error("Error deleting note from Firestore:", err);
          }
        })();
      }

      return updatedNotes;
    });
  };

  useEffect(() => {
    const handleGlobalAddToNotes = (e: any) => {
      if (e.detail?.text) {
        handleSaveNote(e.detail.text, e.detail.title);
      }
    };
    window.addEventListener('add-to-notes', handleGlobalAddToNotes);
    document.addEventListener('add-to-notes', handleGlobalAddToNotes);
    return () => {
      window.removeEventListener('add-to-notes', handleGlobalAddToNotes);
      document.removeEventListener('add-to-notes', handleGlobalAddToNotes);
    };
  }, [activeCourse, user, activeLesson]);

  // Subscribe to Student's Q&A Tickets with Instructor/Admin
  useEffect(() => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'support', 'messages', 'tickets'),
        where('userId', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setStudentTickets(list);
      }, (err) => console.error("Error subscribing to Q&A tickets:", err));

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const [qaAttachment, setQaAttachment] = useState<{ url: string; type: 'image' | 'document' | 'audio'; name: string } | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [mediaRecorderObj, setMediaRecorderObj] = useState<MediaRecorder | null>(null);

  const handleQaFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileTypeOverride?: 'image' | 'document' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = fileTypeOverride || (file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('audio/')
      ? 'audio'
      : 'document');

    const reader = new FileReader();
    reader.onload = (event) => {
      setQaAttachment({
        url: event.target?.result as string,
        type: fileType,
        name: file.name
      });
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (event) => {
          setQaAttachment({
            url: event.target?.result as string,
            type: 'audio',
            name: `Voice_Message_${Date.now()}.webm`
          });
          setShowAttachmentMenu(false);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorderObj(recorder);
      setIsRecordingVoice(true);
    } catch (err) {
      alert("ድምፅ ለመቅዳት የማይክሮፎን ፈቃድ ያስፈልጋል! (Microphone permission required)");
    }
  };

  const handleStopVoiceRecord = () => {
    if (mediaRecorderObj) {
      mediaRecorderObj.stop();
      mediaRecorderObj.stream.getTracks().forEach(t => t.stop());
      setIsRecordingVoice(false);
      setMediaRecorderObj(null);
    }
  };

  const handleAskAdmin = async () => {
    if ((!questionInput || !questionInput.trim()) && !qaAttachment) return;
    if (!user || !activeCourse) return;
    
    const qText = questionInput.trim();
    const currentAttachment = qaAttachment;
    setQuestionInput('');
    setQaAttachment(null);
    setShowAttachmentMenu(false);

    try {
      const ticketRef = doc(collection(db, 'artifacts', 'tsehaycampus-e1a6d', 'support', 'messages', 'tickets'));
      await setDoc(ticketRef, {
        id: ticketRef.id,
        userId: user.uid,
        userName: user.displayName || user.email || 'Student',
        userEmail: user.email || '',
        courseId: activeCourse.id,
        courseName: activeCourse.title,
        message: qText || (currentAttachment ? `[${currentAttachment.type.toUpperCase()}] ${currentAttachment.name}` : ''),
        attachment: currentAttachment || null,
        createdAt: new Date(),
        status: 'pending',
        replies: []
      });
      setQuestionSentMessage("ጥያቄዎ ወደ መምህሩ በተሳካ ሁኔታ ተልኳል!");
      setTimeout(() => setQuestionSentMessage(''), 4000);
    } catch (e) {
      console.error("Error submitting Q&A ticket:", e);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    setTimeout(() => {
      setShowNotifications(false);
    }, 400);
  };

  const [savedAiNotes, setSavedAiNotes] = useState<Record<number, boolean>>({});

  // Persistent Tsehay AI Chat Sync across sessions & devices
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    // Load cached chat from localStorage immediately
    try {
      const saved = localStorage.getItem(`tsehay-ai-chat_${user.uid}`) || localStorage.getItem('tsehay-ai-chat');
      if (saved && isMounted) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
        }
      }
    } catch (e) {}

    // Load permanent chat from Firestore
    const fetchChatHistory = async () => {
      try {
        const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
        const snap = await getDoc(chatHistoryRef);
        if (isMounted && snap.exists() && Array.isArray(snap.data().messages) && snap.data().messages.length > 0) {
          setChatMessages(snap.data().messages);
          try { localStorage.setItem(`tsehay-ai-chat_${user.uid}`, JSON.stringify(snap.data().messages)); } catch (e) {}
        }
      } catch (err) {
        console.warn("Could not load AI chat history from Firestore:", err);
      }
    };
    fetchChatHistory();

    return () => { isMounted = false; };
  }, [user]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const newMsgs = [...chatMessages, { role: 'user', text: userMsg }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsChatLoading(true);

    if (user?.uid) {
      try { localStorage.setItem(`tsehay-ai-chat_${user.uid}`, JSON.stringify(newMsgs)); } catch (e) {}
      (async () => {
        try {
          const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
          await setDoc(chatHistoryRef, { messages: newMsgs, updatedAt: serverTimestamp() }, { merge: true });
        } catch (e) {}
      })();
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await response.json();
      const reply = data.reply || data.error || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።";
      const finalMsgs = [...newMsgs, { role: 'ai', text: reply }];
      setChatMessages(finalMsgs);

      if (user?.uid) {
        try { localStorage.setItem(`tsehay-ai-chat_${user.uid}`, JSON.stringify(finalMsgs)); } catch (e) {}
        try {
          const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
          await setDoc(chatHistoryRef, { messages: finalMsgs, updatedAt: serverTimestamp() }, { merge: true });
        } catch (dbErr) {
          console.warn("Could not save AI chat history to Firestore:", dbErr);
        }
      }
    } catch (error: any) {
      const errorMsgs = [...newMsgs, { role: 'ai', text: "ይቅርታ፣ የሲስተም ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።" }];
      setChatMessages(errorMsgs);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearAiChat = async () => {
    if (!confirm('የ Tsehay AI ቻት ታሪክዎን ማጥፋት እርግጠኛ ነዎት? (ከጠፋ በኋላ አይመለስም)')) return;
    const defaultGreeting = [{ role: 'ai', text: "ሰላም! እኔ Tsehay AI ነኝ። የትምህርት ጥያቄዎች ካሉዎት እባክዎ ይጠይቁኝ!" }];
    setChatMessages(defaultGreeting);
    if (user?.uid) {
      try { localStorage.removeItem(`tsehay-ai-chat_${user.uid}`); } catch (e) {}
      try { localStorage.removeItem('tsehay-ai-chat'); } catch (e) {}
      try {
        const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
        await setDoc(chatHistoryRef, { messages: defaultGreeting, updatedAt: serverTimestamp() });
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!activeLesson || !activeCourse) return;
    setCurrentVideoPlayedFraction(0);
  }, [activeLesson?.title, activeCourse?.id]);

  const markLessonCompleted = async (targetLesson?: any) => {
    const target = targetLesson || activeLesson;
    if (!target || !activeCourse || !user) return;
    
    const lessonTitle = target.title;
    if (!lessonTitle) return;

    const alreadyDone = progress.includes(lessonTitle);
    const newCompletedLessons = alreadyDone ? progress : [...progress, lessonTitle];
    if (!alreadyDone) {
      setProgress(newCompletedLessons);
    }

    let totalLessonsCount = 0;
    modules.forEach((m: any) => { totalLessonsCount += (m.lessons || []).length; });
    const isFinished = totalLessonsCount > 0 && newCompletedLessons.length >= totalLessonsCount;
    if (isFinished) {
      setIsCourseCompleted(true);
    }

    const pointsToAward = target.points || 25;

    try {
      const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', activeCourse.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const curPoints = data.points || 0;
        const totalPoints = alreadyDone ? curPoints : curPoints + pointsToAward;

        await setDoc(userRef, {
          completedLessons: newCompletedLessons,
          points: totalPoints,
          isCompleted: isFinished || data.isCompleted || false,
          lastPlayedAt: new Date()
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          courseId: activeCourse.id,
          completedLessons: newCompletedLessons,
          points: pointsToAward,
          isCompleted: isFinished,
          enrolledAt: new Date(),
          lastPlayedAt: new Date()
        }, { merge: true });
      }
    } catch (err) {
      console.error("Error saving lesson completion:", err);
    }
  };

  const handleNextLesson = async () => {
    if (activeLesson) {
      await markLessonCompleted(activeLesson);
    }

    const allFlatLessons: any[] = [];
    modules.forEach((m: any, mIdx: number) => {
      (m.lessons || []).forEach((l: any, lIdx: number) => {
        allFlatLessons.push({ ...l, moduleIndex: mIdx, lessonIndex: lIdx });
      });
    });

    const currentIndex = allFlatLessons.findIndex(l => l.title === activeLesson?.title);
    if (currentIndex >= 0 && currentIndex < allFlatLessons.length - 1) {
      const nextLesson = allFlatLessons[currentIndex + 1];
      setActiveLesson(nextLesson);
    } else {
      setIsCourseCompleted(true);
      setActiveTab('quiz');
      setTimeout(() => {
        const tabsSection = document.getElementById('classroom-tabs-section');
        if (tabsSection) {
          tabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    }
  };

  const handlePrevLesson = () => {
    const allFlatLessons: any[] = [];
    modules.forEach((m: any, mIdx: number) => {
      (m.lessons || []).forEach((l: any, lIdx: number) => {
        allFlatLessons.push({ ...l, moduleIndex: mIdx, lessonIndex: lIdx });
      });
    });

    const currentIndex = allFlatLessons.findIndex(l => l.title === activeLesson?.title);
    if (currentIndex > 0) {
      setActiveLesson(allFlatLessons[currentIndex - 1]);
    }
  };

  const handleVideoProgress50 = async () => {
    if (activeLesson) {
      await markLessonCompleted(activeLesson);
    }
  };

  const handleVideoEnd = async () => {
    await handleNextLesson();
  };

  const handleQuizSubmit = async (customPrompt?: string) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : quizInput;
    if (!textToSend.trim()) return;
    
    const newMessages = [...quizMessages, { role: 'user', text: textToSend.trim() }];
    setQuizMessages(newMessages);
    if (!customPrompt) {
      setQuizInput('');
    }
    setIsQuizLoading(true);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: `I am taking a quiz for the course "${activeCourse?.title || 'Tsehay Campus Course'}". The course topic is: ${activeCourse?.category || 'General'}. Ask a relevant quiz question or evaluate the student's answer in Amharic: ${textToSend.trim()}` 
            })
        });
        
        const data = await response.json();
        setQuizMessages([...newMessages, { role: 'ai', text: data.reply || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።" }]);
        setHasTakenQuiz(true); // Unlock certificate after interaction
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
          alert('የይለፍ ቃል መቀየሪያ ኢሜል መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።');
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
        const customAdminPrompt = activeCourse?.aiPrompt ? `\n[ADMIN CUSTOM INSTRUCTION FOR THIS COURSE]\n${activeCourse.aiPrompt}\n` : '';
        const courseObjectives = Array.isArray(activeCourse?.whatYouWillLearn) ? activeCourse.whatYouWillLearn.join(', ') : '';

        const systemInstruction = `You are "Tsehay AI Tutor", the official AI guide and tutor for "Tsehay Campus" (tsehaycampus.com).

[CURRENT COURSE CONTEXT]
Active Course: "${activeCourse?.title || 'General'}"
Active Lesson: "${activeLesson?.title || 'General'}"
Course Description: "${activeCourse?.desc || ''}"
Objectives: ${courseObjectives}
${customAdminPrompt}
[STUDENT GUIDANCE & COURSE RECOMMENDATIONS]
1. Answer student questions about this course, lesson, or related skills in clear, polite, and encouraging Amharic (or English if requested).
2. Understand student interests and recommend relevant Tsehay Campus courses when appropriate:
   - Digital Marketing Course (FREE) for marketing, social media, SEO, FB ads.
   - Shein Import Business Course (4,500 ETB) for e-commerce, importing winning products, dollar payment.
   - YouTube Secrets Masterclass / Book (900 ETB) for content creation, channel growth.
   - Web Development / Coding (Coming Soon).
3. Support students patiently and encourage their learning journey.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: `I am currently studying the lesson "${activeLesson?.title || 'Intro'}" in course "${activeCourse?.title || 'General'}". My question is: ${userMsg}`, 
                systemInstruction 
            })
        });
        const data = await response.json();
        const aiReply = data.reply || data.candidates?.[0]?.content?.parts?.[0]?.text || "ይቅርታ፣ ማስተናገድ አልቻልኩም።";
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
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl mx-auto flex items-center justify-center shadow-lg p-0.5 border border-white/20 animate-logo-zoom">
              <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="ml-3 font-heading font-black text-lg md:text-xl tracking-tight notranslate select-none">
              <span className="text-primary animate-tsehay-float">Tsehay</span> <span className="text-secondary dark:text-secondary animate-campus-float">Campus</span>
            </span>
          </a>
          
          <div className="md:hidden flex items-center gap-3">
             <img src={user?.photoURL || "https://ui-avatars.com/api/?name=Nehmiya&background=7b61ff&color=fff"} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="Profile" />
          </div>
        </div>

        <nav className="flex-1 overflow-x-auto md:overflow-y-auto py-3 md:py-4 px-3 space-y-1 font-body no-scrollbar w-full flex flex-row md:flex-col gap-2 md:gap-0 items-center md:items-stretch">
          
          {/* SECTION 1: ዋና ሜኑ (Main Menu) */}
          <div className="hidden lg:flex items-center justify-between px-3 pt-1 pb-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-500 dark:text-primary flex items-center gap-2 font-heading">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              {t('main_menu')}
            </span>
            <span className="text-[9px] uppercase tracking-widest bg-amber-500/10 dark:bg-primary/15 text-amber-600 dark:text-primary font-black px-2 py-0.5 rounded-full border border-amber-500/20 dark:border-primary/30">
              Core
            </span>
          </div>

          {/* Classroom Button */}
          <button 
            onClick={() => setCurrentView('classroom')} 
            className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
              currentView === 'classroom' 
                ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark shadow-md shadow-primary/25 font-extrabold scale-[1.01]' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                currentView === 'classroom'
                  ? 'bg-dark/15 text-dark shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary'
              }`}>
                <i className="fa-solid fa-play text-xs"></i>
              </span>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-bold">
                {t('classroom')}
              </span>
            </div>
            {currentView === 'classroom' && (
              <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-dark/70"></i>
            )}
          </button>
          
          {/* My Courses Button */}
          <button 
            onClick={() => setCurrentView('courses')} 
            className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
              currentView === 'courses' 
                ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark shadow-md shadow-primary/25 font-extrabold scale-[1.01]' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                currentView === 'courses'
                  ? 'bg-dark/15 text-dark shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary'
              }`}>
                <i className="fa-solid fa-layer-group text-xs"></i>
              </span>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-bold">
                {t('my_courses')}
              </span>
            </div>
            {currentView === 'courses' && (
              <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-dark/70"></i>
            )}
          </button>

          {/* Messages Button */}
          <button 
            onClick={() => setCurrentView('messages')} 
            className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
              currentView === 'messages' 
                ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark shadow-md shadow-primary/25 font-extrabold scale-[1.01]' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                currentView === 'messages'
                  ? 'bg-dark/15 text-dark shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary'
              }`}>
                <i className="fa-solid fa-comments text-xs"></i>
              </span>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-bold">
                {t('messages')}
              </span>
            </div>
            {currentView === 'messages' && (
              <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-dark/70"></i>
            )}
          </button>

          {/* SECTION DIVIDER */}
          <div className="hidden lg:flex items-center gap-2 my-3 px-2">
            <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1"></div>
            <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">መሳሪያዎች</span>
            <div className="h-px bg-slate-200 dark:bg-slate-700/80 flex-1"></div>
          </div>

          {/* SECTION 2: መሳሪያዎች (Tools & Resources) */}
          <div className="hidden lg:flex items-center justify-between px-3 pt-0.5 pb-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-2 font-heading">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              {t('tools')}
            </span>
            <span className="text-[9px] uppercase tracking-widest bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-black px-2 py-0.5 rounded-full border border-teal-500/20">
              Tools
            </span>
          </div>

          {/* Tsehay AI Button */}
          <button 
            onClick={() => setCurrentView('ai')} 
            className={`relative flex items-center justify-between gap-2 md:gap-3 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm border cursor-pointer ${
              currentView === 'ai' 
                ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-white border-teal-400 shadow-lg shadow-teal-500/30 scale-[1.02]' 
                : 'bg-slate-100/70 dark:bg-slate-800/70 hover:bg-teal-500/10 dark:hover:bg-teal-950/30 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:border-teal-500/40 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'ai'
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-500/15 text-teal-500 dark:text-teal-400'
                }`}>
                  <i className="fa-solid fa-robot text-sm"></i>
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-ping"></span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
              </div>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-heading font-black">
                Tsehay AI
              </span>
            </div>
            <span className="hidden lg:flex items-center gap-1 text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              ● Online
            </span>
          </button>
          
          {/* Certificates Button */}
          <button 
            onClick={() => setCurrentView('certificates')} 
            className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
              currentView === 'certificates' 
                ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark shadow-md shadow-primary/25 font-extrabold scale-[1.01]' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                currentView === 'certificates'
                  ? 'bg-dark/15 text-dark shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-amber-500/20 group-hover:text-amber-500'
              }`}>
                <i className="fa-solid fa-award text-sm"></i>
              </span>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-bold">
                {t('certificates')}
              </span>
            </div>
            {currentView === 'certificates' && (
              <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-dark/70"></i>
            )}
          </button>
          
          {/* Settings Button */}
          <button 
            onClick={() => setCurrentView('settings')} 
            className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
              currentView === 'settings' 
                ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark shadow-md shadow-primary/25 font-extrabold scale-[1.01]' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-dark dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                currentView === 'settings'
                  ? 'bg-dark/15 text-dark shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 group-hover:bg-primary/20 group-hover:text-primary'
              }`}>
                <i className="fa-solid fa-gear text-sm"></i>
              </span>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-bold">
                {t('settings')}
              </span>
            </div>
            {currentView === 'settings' && (
              <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-dark/70"></i>
            )}
          </button>
        </nav>

        <div className="hidden md:block p-4 w-full border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-center lg:justify-start gap-3 p-2 mb-2">
            <img src={user?.photoURL || "https://ui-avatars.com/api/?name=" + (user?.displayName || 'User') + "&background=7b61ff&color=fff"} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="Profile" />
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user?.displayName || 'Tsehay Student'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {courses.some(c => {
                  const isFree = c.isFree === true || c.price === 'Free' || c.price === '0' || c.price === 0 || Number(c.price) === 0;
                  return !isFree;
                }) ? t('pro_member') : 'Free Member'}
              </p>
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
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 relative">
                <a 
                  href="/" 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 hover:from-primary hover:to-yellow-400 text-secondary dark:text-white hover:text-dark font-black px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all duration-300 shadow-sm border border-blue-200 dark:border-slate-600 transform hover:-translate-y-0.5 group shrink-0"
                >
                  <i className="fa-solid fa-house text-xs group-hover:scale-110 transition-transform text-primary group-hover:text-dark"></i>
                  <span className="font-bold">{t('back_to_home')}</span>
                </a>

                <button 
                  onClick={toggleTheme} 
                  title="Toggle Dark / Light Theme"
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-500/20 dark:bg-slate-700/80 hover:bg-primary/40 dark:hover:bg-slate-600 flex items-center justify-center transition-all duration-300 shadow-md border-2 border-primary/50 dark:border-slate-600 text-dark dark:text-yellow-400 shrink-0 group"
                >
                    <i className={`fa-solid ${isDarkTheme ? 'fa-sun text-yellow-400' : 'fa-moon text-secondary'} text-sm group-hover:scale-110 transition-transform`}></i>
                </button>
                <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10 border border-primary/30 px-3 py-1.5 rounded-full shadow-sm cursor-help hover:scale-105 transition" title="የተከማቹ ፖይንቶች (Earned Points)">
                    <div className="bg-primary/20 p-1 rounded-full"><i className="fa-solid fa-bolt text-primary text-xs"></i></div>
                    <span className="font-black text-dark dark:text-white text-sm font-heading">
                      {(() => {
                        let totalCount = 0;
                        modules.forEach((m: any) => { totalCount += (m.lessons || []).length; });
                        if (totalCount === 0) totalCount = 1;
                        const pointsPerLesson = Math.max(1, Math.round(100 / totalCount));
                        const earned = Math.min(100, progress.length * pointsPerLesson) + (studentNotes.length * 10);
                        return earned;
                      })()} Pts
                    </span>
                </div>
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-gray-400 dark:text-gray-300 hover:text-dark dark:hover:text-white transition text-xl shrink-0 p-1">
                      <i className="fa-regular fa-bell"></i>
                      {notificationsList.filter(n => !n.read).length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                          {notificationsList.filter(n => !n.read).length}
                        </span>
                      )}
                  </button>
                  {showNotifications && (
                    <div className="absolute top-11 right-0 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                       <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3 mb-3">
                         <div className="flex items-center gap-2">
                           <i className="fa-solid fa-bell text-primary text-sm"></i>
                           <h4 className="text-xs font-black uppercase tracking-wider text-dark dark:text-white">አሳውቂያዎች (Notifications)</h4>
                         </div>
                         <button onClick={handleMarkAllNotificationsRead} className="text-[11px] font-bold text-secondary dark:text-primary hover:underline">
                           ሁሉንም እንደተነበቡ ቁጠር
                         </button>
                       </div>

                       <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {notificationsList.map(n => (
                            <div key={n.id} className={`flex items-start gap-3 p-2.5 rounded-xl transition ${n.read ? 'bg-transparent opacity-75' : 'bg-blue-50/60 dark:bg-slate-700/50 border border-blue-100 dark:border-slate-600'}`}>
                                <div className="w-8 h-8 rounded-full bg-primary/20 text-dark dark:text-primary flex items-center justify-center shrink-0 mt-0.5">
                                  <i className="fa-solid fa-bullhorn text-xs"></i>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-dark dark:text-white">{n.title}</p>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight mt-0.5">{n.message}</p>
                                    <span className="text-[9px] text-gray-400 mt-1 block">{n.createdAt}</span>
                                </div>
                            </div>
                          ))}
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
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black font-heading text-dark dark:text-white mb-2">{activeCourse?.title || t('course_loading')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-body text-sm">{activeCourse?.category || 'Tsehay Campus Course'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                
                {/* Left Side: Video & Tabs */}
                <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
                    
                    {/* Cinematic Video Player */}
                    <div className="bg-dark rounded-2xl overflow-hidden shadow-2xl relative border border-gray-800 aspect-video flex items-center justify-center group/player">
                        
                        {/* Dynamic Translucent Anti-Piracy Watermark */}
                        {user && (
                            <div 
                                className="absolute z-30 pointer-events-none text-[10px] sm:text-xs font-mono font-bold text-white/20 select-none transition-all duration-1000 tracking-wider"
                                style={{ top: `${watermarkPos.y}%`, left: `${watermarkPos.x}%` }}
                            >
                                <span className="bg-black/30 px-2 py-0.5 rounded backdrop-blur-[1px] border border-white/5">
                                    {user.email || user.displayName || user.uid} • Tsehay Campus
                                </span>
                            </div>
                        )}

                        {/* Auto-Resume Floating Toast */}
                        {resumeToast && (
                            <div className="absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md text-white border border-amber-400/40 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                                <i className="fa-solid fa-clock-rotate-left text-amber-400 text-sm"></i>
                                <div className="text-xs">
                                    <span className="font-bold block text-[11px] text-amber-300">ያቆሙበት ደቂቃ፦ {resumeToast.timeStr}</span>
                                    <span className="text-[10px] text-gray-300">ከዚህ ሰኮንድ ይቀጥሉ?</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                                            playerRef.current.seekTo(resumeToast.seconds);
                                        }
                                        setResumeToast(null);
                                    }}
                                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                                >
                                    ይቀጥሉ
                                </button>
                                <button 
                                    onClick={() => setResumeToast(null)}
                                    className="text-gray-400 hover:text-white text-xs px-1"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* Playback Speed Quick Selector (Top Right) */}
                        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg opacity-80 group-hover/player:opacity-100 transition-opacity">
                            {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                                <button
                                    key={spd}
                                    onClick={() => setPlaybackSpeed(spd)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black transition cursor-pointer ${
                                        playbackSpeed === spd 
                                            ? 'bg-primary text-slate-950 shadow-xs' 
                                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={`${spd}x Playback Speed`}
                                >
                                    {spd}x
                                </button>
                            ))}
                        </div>

                        {/* Video End Course Rating Overlay */}
                        {isCourseCompleted && activeCourse?.id && !ratedCourses[activeCourse.id] && !(typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse.id}`)) && !dismissedRatingOverlay[activeCourse.id] && (
                          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                             <button 
                               onClick={() => setDismissedRatingOverlay(prev => ({ ...prev, [activeCourse.id]: true }))}
                               className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm font-bold w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                               title="ዝጋ (Close)"
                             >
                               ✕
                             </button>
                             <div className="w-14 h-14 bg-amber-400/20 text-primary rounded-full flex items-center justify-center text-2xl mb-3 border-2 border-primary animate-bounce">
                                 <i className="fa-solid fa-star"></i>
                             </div>
                             <h3 className="text-lg md:text-xl font-black text-white font-heading mb-1.5">እንኳን ደስ አሎት! ኮርሱን አጠናቀዋል።</h3>
                             <p className="text-xs text-gray-300 mb-5 max-w-sm">እባክዎ ለኮርሱ እና ለአስተማሪው ያለዎትን ሬቲንግ እና አስተያየት ይስጡ።</p>
                             <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => setShowRatingModal(true)}
                                 className="bg-primary text-dark font-black px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition shadow-lg text-xs transform hover:scale-105 cursor-pointer active:scale-95"
                               >
                                 ⭐ ሬቲንግ ስጥ (Rate Course)
                               </button>
                               <button 
                                 onClick={() => setDismissedRatingOverlay(prev => ({ ...prev, [activeCourse.id]: true }))}
                                 className="bg-white/10 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-white/20 transition text-xs cursor-pointer"
                               >
                                 አሁን ይለፈኝ
                               </button>
                             </div>
                          </div>
                        )}
                        {(() => {
                            const rawUrl = activeLesson?.video || activeLesson?.videoUrl || activeLesson?.url || activeCourse?.video || activeCourse?.videoUrl || activeCourse?.promoVideo || activeCourse?.previewVideo;
                            if (!rawUrl) return null;
                            
                            let cleanUrl = rawUrl.trim();
                            if (cleanUrl.includes('<iframe') && cleanUrl.includes('src="')) {
                                const match = cleanUrl.match(/src="([^"]+)"/);
                                if (match) cleanUrl = match[1];
                            }
                            cleanUrl = cleanUrl.replace(/&amp;/g, '&');
                            
                            if (cleanUrl.includes('mediadelivery.net')) {
                                const embedUrl = cleanUrl.replace('/play/', '/embed/').replace('video.mediadelivery.net', 'iframe.mediadelivery.net');
                                return (
                                    <iframe
                                        src={embedUrl}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full border-none"
                                        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                );
                            } else if (cleanUrl.includes('drive.google.com')) {
                                return (
                                    <iframe
                                        src={cleanUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview')}
                                        loading="lazy"
                                        className="absolute inset-0 w-full h-full border-none"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                    ></iframe>
                                );
                            } else {
                                return (
                                    <ReactPlayer
                                        ref={playerRef}
                                        key={cleanUrl}
                                        url={cleanUrl}
                                        width="100%"
                                        height="100%"
                                        controls={true}
                                        playing={true}
                                        playbackRate={playbackSpeed}
                                        onProgress={({ played, playedSeconds }: { played: number; playedSeconds: number }) => {
                                            setCurrentVideoPlayedFraction(played);
                                            if (activeCourse?.id && activeLesson?.title && playedSeconds > 5) {
                                                try {
                                                    localStorage.setItem(`tsehay_resume_${activeCourse.id}_${encodeURIComponent(activeLesson.title)}`, Math.floor(playedSeconds).toString());
                                                } catch(e) {}
                                            }
                                            if (played >= 0.90 && activeLesson && !progress.includes(activeLesson.title)) {
                                                markLessonCompleted(activeLesson);
                                            }
                                        }}
                                        onEnded={async () => {
                                            if (activeLesson) {
                                                await markLessonCompleted(activeLesson);
                                            }
                                            await handleNextLesson();
                                        }}
                                        className="absolute inset-0"
                                    />
                                );
                            }
                        })() || (
                            <>
                                <img src={formatDriveImageUrl(activeCourse?.image) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video cover" />
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

                    {/* Lesson Action & Navigation Bar */}
                    {(() => {
                        const allFlatLessons: any[] = [];
                        modules.forEach((m: any, mIdx: number) => {
                            (m.lessons || []).forEach((l: any, lIdx: number) => {
                                allFlatLessons.push({ ...l, moduleIndex: mIdx, lessonIndex: lIdx });
                            });
                        });
                        const currentIdx = allFlatLessons.findIndex(l => l.title === activeLesson?.title);
                        const hasPrev = currentIdx > 0;
                        const hasNext = currentIdx >= 0 && currentIdx < allFlatLessons.length - 1;
                        const isCurrentCompleted = activeLesson && progress.includes(activeLesson.title);

                        return (
                            <div className="bg-slate-900/90 dark:bg-slate-900/95 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl shadow-black/25 border border-slate-700/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 sm:gap-4 transition-all">
                                
                                {/* Previous Lesson Button */}
                                <button 
                                    onClick={handlePrevLesson}
                                    disabled={!hasPrev}
                                    className={`relative group px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 flex items-center gap-2.5 cursor-pointer active:scale-95 border ${
                                        hasPrev
                                            ? 'bg-slate-800 hover:bg-slate-700/90 text-white border-slate-600/80 hover:border-slate-500 shadow-md hover:shadow-lg hover:shadow-black/40 hover:-translate-x-1'
                                            : 'bg-slate-800/40 text-slate-500 border-slate-800/60 cursor-not-allowed opacity-40'
                                    }`}
                                    title={hasPrev ? (lang === 'am' ? 'የቀደመው ትምህርት' : 'Previous Lesson') : ''}
                                >
                                    <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        hasPrev 
                                            ? 'bg-slate-700/90 group-hover:bg-primary group-hover:text-dark text-primary group-hover:-translate-x-0.5 shadow-inner' 
                                            : 'bg-slate-800 text-slate-600'
                                    }`}>
                                        <i className="fa-solid fa-chevron-left text-xs sm:text-sm"></i>
                                    </span>
                                    <span className="font-extrabold tracking-wide">
                                        {lang === 'am' ? 'የቀደመው' : 'Previous'}
                                    </span>
                                </button>

                                {/* Center: Lesson Progress Counter & Mark Complete */}
                                <div className="flex items-center gap-2 sm:gap-3 order-3 sm:order-2 w-full sm:w-auto justify-center sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                    {allFlatLessons.length > 0 && currentIdx >= 0 && (
                                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-gray-300">
                                            <i className="fa-solid fa-layer-group text-primary text-[10px]"></i>
                                            <span>{currentIdx + 1} / {allFlatLessons.length}</span>
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => markLessonCompleted(activeLesson)}
                                        className={`group relative overflow-hidden px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 border ${
                                            isCurrentCompleted
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20 hover:bg-emerald-500/30'
                                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02]'
                                        }`}
                                    >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${isCurrentCompleted ? 'bg-emerald-500/40 text-emerald-200' : 'bg-white/20 text-white'}`}>
                                            <i className={`fa-solid ${isCurrentCompleted ? 'fa-check' : 'fa-check'} text-[10px]`}></i>
                                        </span>
                                        <span className="font-extrabold tracking-wide">
                                            {isCurrentCompleted ? (lang === 'am' ? 'ተጠናቋል ✓' : 'Completed ✓') : (lang === 'am' ? 'ጨርሻለሁ' : 'Mark Complete')}
                                        </span>
                                        {!isCurrentCompleted && (
                                            <span className="text-[10px] bg-primary text-dark font-black px-1.5 py-0.5 rounded-md ml-0.5 shadow-xs animate-pulse">
                                                +{activeLesson?.points || 25}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Next / Quiz Button */}
                                <button 
                                    onClick={handleNextLesson}
                                    className={`relative group overflow-hidden px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 flex items-center gap-2.5 cursor-pointer active:scale-95 border shadow-xl ${
                                        hasNext 
                                            ? 'bg-gradient-to-r from-amber-400 via-primary to-yellow-400 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 text-dark border-amber-300/70 shadow-primary/30 hover:shadow-primary/60 hover:-translate-y-0.5 hover:scale-[1.02]' 
                                            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-white border-emerald-300/70 shadow-emerald-500/40 hover:shadow-emerald-500/70 ring-2 ring-emerald-400/50 animate-pulse hover:-translate-y-0.5 hover:scale-[1.02]'
                                    }`}
                                >
                                    {/* Shimmer light sweep */}
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"></span>

                                    {hasNext ? (
                                        <>
                                            <span className="font-black tracking-wide drop-shadow-xs">
                                                {lang === 'am' ? 'ቀጣይ ትምህርት' : 'Next Lesson'}
                                            </span>
                                            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-dark/15 backdrop-blur-xs flex items-center justify-center group-hover:translate-x-1 group-hover:bg-dark/25 transition-all duration-300 shadow-inner">
                                                <i className="fa-solid fa-arrow-right text-xs sm:text-sm text-dark"></i>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-inner">
                                                <i className="fa-solid fa-graduation-cap text-sm sm:text-base text-white"></i>
                                            </span>
                                            <span className="font-black tracking-wide drop-shadow-xs">
                                                {lang === 'am' ? 'ወደ ፈተና (Quiz)' : 'Take Final Quiz'}
                                            </span>
                                            <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1.5 transition-transform duration-300"></i>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })()}

                    {/* Tabs */}
                    <div id="classroom-tabs-section" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden min-h-[300px] scroll-mt-6">
                        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 no-scrollbar bg-gray-50/50 dark:bg-slate-800/50 px-2 pt-2">
                            <button onClick={() => setActiveTab('syllabus')} className={`lg:hidden px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] font-bold whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'syllabus' ? 'text-dark dark:text-primary border-b-2 border-primary font-black' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                <i className="fa-solid fa-list-ol text-primary"></i> <span>ትምህርቶች (Syllabus)</span>
                            </button>
                            <button onClick={() => setActiveTab('overview')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] font-bold whitespace-nowrap shrink-0 ${activeTab === 'overview' ? 'text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>{t('overview')}</button>
                            <button onClick={() => setActiveTab('resources')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'resources' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                <i className="fa-solid fa-folder-open text-amber-500"></i> <span>ፋይሎች (Resources)</span>
                            </button>
                            <button onClick={() => setActiveTab('notes')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'notes' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                <i className="fa-regular fa-pen-to-square"></i> {t('notes')}
                            </button>
                            <button onClick={() => setActiveTab('qa')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'qa' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('qa')} <i className="fa-regular fa-comments"></i>
                            </button>
                            <button onClick={() => setActiveTab('community')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'community' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                <i className="fa-brands fa-telegram text-[#26A5E4]"></i> <span>VIP ማህበረሰብ</span>
                            </button>
                            <button onClick={() => setActiveTab('quiz')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'quiz' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('quiz')} <i className="fa-solid fa-list-check"></i>
                            </button>
                            <button onClick={() => setActiveTab('certificate')} className={`px-4 sm:px-6 py-3.5 sm:py-4 font-heading text-xs sm:text-[15px] whitespace-nowrap flex items-center gap-1.5 shrink-0 ${activeTab === 'certificate' ? 'font-bold text-dark dark:text-white border-b-2 border-secondary dark:border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white'}`}>
                                {t('certificate')} <i className="fa-solid fa-award text-primary"></i>
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6 lg:p-8">
                            {activeTab === 'syllabus' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-primary/10 dark:bg-primary/20 p-4 rounded-2xl border border-primary/30">
                                        <div>
                                            <h4 className="font-black text-sm text-dark dark:text-white">የኮርስ ይዘት እና ሂደት</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">ያሉትን ትምህርቶች መርጠው ይመልከቱ</p>
                                        </div>
                                        {(() => {
                                            let totalCount = 0;
                                            modules.forEach((m: any) => { totalCount += (m.lessons || []).length; });
                                            if (totalCount === 0) totalCount = 1;
                                            const percent = Math.min(100, Math.round((progress.length / totalCount) * 100));
                                            return (
                                                <span className="text-xs font-black bg-primary text-dark px-3 py-1.5 rounded-full shadow-xs">
                                                    {percent}% ተጠናቋል
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {modules.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 text-sm font-bold">
                                            ምንም ትምህርት አልተገኘም
                                        </div>
                                    ) : (
                                        (() => {
                                            const allFlatLessons: any[] = [];
                                            modules.forEach((m: any) => {
                                                (m.lessons || []).forEach((l: any) => allFlatLessons.push(l));
                                            });

                                            let currentGlobalIdx = 0;

                                            return modules.map((mod: any, idx: number) => (
                                                <div key={mod.id || idx} className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                                    <div className="bg-gray-50 dark:bg-slate-800/90 p-3.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                                        <h4 className="font-black text-xs sm:text-sm text-dark dark:text-white">ክፍል {idx + 1}: {mod.title}</h4>
                                                        <span className="text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold px-2 py-0.5 rounded-md">
                                                            {(mod.lessons || []).length} ትምህርቶች
                                                        </span>
                                                    </div>
                                                    <div className="p-2 space-y-1.5">
                                                        {(mod.lessons || []).map((lesson: any, lidx: number) => {
                                                            const globalIdx = currentGlobalIdx++;
                                                            const isActive = activeLesson?.title === lesson.title;
                                                            const isCompleted = progress.includes(lesson.title);
                                                            
                                                            const prevLessonTitle = globalIdx > 0 ? allFlatLessons[globalIdx - 1]?.title : null;
                                                            const isUnlocked = isCourseCompleted || globalIdx === 0 || (prevLessonTitle ? progress.includes(prevLessonTitle) : true);

                                                            return (
                                                                <div 
                                                                    key={lidx} 
                                                                    onClick={() => {
                                                                        if (!isUnlocked) {
                                                                            alert("🔒 ይህ ትምህርት አልተከፈተም! እባክዎ መጀመሪያ የቀደመውን ትምህርት አይተው ያጠናቁ።");
                                                                            return;
                                                                        }
                                                                        const selectedLesson = {...lesson, moduleIndex: idx, lessonIndex: lidx};
                                                                        setActiveLesson(selectedLesson);
                                                                        try {
                                                                            localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(selectedLesson));
                                                                        } catch(e) {}
                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    }}
                                                                    className={`flex items-center justify-between p-3 rounded-xl transition ${
                                                                        !isUnlocked
                                                                            ? 'opacity-60 cursor-not-allowed bg-gray-100/40 dark:bg-slate-900/20'
                                                                            : isActive 
                                                                                ? 'bg-primary/15 dark:bg-primary/25 border-l-4 border-primary shadow-xs cursor-pointer active:scale-[0.98]' 
                                                                                : 'hover:bg-gray-50 dark:hover:bg-slate-800 bg-gray-50/50 dark:bg-slate-900/40 cursor-pointer active:scale-[0.98]'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                                        {isActive ? (
                                                                            <i className="fa-solid fa-circle-play text-primary text-base animate-pulse shrink-0"></i>
                                                                        ) : isCompleted ? (
                                                                            <i className="fa-solid fa-circle-check text-emerald-500 text-base shrink-0"></i>
                                                                        ) : !isUnlocked ? (
                                                                            <i className="fa-solid fa-lock text-gray-400 dark:text-gray-500 text-sm shrink-0"></i>
                                                                        ) : (
                                                                            <i className="fa-solid fa-circle-play text-gray-400 text-sm shrink-0"></i>
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <p className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : !isUnlocked ? 'text-gray-400 dark:text-gray-500' : 'text-dark dark:text-white'}`}>
                                                                                {lesson.title}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                                                                <span><i className="fa-solid fa-video"></i> {lesson.duration || '00:00'}</span>
                                                                                <span className="text-primary font-bold">+{lesson.points || 25} ነጥብ</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {isCompleted ? (
                                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md font-black shrink-0 flex items-center gap-1">
                                                                            <i className="fa-solid fa-check"></i> ተጠናቋል
                                                                        </span>
                                                                    ) : isActive ? (
                                                                        <span className="text-[10px] bg-primary text-dark px-2.5 py-1 rounded-md font-black shrink-0 animate-pulse">
                                                                            እየታየ ነው
                                                                        </span>
                                                                    ) : !isUnlocked ? (
                                                                        <span className="text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-1">
                                                                            <i className="fa-solid fa-lock text-[9px]"></i> ተቆልፏል
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>
                            )}

                            {activeTab === 'overview' && (
                                <>
                                    {/* Contextual AI Quick Bar */}
                                    <div className="bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/5 dark:from-amber-500/20 dark:via-primary/20 dark:to-transparent p-4 sm:p-5 rounded-2xl border border-amber-500/30 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-lg font-black shrink-0 shadow-md">
                                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-dark dark:text-white flex items-center gap-2">
                                                    Tsehay AI የትምህርት ረዳት 
                                                    <span className="text-[10px] bg-primary text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">Smart Tutor</span>
                                                </h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">ስለዚህ ትምህርት ፈጣን ማጠቃለያ ወይም ማብራሪያ ያግኙ</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                                            <button
                                                onClick={handleGenerateLessonSummary}
                                                disabled={isGeneratingSummary}
                                                className="flex-1 md:flex-initial bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-primary text-dark dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                                            >
                                                {isGeneratingSummary ? (
                                                    <>
                                                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                        <span>ማጠቃለያ በማዘጋጀት ላይ...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-solid fa-bolt text-amber-500"></i>
                                                        <span>የትምህርቱ ማጠቃለያ (AI Summary)</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setShowLessonAiModal(true)}
                                                className="flex-1 md:flex-initial bg-primary hover:bg-yellow-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                            >
                                                <i className="fa-solid fa-comments"></i>
                                                <span>ስለዚህ ትምህርት AIን ጠይቅ</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Render AI Summary Box if Generated */}
                                    {lessonSummary && (
                                        <div className="bg-amber-50/50 dark:bg-slate-900/80 p-5 rounded-2xl border border-amber-400/40 shadow-md mb-8 animate-in fade-in duration-300">
                                            <div className="flex items-center justify-between mb-3 border-b border-amber-400/20 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-sparkles text-amber-500"></i>
                                                    <h4 className="font-black text-sm text-dark dark:text-white">የትምህርቱ ዋና ዋና ነጥቦች (AI Key Takeaways)</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(lessonSummary);
                                                            alert('ማጠቃለያው ኮፒ ተደርጓል!');
                                                        }}
                                                        className="text-xs bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:text-primary transition"
                                                    >
                                                        <i className="fa-solid fa-copy mr-1"></i> ኮፒ
                                                    </button>
                                                    <button
                                                        onClick={() => setLessonSummary(null)}
                                                        className="text-gray-400 hover:text-white text-xs px-1"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-body whitespace-pre-wrap">
                                                {lessonSummary}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-100 dark:border-slate-700">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-slate-600 shadow-md bg-blue-50 flex items-center justify-center text-secondary text-2xl overflow-hidden shrink-0">
                                                {activeCourse?.instructorImage ? (
                                                    <img 
                                                        src={(() => {
                                                            const url = activeCourse.instructorImage;
                                                            if (!url) return url;
                                                            const match = url.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
                                                            if (match && match[1]) {
                                                              return `https://lh3.googleusercontent.com/d/${match[1]}`;
                                                            }
                                                            return url;
                                                        })()} 
                                                        onError={(e) => { 
                                                          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeCourse?.instructor || 'Instructor')}&background=F9B03C&color=fff&size=128`;
                                                          if (e.currentTarget.src !== fallback) {
                                                            e.currentTarget.src = fallback;
                                                          }
                                                        }}
                                                        alt="Instructor" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <i className="fa-solid fa-user-tie"></i>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-dark dark:text-white text-lg font-heading">{activeCourse?.instructor || 'Eyoub Sahle'}</p>
                                                <p className="text-sm text-secondary dark:text-primary font-bold">{t('lead_instructor')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShowRatingModal(true)}
                                                className={`h-11 px-4 rounded-full border text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                                                    ratedCourses[activeCourse?.id] || (typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse?.id}`))
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                                                        : 'bg-primary text-dark border-primary hover:bg-yellow-400'
                                                }`}
                                                title="ለዚህ ኮርስ ሬቲንግ ይስጡ"
                                            >
                                                <i className="fa-solid fa-star text-amber-500"></i>
                                                <span>
                                                    {ratedCourses[activeCourse?.id] || (typeof window !== 'undefined' && localStorage.getItem(`rated_course_${activeCourse?.id}`))
                                                        ? 'ደረጃ ሰጥተዋል ✓'
                                                        : 'ሬቲንግ ስጥ'}
                                                </span>
                                            </button>
                                            <a 
                                                href={(() => {
                                                    const username = (activeCourse?.instructorTelegram || 'EyoubSahle').replace('@', '').trim();
                                                    return `https://t.me/${username}`;
                                                })()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="የመምህሩ ቴሌግራም (Instructor Telegram)"
                                                className="w-11 h-11 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[#26A5E4] flex items-center justify-center hover:bg-[#26A5E4] hover:text-white transition-all shadow-md transform hover:-translate-y-1"
                                            >
                                                <i className="fa-brands fa-telegram text-xl"></i>
                                            </a>
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
                                </>
                            )}

                            {activeTab === 'resources' && (
                                <div className="space-y-6">
                                    <div className="bg-primary/10 dark:bg-primary/20 p-5 rounded-2xl border border-primary/30 flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <h3 className="font-heading font-black text-lg text-dark dark:text-white flex items-center gap-2">
                                                <i className="fa-solid fa-folder-open text-primary"></i>
                                                <span>የኮርስ ፋይሎች እና ማቴሪያሎች (Resources & Assets)</span>
                                            </h3>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">ለተግባራዊ ልምምድ የሚያግዙ PDF ማቴሪያሎች፣ ቴምፕሌቶች እና ፋይሎች</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Main Course PDF */}
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-primary/50 transition">
                                            <div className="flex items-start gap-3.5 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm text-dark dark:text-white leading-tight">{activeCourse?.pdfTitle || 'የኮርስ መማሪያ ሰነድ (Course Manual PDF)'}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">ሙሉ የትምህርቱ የተዘጋጀ ማስታወሻ እና መመሪያ</p>
                                                </div>
                                            </div>
                                            {activeCourse?.pdfUrl ? (
                                                <a
                                                    href={(() => {
                                                        const url = activeCourse.pdfUrl;
                                                        const match = url.match(/(?:file\/d\/|id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
                                                        if (match && match[1]) {
                                                            return `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
                                                        }
                                                        return url;
                                                    })()}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-red-50 dark:bg-red-950/30 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                                                >
                                                    <i className="fa-solid fa-download"></i>
                                                    <span>PDF አውርድ / ይመልከቱ (Download)</span>
                                                </a>
                                            ) : (
                                                <div className="text-xs text-gray-400 italic bg-gray-50 dark:bg-slate-800 p-2.5 rounded-xl text-center">
                                                    ማቴሪያሉ በቅርቡ ይጨመራል
                                                </div>
                                            )}
                                        </div>

                                        {/* Practical Worksheets & Assets */}
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-primary/50 transition">
                                            <div className="flex items-start gap-3.5 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                                                    <i className="fa-solid fa-layer-group"></i>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm text-dark dark:text-white leading-tight">የተግባር ልምምድ ፋይሎች (Practice Assets)</h4>
                                                    <p className="text-xs text-gray-500 mt-1">የትምህርቱ ማስፈንጠሪያዎች፣ ቴምፕሌቶች እና የኮድ ናሙናዎች</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('overview')}
                                                className="w-full bg-primary/10 dark:bg-primary/20 hover:bg-primary hover:text-slate-950 text-dark dark:text-primary font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                                            >
                                                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                <span>የትምህርቱን ማብራሪያ ይመልከቱ</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'community' && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-[#26A5E4]/15 via-blue-900/10 to-slate-900 p-6 sm:p-8 rounded-3xl border border-[#26A5E4]/30 shadow-lg relative overflow-hidden">
                                        <div className="max-w-xl relative z-10">
                                            <span className="bg-[#26A5E4] text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs mb-3 inline-block">
                                                VIP Community
                                            </span>
                                            <h3 className="text-xl sm:text-2xl font-black text-dark dark:text-white font-heading mb-2">
                                                የፀሐይ ካምፓስ የተማሪዎች VIP ማህበረሰብ
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                                ከተመዘገቡ ተማሪዎች፣ ከአስተማሪው እና ከቴክኖሎጂ ባለሙያዎች ጋር በቀጥታ ይገናኙ፣ ጥያቄ ይጠይቁ፣ አዳዲስ የገበያ መረጃዎችን እና የኔትወርኪንግ እድሎችን ያግኙ።
                                            </p>
                                            <a
                                                href="https://t.me/TsehayTeam"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2.5 bg-[#26A5E4] hover:bg-[#1f8ec4] text-white font-black px-6 py-3.5 rounded-2xl text-sm transition shadow-lg shadow-[#26A5E4]/30 active:scale-95 transform hover:-translate-y-0.5"
                                            >
                                                <i className="fa-brands fa-telegram text-lg"></i>
                                                <span>ወደ VIP ቴሌግራም ግሩፕ ይቀላቀሉ (Join VIP Telegram)</span>
                                            </a>
                                        </div>
                                        <div className="absolute -bottom-6 -right-6 text-[#26A5E4]/10 text-9xl pointer-events-none">
                                            <i className="fa-brands fa-telegram"></i>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'notes' && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                        <h3 className="font-heading font-black text-lg text-dark dark:text-white mb-2 flex items-center gap-2">
                                            <i className="fa-solid fa-pen-to-square text-primary"></i>
                                            <span>አዲስ ማስታወሻ መዝግብ (Add New Note)</span>
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">ለዚህ ሌሰን ({activeLesson?.title || 'ኮርስ'}) የሚረዱዎትን ዋና ዋና ነጥቦች እዚህ ይፃፉና ያስቀምጡ።</p>
                                        <textarea
                                            value={noteInput}
                                            onChange={e => setNoteInput(e.target.value)}
                                            placeholder="ማስታወሻዎን እዚህ ይፃፉ..."
                                            rows={3}
                                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm text-dark dark:text-white outline-none focus:border-primary transition resize-none"
                                        ></textarea>
                                        <div className="flex justify-between items-center mt-3">
                                            {noteSavedMessage && (
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                                                    <i className="fa-solid fa-circle-check mr-1"></i> {noteSavedMessage}
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => handleSaveNote()} 
                                                className="ml-auto bg-primary text-dark font-black px-5 py-2 rounded-xl hover:bg-yellow-400 transition text-sm shadow-sm flex items-center gap-2"
                                            >
                                                <i className="fa-solid fa-floppy-disk"></i>
                                                <span>ማስታወሻ መዝግብ</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-heading font-black text-lg text-dark dark:text-white mb-4 flex items-center justify-between">
                                            <span>የተመዘገቡ ማስታወሻዎች ({studentNotes.length})</span>
                                        </h3>
                                        {studentNotes.length === 0 ? (
                                            <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                                <i className="fa-regular fa-note-sticky text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">እስካሁን ምንም ማስታወሻ አልተመዘገበም።</p>
                                                <p className="text-xs text-gray-400 mt-1">በላይኛው ሳጥን ይፃፉ ወይም በ Tsehay AI መልስ ላይ "ወደ ማስታወሻ አድ አድርግ" የሚለውን ይጫኑ።</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {studentNotes.map((note) => (
                                                    <div key={note.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm relative group hover:border-primary/50 transition">
                                                        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs ${
                                                                    note.source === 'ai' || (note.lessonTitle && note.lessonTitle.includes('Tsehay AI'))
                                                                        ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/30'
                                                                        : 'bg-primary/20 text-dark dark:text-primary border border-primary/30'
                                                                }`}>
                                                                    <i className={`fa-solid ${note.source === 'ai' || (note.lessonTitle && note.lessonTitle.includes('Tsehay AI')) ? 'fa-robot text-primary' : 'fa-bookmark text-primary'} text-[11px]`}></i>
                                                                    <span>{note.lessonTitle || activeCourse?.title || 'ማስታወሻ'}</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-400 font-bold">{note.createdAt}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(note.text);
                                                                        alert('ማስታወሻው ኮፒ ተደርጓል! (Note Copied)');
                                                                    }}
                                                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-300 transition flex items-center justify-center text-xs cursor-pointer"
                                                                    title="ኮፒ አድርግ (Copy)"
                                                                >
                                                                    <i className="fa-solid fa-copy"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteNote(note.id)} 
                                                                    className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-500 transition flex items-center justify-center text-xs cursor-pointer" 
                                                                    title="ሰርዝ (Delete Note)"
                                                                >
                                                                    <i className="fa-solid fa-trash-can"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-body leading-relaxed whitespace-pre-wrap">
                                                            {note.text}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'qa' && (
                                <div className="p-4">
                                    <div className="flex flex-col min-h-[420px] bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden relative shadow-sm">
                                        <div className="bg-gradient-to-r from-secondary to-slate-800 text-white p-4 font-bold flex items-center justify-between shadow-sm z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                    <i className="fa-solid fa-chalkboard-user text-lg"></i>
                                                </div>
                                                <div>
                                                    <h3 className="font-heading font-black text-sm">ከመምህሩ ጋር ጥያቄና መልስ (Ask Instructor)</h3>
                                                    <p className="text-[11px] text-gray-300 font-normal">ለዚህ ኮርስ ያሎትን ጥያቄ፣ ፎቶ አሊያም ድምፅ ለአስተማሪው ያስገቡ</p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] bg-primary text-dark font-black px-3 py-1 rounded-full">
                                                {activeCourse?.instructor || 'Eyoub Sahle'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px]">
                                            {studentTickets.filter((t: any) => !activeCourse || t.courseId === activeCourse.id).length === 0 ? (
                                                <div className="text-center py-12 bg-white dark:bg-slate-900/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                                    <i className="fa-solid fa-messages text-4xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
                                                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">ለዚህ ኮርስ እስካሁን ምንም ጥያቄ አልላኩም።</p>
                                                    <p className="text-xs text-gray-400 mt-1">ያልገባዎትን ነገር ፅፈው ወይም በፎቶ/በድምፅ ለአስተማሪው መላክ ይችላሉ።</p>
                                                </div>
                                            ) : (
                                                studentTickets.filter((t: any) => !activeCourse || t.courseId === activeCourse.id).map((ticket: any) => (
                                                    <div key={ticket.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                                <span className="text-xs font-bold text-dark dark:text-white">እርስዎ የጠየቁት ጥያቄ፦</span>
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ticket.status === 'replied' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                                {ticket.status === 'replied' ? '✓ መልስ ተሰጥቷል' : '⏳ በመጠባበቅ ላይ'}
                                                            </span>
                                                        </div>

                                                        {ticket.message && (
                                                            <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-slate-800/80 p-3 rounded-lg border border-gray-100 dark:border-slate-700 font-body">
                                                                {ticket.message}
                                                            </p>
                                                        )}

                                                        {ticket.attachment && (
                                                            <div className="mt-2">
                                                                {ticket.attachment.type === 'image' && (
                                                                    <img src={ticket.attachment.url} alt={ticket.attachment.name} className="max-w-[280px] max-h-[220px] rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-[1.02] transition" />
                                                                )}
                                                                {ticket.attachment.type === 'document' && (
                                                                    <a href={ticket.attachment.url} download={ticket.attachment.name} className="inline-flex items-center gap-2 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl border border-blue-200 dark:border-slate-700 text-xs font-bold hover:underline">
                                                                        <i className="fa-solid fa-file-pdf text-red-500 text-base"></i>
                                                                        <span>{ticket.attachment.name}</span>
                                                                    </a>
                                                                )}
                                                                {ticket.attachment.type === 'audio' && (
                                                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 inline-flex items-center gap-2">
                                                                        <i className="fa-solid fa-microphone text-amber-500 text-sm"></i>
                                                                        <audio controls src={ticket.attachment.url} className="h-8 max-w-[260px]"></audio>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {ticket.replies && ticket.replies.length > 0 ? (
                                                            <div className="mt-3 pl-3 border-l-2 border-primary space-y-2">
                                                                {ticket.replies.map((reply: any, rIdx: number) => (
                                                                    <div key={rIdx} className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-lg">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <i className="fa-solid fa-user-tie text-emerald-600 dark:text-emerald-400 text-xs"></i>
                                                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">የመምህሩ መልስ፦</span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 dark:text-slate-200 font-body leading-relaxed">
                                                                            {reply.message}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] text-gray-400 italic">መምህሩ ጥያቄዎን ተመልክተው በቅርቡ መልስ ይሰጡዎታል።</p>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
                                            {questionSentMessage && (
                                                <div className="mb-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-bounce">
                                                    <i className="fa-solid fa-circle-check"></i>
                                                    <span>{questionSentMessage}</span>
                                                </div>
                                            )}
                                            
                                            {qaAttachment && (
                                                <div className="mb-2 p-2 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between text-xs font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fa-solid ${qaAttachment.type === 'image' ? 'fa-image text-emerald-500' : qaAttachment.type === 'audio' ? 'fa-microphone text-amber-500' : 'fa-file-pdf text-red-500'}`}></i>
                                                        <span className="truncate max-w-[220px] text-dark dark:text-white">{qaAttachment.name}</span>
                                                    </div>
                                                    <button onClick={() => setQaAttachment(null)} className="text-gray-400 hover:text-red-500 p-1">
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowAttachmentMenu(prev => !prev)} 
                                                        className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-dark flex items-center justify-center font-bold text-lg transition"
                                                        title="ፋይል/ፎቶ/ድምፅ አያይዝ (Attach File)"
                                                    >
                                                        <i className="fa-solid fa-paperclip"></i>
                                                    </button>

                                                    {showAttachmentMenu && (
                                                        <div className="absolute bottom-12 left-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1 w-48 animate-in slide-in-from-bottom-2">
                                                            <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold text-dark dark:text-white">
                                                                <i className="fa-solid fa-image text-emerald-500 text-sm"></i> ፎቶ / ስክሪንሾት
                                                                <input type="file" accept="image/*" onChange={(e) => handleQaFileUpload(e, 'image')} className="hidden" />
                                                            </label>
                                                            <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-xs font-bold text-dark dark:text-white">
                                                                <i className="fa-solid fa-file-pdf text-red-500 text-sm"></i> ሰነድ / PDF / ፋይል
                                                                <input type="file" accept=".pdf,.doc,.docx,.txt,.zip" onChange={(e) => handleQaFileUpload(e, 'document')} className="hidden" />
                                                            </label>
                                                            {isRecordingVoice ? (
                                                                <button onClick={handleStopVoiceRecord} className="flex items-center gap-2.5 p-2 rounded-xl bg-red-500 text-white text-xs font-bold w-full">
                                                                    <i className="fa-solid fa-stop animate-pulse"></i> ቅዳ አቁም (Stop Voice)
                                                                </button>
                                                            ) : (
                                                                <button onClick={handleStartVoiceRecord} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-xs font-bold text-dark dark:text-white w-full">
                                                                    <i className="fa-solid fa-microphone text-amber-500 text-sm"></i> ድምፅ መቅጃ (Voice)
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <input 
                                                    type="text" 
                                                    value={questionInput}
                                                    onChange={e => setQuestionInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAskAdmin()}
                                                    placeholder="ለኮርሱ መምህር የሚያስተላልፉትን ጥያቄ እዚህ ይፃፉ..." 
                                                    className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-dark dark:text-white transition"
                                                />
                                                <button 
                                                    onClick={handleAskAdmin} 
                                                    className="px-5 h-10 bg-primary text-dark font-black rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition shadow-sm shrink-0 text-sm whitespace-nowrap"
                                                >
                                                    <i className="fa-solid fa-paper-plane"></i>
                                                    <span>ለአስተማሪ ላክ</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="p-4 sm:p-6">
                                    {!isCourseCompleted ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                                            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center text-2xl mb-4">
                                                <i className="fa-solid fa-lock"></i>
                                            </div>
                                            <h3 className="text-lg font-black text-dark dark:text-white mb-2 font-heading">ፈተናው አልተከፈተም (Quiz Locked)</h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">ፈተናውን ለመውሰድ በመጀመሪያ የኮርሱን ትምህርቶች በሙሉ አይተው ማጠናቀቅ አለብዎት።</p>
                                            <button onClick={() => setIsCourseCompleted(true)} className="text-xs bg-primary/20 hover:bg-primary text-dark dark:text-white dark:hover:text-dark px-4 py-2 rounded-xl font-bold transition">
                                                (Demo) ፈተናውን ክፈት (Unlock Quiz)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-[460px] bg-gray-50 dark:bg-slate-900/80 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden relative shadow-sm">
                                            <div className="bg-gradient-to-r from-amber-500 via-primary to-yellow-400 text-dark p-4 font-bold flex items-center justify-between shadow-sm z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-dark/10 flex items-center justify-center text-dark text-lg">
                                                        <i className="fa-solid fa-robot"></i>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-heading font-black text-sm text-dark">Tsehay AI - የኮርስ ፈተና</h3>
                                                        <p className="text-[11px] text-dark/80 font-medium">{activeCourse?.title || 'Tsehay Campus Course'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] bg-dark text-white font-black px-3 py-1 rounded-full shadow-xs">
                                                    🎯 ፈተና
                                                </span>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                                                {/* Welcome celebration banner */}
                                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                                        <i className="fa-solid fa-graduation-cap"></i>
                                                    </div>
                                                    <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                                                        <p className="font-bold mb-0.5">🎉 እንኳን ደስ አሎት! ሁሉንም ትምህርቶች አጠናቀዋል።</p>
                                                        የኮርሱን ማጠቃለያ ጥያቄዎች ይመልሱ። ፈተናውን እንደጨረሱ በስምዎ የተዘጋጀ ዲጂታል ሰርተፍኬት ያገኛሉ!
                                                    </div>
                                                </div>

                                                {quizMessages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-secondary text-white rounded-tr-xs shadow-sm' : 'bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-tl-xs shadow-sm'}`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                ))}

                                                {quizMessages.length <= 1 && (
                                                    <div className="pt-2 flex flex-wrap gap-2">
                                                        <button 
                                                            onClick={() => handleQuizSubmit('ፈተናውን ለመጀመር ዝግጁ ነኝ፣ የመጀመሪያውን ጥያቄ ጠይቀኝ።')}
                                                            className="bg-primary text-dark text-xs font-black px-4 py-2.5 rounded-xl hover:bg-yellow-400 transition shadow-sm flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95"
                                                        >
                                                            <span>🚀 ፈተናውን ጀምር (Start Exam)</span>
                                                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                )}

                                                {isQuizLoading && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-tl-xs p-4 shadow-sm flex gap-2 items-center">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={quizInput}
                                                    onChange={e => setQuizInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleQuizSubmit()}
                                                    placeholder="መልስዎን እዚህ ይፃፉ..." 
                                                    className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-dark dark:text-white transition"
                                                />
                                                <button onClick={() => handleQuizSubmit()} className="h-10 px-5 bg-primary text-dark rounded-xl flex items-center justify-center gap-2 font-black hover:bg-yellow-400 transition shadow-sm shrink-0 text-sm cursor-pointer active:scale-95">
                                                    <i className="fa-solid fa-paper-plane"></i>
                                                    <span className="hidden sm:inline">ላክ</span>
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

                {/* Right Side: Curriculum/Course Content (Desktop Only, Mobile uses Syllabus tab) */}
                <div className="hidden lg:block lg:col-span-1 xl:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full lg:h-[calc(100vh-160px)] lg:sticky lg:top-4 overflow-hidden transition-colors duration-300">
                        
                        <div className="p-5 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shadow-sm">
                            <h3 className="font-heading font-black text-lg text-dark dark:text-white">የኮርስ ይዘት (Course Content)</h3>
                            {(() => {
                                let totalCount = 0;
                                modules.forEach((m: any) => { totalCount += (m.lessons || []).length; });
                                if (totalCount === 0) totalCount = 1;
                                
                                const percent = Math.min(100, Math.round((progress.length / totalCount) * 100));

                                return (
                                    <>
                                        <div className="flex justify-between items-end mt-3 mb-1">
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">የኮርሱ ሂደት</p>
                                            <p className="text-sm text-secondary dark:text-primary font-black">{percent}%</p>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-gradient-to-r from-amber-400 to-emerald-500 h-2.5 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {modules.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm font-bold">
                                    ምንም ትምህርት አልተገኘም
                                </div>
                            ) : (
                                (() => {
                                    const allFlatLessons: any[] = [];
                                    modules.forEach((m: any) => {
                                        (m.lessons || []).forEach((l: any) => allFlatLessons.push(l));
                                    });

                                    let currentGlobalIdx = 0;

                                    return modules.map((mod: any, idx: number) => (
                                        <div key={mod.id || idx} className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 p-4">
                                            <h4 className="font-bold text-sm text-dark dark:text-white">ክፍል {idx + 1}: {mod.title}</h4>
                                            <div className="mt-3 space-y-2">
                                                {(mod.lessons || []).map((lesson: any, lidx: number) => {
                                                    const globalIdx = currentGlobalIdx++;
                                                    const isActive = activeLesson?.title === lesson.title;
                                                    const isCompleted = progress.includes(lesson.title);
                                                    
                                                    const prevLessonTitle = globalIdx > 0 ? allFlatLessons[globalIdx - 1]?.title : null;
                                                    const isUnlocked = isCourseCompleted || globalIdx === 0 || (prevLessonTitle ? progress.includes(prevLessonTitle) : true);

                                                    return (
                                                    <div 
                                                        key={lidx} 
                                                        onClick={() => {
                                                            if (!isUnlocked) {
                                                                alert("🔒 ይህ ትምህርት አልተከፈተም! እባክዎ መጀመሪያ የቀደመውን ትምህርት አይተው ያጠናቁ።");
                                                                return;
                                                            }
                                                            const selectedLesson = {...lesson, moduleIndex: idx, lessonIndex: lidx};
                                                            setActiveLesson(selectedLesson);
                                                            try {
                                                              localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(selectedLesson));
                                                            } catch(e) {}
                                                        }}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                                                            !isUnlocked
                                                                ? 'opacity-60 cursor-not-allowed bg-gray-100/40 dark:bg-slate-900/20'
                                                                : isActive 
                                                                    ? 'bg-white dark:bg-slate-700 border-l-4 border-primary shadow-sm cursor-pointer' 
                                                                    : 'hover:bg-white dark:hover:bg-slate-700/80 bg-gray-100/50 dark:bg-slate-900/40 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                                            {isActive ? (
                                                                <i className="fa-solid fa-circle-play text-primary text-sm animate-pulse shrink-0"></i>
                                                            ) : isCompleted ? (
                                                                <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0"></i>
                                                            ) : !isUnlocked ? (
                                                                <i className="fa-solid fa-lock text-gray-400 dark:text-gray-500 text-xs shrink-0"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-circle-play text-gray-400 text-xs shrink-0"></i>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : !isUnlocked ? 'text-gray-400 dark:text-gray-500' : 'text-dark dark:text-white'}`}>
                                                                    {lesson.title}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                                                    <span><i className="fa-solid fa-video"></i> {lesson.duration || '00:00'}</span>
                                                                    <span className="text-primary font-bold">+{lesson.points || 25} ነጥብ</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isCompleted ? (
                                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-1">
                                                                <i className="fa-solid fa-check"></i> ተጠናቋል
                                                            </span>
                                                        ) : isActive ? (
                                                            <span className="text-[10px] bg-primary/20 text-dark dark:text-primary px-2 py-0.5 rounded-md font-bold shrink-0 animate-pulse">
                                                                እየታየ ነው
                                                            </span>
                                                        ) : !isUnlocked ? (
                                                            <span className="text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md font-bold shrink-0 flex items-center gap-1">
                                                                <i className="fa-solid fa-lock text-[9px]"></i> ተቆልፏል
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()
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
              <h2 className="text-2xl font-bold text-dark dark:text-white font-heading">የእኔ ኮርሶች (My Courses)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <h2 className="text-xl font-bold text-slate-500">ምንም የተገዛ ኮርስ የለም</h2>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <img src={formatDriveImageUrl(course.thumbnail || course.image) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} className="w-full h-48 object-cover rounded-2xl mb-4" />
                    <h3 className="font-bold text-lg mb-3 line-clamp-2 text-dark dark:text-white font-heading">{course.title}</h3>
                    <button onClick={() => { 
                      setActiveCourse(course); 
                      try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(course)); } catch(e) {}
                      setCurrentView('classroom'); 
                    }} className="w-full py-2.5 bg-primary text-dark font-black rounded-xl hover:bg-yellow-400 transition shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2">
                      <i className="fa-solid fa-play"></i>
                      <span>ወደ ትምህርቱ</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentView === 'messages' && (
          <div className="max-w-4xl mx-auto py-6 space-y-6">
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                 <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 mb-6">
                     <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-2xl bg-secondary/10 dark:bg-primary/20 text-secondary dark:text-primary flex items-center justify-center text-xl">
                             <i className="fa-solid fa-comments"></i>
                         </div>
                         <div>
                             <h2 className="text-xl font-black font-heading text-dark dark:text-white">መልዕክቶች (Instructor Direct Messages)</h2>
                             <p className="text-xs text-gray-500">ከኮርስ አስተማሪዎች ጋር የሚላላኩት ቀጥታ መልዕክቶች እና የተሰጡ ምላሾች</p>
                         </div>
                     </div>
                     <button onClick={() => setCurrentView('classroom')} className="text-xs bg-primary text-dark font-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition shadow-xs cursor-pointer">
                         <i className="fa-solid fa-plus mr-1"></i> አዲስ ጥያቄ ጠይቅ
                     </button>
                 </div>

                 <div className="space-y-4">
                     {studentTickets.length === 0 ? (
                         <div className="text-center py-16 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                             <i className="fa-solid fa-envelope-open-text text-5xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
                             <h3 className="text-base font-bold text-dark dark:text-white mb-1">ምንም የተላከ መልዕክት የለም</h3>
                             <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">በመማሪያ ክፍሉ (Classroom) ሆነው ለኮርሱ አስተማሪ የላኳቸው ጥያቄዎች እና የተሰጡ ምላሾች እዚህ ይገኛሉ።</p>
                             <button onClick={() => setCurrentView('classroom')} className="bg-primary text-dark font-black px-5 py-2.5 rounded-xl hover:bg-yellow-400 text-xs transition">
                                 ወደ የመማሪያ ክፍል ሂድ
                             </button>
                         </div>
                     ) : (
                         studentTickets.map(ticket => (
                             <div key={ticket.id} className="p-5 border border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-900/50 shadow-xs space-y-3">
                                 <div className="flex justify-between items-start">
                                     <div>
                                         <span className="text-[11px] font-bold bg-primary/20 text-dark dark:text-primary px-3 py-1 rounded-full">
                                             📚 {ticket.courseName || 'General Course'}
                                         </span>
                                         <p className="text-[10px] text-gray-400 mt-1">{ticket.createdAt ? new Date(ticket.createdAt.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt).toLocaleString() : ''}</p>
                                     </div>
                                     <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${ticket.status === 'replied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                         {ticket.status === 'replied' ? '✓ መልስ ተሰጥቷል (Replied)' : '⏳ በመጠባበቅ ላይ (Pending)'}
                                     </span>
                                 </div>

                                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                      <span className="text-xs font-bold text-gray-400 block mb-1">የተላከው ጥያቄ፦</span>
                                      <p className="text-sm font-body text-dark dark:text-white whitespace-pre-wrap">{ticket.message}</p>
                                  </div>

                                  {ticket.replies && ticket.replies.length > 0 && (
                                      <div className="pl-4 border-l-3 border-emerald-500 space-y-2 mt-3">
                                          {ticket.replies.map((reply: any, rIdx: number) => (
                                              <div key={rIdx} className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                                                  <div className="flex items-center gap-2 mb-1.5">
                                                      <i className="fa-solid fa-user-tie text-emerald-600 dark:text-emerald-400"></i>
                                                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">የአስተማሪው/Admin መልስ፦</span>
                                                  </div>
                                                  <p className="text-sm font-body text-slate-800 dark:text-slate-200 leading-relaxed">{reply.message}</p>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
        )}

        {currentView === 'ai' && (
          <div className="max-w-4xl mx-auto py-4 space-y-4">
             <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-md border border-slate-200 dark:border-slate-700 flex flex-col h-[calc(100vh-180px)] min-h-[500px] overflow-hidden">
                 {/* Human AI Assistant Header */}
                 <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 mb-4">
                     <div className="flex items-center gap-3.5">
                         <div className="relative">
                           <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-dark flex items-center justify-center text-2xl shadow-lg border-2 border-white dark:border-slate-700 animate-pulse-glow">
                               <i className="fa-solid fa-user-astronaut text-xl text-dark"></i>
                           </div>
                           <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                         </div>
                         <div>
                             <div className="flex items-center gap-2">
                               <h2 className="text-xl font-black font-heading text-dark dark:text-white">Tsehay AI Assistant</h2>
                               <span className="bg-primary/20 text-amber-800 dark:text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full border border-primary/30">
                                 👋 ምን ላግዛችሁ?
                               </span>
                             </div>
                             <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-0.5">ትምህርታዊ ጥያቄዎችዎን በፍጥነት የሚመልስ የእርስዎ AI ረዳት</p>
                         </div>
                     </div>
                     <button onClick={handleClearAiChat} className="text-xs bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition shrink-0 cursor-pointer">
                         <i className="fa-solid fa-trash mr-1"></i> ታሪክ አፅዳ
                     </button>
                 </div>

                 {/* Chat Body */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                     {chatMessages.map((m: any, i: number) => (
                         <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                             <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-secondary text-white rounded-br-none' : 'bg-white dark:bg-slate-700 dark:text-white text-dark shadow-sm rounded-bl-none border border-gray-100 dark:border-slate-600'}`}>
                                 {m.text}
                             </div>
                             {m.role !== 'user' && i > 0 && (
                                 <div className="flex items-center gap-2 mt-2 flex-wrap">
                                     <button 
                                         onClick={() => {
                                             handleSaveNote(m.text);
                                             setSavedAiNotes(prev => ({ ...prev, [i]: true }));
                                         }} 
                                         className={`text-[11px] font-black px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                             savedAiNotes[i]
                                                 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                 : 'bg-amber-400/20 hover:bg-amber-400 dark:bg-amber-500/20 dark:hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-dark border-amber-400/40'
                                         }`}
                                     >
                                         <i className={`fa-solid ${savedAiNotes[i] ? 'fa-circle-check text-emerald-600 dark:text-emerald-400' : 'fa-bookmark text-[10px]'}`}></i> 
                                         <span>{savedAiNotes[i] ? '✓ ወደ ማስታወሻ ተመዝግቧል' : 'ወደ ማስታወሻ አድ አድርግ'}</span>
                                     </button>
                                     {savedAiNotes[i] && (
                                         <button
                                             onClick={() => {
                                                 setCurrentView('classroom');
                                                 setActiveTab('notes');
                                             }}
                                             className="text-[11px] font-bold text-secondary dark:text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
                                         >
                                             <span>ማስታወሻዎችን እይ</span>
                                             <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                         </button>
                                     )}
                                 </div>
                             )}
                         </div>
                     ))}
                     {isChatLoading && (
                         <div className="flex justify-start">
                             <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-4 shadow-sm flex gap-2 items-center">
                                 <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{animationDelay: '0.4s'}}></div>
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Input Bar */}
                 <form onSubmit={handleSendAiMessage} className="mt-4 flex gap-2">
                     <input 
                         type="text" 
                         value={chatInput}
                         onChange={e => setChatInput(e.target.value)}
                         placeholder="ለ Tsehay AI ጥያቄዎን እዚህ ይጻፉ..." 
                         className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary text-dark dark:text-white transition"
                     />
                     <button type="submit" className="px-6 bg-primary text-dark font-black rounded-xl hover:bg-yellow-400 transition shadow-sm flex items-center gap-2">
                         <i className="fa-solid fa-paper-plane"></i>
                         <span>ላክ</span>
                     </button>
                 </form>
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
      <CourseRatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        courseId={activeCourse?.id || ''}
        courseTitle={activeCourse?.title || ''}
        user={user}
        onRatingSubmitted={() => {
          if (activeCourse?.id) {
            setRatedCourses(prev => ({ ...prev, [activeCourse.id]: true }));
            try { localStorage.setItem(`rated_course_${activeCourse.id}`, 'true'); } catch (e) {}
          }
        }}
      />

      {/* In-Lesson Contextual AI Tutor Modal */}
      {showLessonAiModal && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 text-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                  {/* Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-lg font-black shadow-md">
                              <i className="fa-solid fa-robot"></i>
                          </div>
                          <div>
                              <h4 className="font-black text-sm sm:text-base">ስለዚህ ትምህርት AIን ይጠይቁ</h4>
                              <p className="text-[11px] text-amber-400 font-bold truncate max-w-xs sm:max-w-sm">
                                  {activeLesson?.title || activeCourse?.title}
                              </p>
                          </div>
                      </div>
                      <button
                          onClick={() => setShowLessonAiModal(false)}
                          className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-slate-800 text-lg transition cursor-pointer"
                      >
                          ✕
                      </button>
                  </div>

                  {/* Chat Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[400px]">
                      {lessonAiMessages.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 space-y-3">
                              <i className="fa-solid fa-wand-magic-sparkles text-3xl text-amber-400 animate-pulse"></i>
                              <p className="text-xs sm:text-sm font-bold">ስለዚህ ሌሰን ያልገባዎትን ነገር ወይም ጥያቄ ይጠይቁኝ!</p>
                              <div className="flex flex-wrap gap-2 justify-center pt-2">
                                  <button
                                      onClick={() => handleAskLessonAi(`ይህንን ትምህርት ("${activeLesson?.title}") በምሳሌ በአጭሩ አስረዳኝ።`)}
                                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-full transition cursor-pointer"
                                  >
                                      💡 በምሳሌ አስረዳኝ
                                  </button>
                                  <button
                                      onClick={() => handleAskLessonAi(`በዚህ ሌሰን ላይ የተማርነውን በገቢ ለመቀየር ምን ምን እርምጃዎችን መውሰድ አለብኝ?`)}
                                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-full transition cursor-pointer"
                                  >
                                      🚀 ተግባራዊ እርምጃዎች
                                  </button>
                              </div>
                          </div>
                      ) : (
                          lessonAiMessages.map((msg, idx) => (
                              <div
                                  key={idx}
                                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                  <div
                                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                          msg.role === 'user'
                                              ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none'
                                              : 'bg-slate-800 text-gray-100 border border-slate-700 rounded-tl-none font-body whitespace-pre-wrap'
                                      }`}
                                  >
                                      {msg.text}
                                  </div>
                              </div>
                          ))
                      )}
                      {isLessonAiLoading && (
                          <div className="flex justify-start">
                              <div className="bg-slate-800 text-amber-400 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 border border-slate-700">
                                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Tsehay AI እያሰላሰለ ነው...</span>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Input Bar */}
                  <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                      <input
                          type="text"
                          value={lessonAiQuery}
                          onChange={(e) => setLessonAiQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAskLessonAi(); }}
                          placeholder="ጥያቄዎን እዚህ ይፃፉ..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-amber-400"
                      />
                      <button
                          onClick={() => handleAskLessonAi()}
                          disabled={isLessonAiLoading || !lessonAiQuery.trim()}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                          <span>ላክ</span>
                          <i className="fa-solid fa-paper-plane text-xs"></i>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
