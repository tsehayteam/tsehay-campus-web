'use client';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { db, auth } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, setDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';

const ReactPlayer: any = dynamic(() => import('react-player'), { ssr: false });

import CourseRatingModal from '@/components/CourseRatingModal';
import CourseQuiz from '@/components/CourseQuiz';
import CourseCertificate from '@/components/CourseCertificate';
import { formatDriveImageUrl } from '@/lib/courseCache';
import FormattedAiText from '@/components/FormattedAiText';
import StudentReferralSection from '@/components/StudentReferralSection';

function DashboardLoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#030509] flex flex-col items-center justify-center relative overflow-hidden text-white font-body select-none">
      <div className="w-96 h-96 bg-[#f9b03c]/10 rounded-full blur-3xl absolute -top-10 -left-10 pointer-events-none animate-pulse"></div>
      <div className="w-96 h-96 bg-[#3268ba]/10 rounded-full blur-3xl absolute -bottom-10 -right-10 pointer-events-none animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-[0_0_40px_rgba(249,176,60,0.35)] border-2 border-[#f9b03c]/60 animate-bounce">
          <img src="/tc-logo.jpg" alt="Tsehay Campus" className="w-full h-full object-contain rounded-xl" />
        </div>

        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-3 border-[#f9b03c]/20 border-t-[#f9b03c] rounded-full animate-spin"></div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-white font-heading tracking-wide">
            <span className="text-[#f9b03c]">Tsehay</span> <span className="text-[#3268ba]">Campus</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium">
            {message || 'የመማሪያ ክፍልዎን በማዘጋጀት ላይ... (Loading Classroom...)'}
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentDashboardContent() {
  const { user, loading: authLoading, authInitialized } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read URL search params
  const urlViewParam = searchParams?.get('view') || searchParams?.get('tab');
  const urlCourseId = searchParams?.get('courseId') || searchParams?.get('course');
  const urlLesson = searchParams?.get('lesson');

  const validViews = ['classroom', 'courses', 'referrals', 'messages', 'ai', 'certificates', 'settings'];
  const initialView = (urlViewParam && validViews.includes(urlViewParam))
    ? urlViewParam
    : (typeof window !== 'undefined' && localStorage.getItem('tsehay_dashboard_last_view')) || 'classroom';

  const [currentView, _setCurrentView] = useState<string>(initialView);

  // Synchronize state if URL view param changes
  useEffect(() => {
    if (urlViewParam && validViews.includes(urlViewParam) && urlViewParam !== currentView) {
      _setCurrentView(urlViewParam);
    }
  }, [urlViewParam]);

  // URL state synchronizer helper
  const updateUrlState = (params: { view?: string; courseId?: string; lesson?: string | number }) => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.delete('success');
      sp.delete('reference');
      sp.delete('tx_ref');

      if (params.view) {
        sp.set('view', params.view);
        try { localStorage.setItem('tsehay_dashboard_last_view', params.view); } catch(e) {}
      }
      if (params.courseId !== undefined) {
        if (params.courseId) sp.set('courseId', params.courseId);
        else sp.delete('courseId');
      }
      if (params.lesson !== undefined) {
        if (params.lesson !== null && params.lesson !== '') sp.set('lesson', String(params.lesson));
        else sp.delete('lesson');
      }

      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    } catch(e) {}
  };

  const setCurrentView = (newView: string) => {
    _setCurrentView(newView);
    if (newView === 'classroom') {
      updateUrlState({ 
        view: 'classroom', 
        courseId: activeCourse?.id || '', 
        lesson: activeLesson?.lessonIndex ?? 0 
      });
    } else {
      updateUrlState({ view: newView });
    }
  };

  // Auth Guard: Only redirect if explicitly confirmed NOT authenticated after Firebase check completes
  useEffect(() => {
    if (authInitialized && !authLoading && !user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace('/');
      }
    }
  }, [authInitialized, authLoading, user, router]);

  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [hasTakenQuiz, setHasTakenQuiz] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratedCourses, setRatedCourses] = useState<Record<string, boolean>>({});
  const [dismissedRatingOverlay, setDismissedRatingOverlay] = useState<Record<string, boolean>>({});
  
  // Quiz & Certificate State
  const [passedQuizzes, setPassedQuizzes] = useState<Record<string, { score: number; passedAt: string }>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const cached = localStorage.getItem('tsehay_passed_quizzes');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });
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
  const [progress, setProgress] = useState<any[]>([]);
  // Settings State
  const [settingsName, setSettingsName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const cached = localStorage.getItem('tsehay_auth_user_cache');
      return cached ? JSON.parse(cached)?.displayName || '' : '';
    } catch (e) { return ''; }
  });
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const cached = localStorage.getItem('tsehay_auth_user_cache');
      return cached ? JSON.parse(cached)?.photoURL || '' : '';
    } catch (e) { return ''; }
  });
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [settingsEmail, setSettingsEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordResetMessage, setPasswordResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const AVATAR_PRESETS = [
    { id: 'av-1', label: 'ተማሪ 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-2', label: 'ተማሪ 2', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-3', label: 'ፕሮፌሽናል 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-4', label: 'ፕሮፌሽናል 2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-5', label: 'ፈጣሪ', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-6', label: 'ቢዝነስ', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80' },
    { id: 'av-7', label: '3D ሮቦት', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=f9b03c' },
    { id: 'av-8', label: '3D አቫታር', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=c0aede' },
  ];
  
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
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'ai', text: "ሰላም! እኔ Tsehay AI ነኝ። የትምህርት ጥያቄዎች ካሉዎት እባክዎ ይጠይቁኝ!" }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedAiCourse, setSelectedAiCourse] = useState<any>(null);
  const [dashboardAiLang, setDashboardAiLang] = useState<'am' | 'en'>('am');
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [aiAttachedImage, setAiAttachedImage] = useState<string | null>(null);
  const [isAiVoiceRecording, setIsAiVoiceRecording] = useState(false);
  const [aiRecordingSeconds, setAiRecordingSeconds] = useState(0);
  const [showDashboardClearAiModal, setShowDashboardClearAiModal] = useState(false);
  const [isNavDrawerExpanded, setIsNavDrawerExpanded] = useState(false);
  const [isSyllabusCollapsed, setIsSyllabusCollapsed] = useState(false);
  
  // 🗑️ Tsehay AI 15-Day Recycle Bin State
  const [showAiTrashModal, setShowAiTrashModal] = useState(false);
  const [aiTrashList, setAiTrashList] = useState<Array<{
    id: string;
    deletedAt: string;
    expiresAt: string;
    courseTitle?: string;
    preview: string;
    messages: any[];
  }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('tsehay_ai_chat_trash');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          return parsed.filter(item => new Date(item.expiresAt).getTime() > now);
        }
      }
    } catch (e) {}
    return [];
  });

  // Automatically sync selectedAiCourse when activeCourse changes
  useEffect(() => {
    if (activeCourse && !selectedAiCourse) {
      setSelectedAiCourse(activeCourse);
    }
  }, [activeCourse]);

  const [savedAiNotes, setSavedAiNotes] = useState<{ [msgIdx: number]: boolean }>({});
  const [savedAiNoteIds, setSavedAiNoteIds] = useState<{ [msgIdx: number]: string }>({});
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const aiRecognitionRef = useRef<any>(null);
  const aiTimerRef = useRef<any>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const [currentVideoPlayedFraction, setCurrentVideoPlayedFraction] = useState(0);

  // Enterprise Classroom States
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [resumeToast, setResumeToast] = useState<{ seconds: number; timeStr: string } | null>(null);
  const [lessonSummary, setLessonSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showLessonAiModal, setShowLessonAiModal] = useState(false);
  const [lessonAiQuery, setLessonAiQuery] = useState('');
  const [lessonAiMessages, setLessonAiMessages] = useState<Array<{ role: 'user' | 'ai'; text: string; image?: string }>>([]);
  const [isLessonAiLoading, setIsLessonAiLoading] = useState(false);
  const [lessonAiAttachedImage, setLessonAiAttachedImage] = useState<string | null>(null);
  const [isLessonVoiceRecording, setIsLessonVoiceRecording] = useState(false);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  const lessonVoiceRecRef = useRef<any>(null);

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

  const startLessonVoiceRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("ይቅርታ፣ የእርስዎ ብሮውዘር Voice Recognition አይደግፍም።");
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = "am-ET";
      rec.continuous = true;
      rec.interimResults = true;

      let baseText = "";
      setLessonAiQuery(prev => {
        baseText = prev || "";
        return prev;
      });

      rec.onstart = () => setIsLessonVoiceRecording(true);
      rec.onresult = (e: any) => {
        let fullText = "";
        for (let i = 0; i < e.results.length; i++) {
          fullText += e.results[i][0].transcript;
        }
        fullText = fullText.trim();
        if (fullText) {
          setLessonAiQuery(baseText ? `${baseText} ${fullText}` : fullText);
        }
      };
      rec.onerror = () => setIsLessonVoiceRecording(false);
      rec.onend = () => setIsLessonVoiceRecording(false);
      rec.start();
      lessonVoiceRecRef.current = rec;
    } catch (e) {
      setIsLessonVoiceRecording(false);
    }
  };

  const stopLessonVoiceRecording = () => {
    if (lessonVoiceRecRef.current) {
      try { lessonVoiceRecRef.current.stop(); } catch (e) {}
      lessonVoiceRecRef.current = null;
    }
    setIsLessonVoiceRecording(false);
  };

  const handleLessonImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('እባክዎ ትክክለኛ የፎቶ ፋይል ይምረጡ።');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLessonAiAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAskLessonAi = async (customPrompt?: string) => {
    const queryText = (customPrompt || lessonAiQuery).trim();
    const imageToSend = lessonAiAttachedImage;
    if ((!queryText && !imageToSend) || isLessonAiLoading) return;

    const userMsg = { role: 'user' as const, text: queryText || "📸 ፎቶ ተያይዟል", image: imageToSend || undefined };
    setLessonAiMessages(prev => [...prev, userMsg]);
    setLessonAiQuery('');
    setLessonAiAttachedImage(null);
    setIsLessonAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          image: imageToSend,
          courseContext: {
            courseTitle: activeCourse?.title,
            courseId: activeCourse?.id,
            category: activeCourse?.category,
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

  // Student Display Name and Photo Computed Helpers
  const studentDisplayName = settingsName?.trim() || user?.displayName || (user?.email ? user.email.split('@')[0] : '') || 'ተማሪ (Student)';
  const studentPhotoUrl = settingsPhotoUrl || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentDisplayName)}&background=f9b03c&color=111827&bold=true`;

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'እባክዎ ትክክለኛ የምስል/ፎቶ ፋይል ይምረጡ (Please select a valid image file)' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSettingsPhotoUrl(dataUrl);
          setProfileMessage({ type: 'success', text: 'ፎቶው ተመርጧል! ለውጡን ለማስቀመጥ "አዘምን (Save Changes)" የሚለውን ይጫኑ።' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Dedicated User Profile Fetcher (Runs for all users regardless of purchased courses)
  useEffect(() => {
    if (!user) return;
    
    if (user.displayName && !settingsName) setSettingsName(user.displayName);
    if (user.photoURL && !settingsPhotoUrl) setSettingsPhotoUrl(user.photoURL);
    if (user.email && !settingsEmail) setSettingsEmail(user.email);

    const fetchUserProfile = async () => {
      try {
        const profileRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          if (data.name || data.displayName) setSettingsName(data.name || data.displayName);
          if (data.photoURL || data.photoUrl || data.avatar) setSettingsPhotoUrl(data.photoURL || data.photoUrl || data.avatar);
          if (data.phone) setSettingsPhone(data.phone);
          if (data.city) setSettingsCity(data.city);
        } else {
          const userDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            if (uData.name || uData.displayName) setSettingsName(uData.name || uData.displayName);
            if (uData.photoURL || uData.photoUrl || uData.avatar) setSettingsPhotoUrl(uData.photoURL || uData.photoUrl || uData.avatar);
            if (uData.phone) setSettingsPhone(uData.phone);
            if (uData.city) setSettingsCity(uData.city);
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
  }, [user]);

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
        let userCourses: any[] = [];
        
        if (!purchasesSnap.empty) {
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
          userCourses = allCourses;
        }

        // Resilient fallback for URL courseId or newly enrolled free course
        if (urlCourseId && !userCourses.some((c: any) => c.id === urlCourseId)) {
          try {
            const directSnap = await getDoc(doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'public', 'data', 'courses', urlCourseId));
            if (directSnap.exists()) {
              userCourses = [{ id: directSnap.id, ...directSnap.data() }, ...userCourses];
            } else {
              const cachedActive = localStorage.getItem('tsehay_user_active_course');
              if (cachedActive) {
                const parsed = JSON.parse(cachedActive);
                if (parsed.id === urlCourseId) {
                  userCourses = [parsed, ...userCourses];
                }
              }
            }
          } catch(e) {}
        }

        setCourses(userCourses);
        try {
          localStorage.setItem('tsehay_user_courses_cache', JSON.stringify(userCourses));
        } catch(e) {}
          
        if (userCourses.length > 0) {
          setActiveCourse((prev: any) => {
            // 1. Priority: URL courseId parameter
            if (urlCourseId) {
              const matchedFromUrl = userCourses.find((c: any) => c.id === urlCourseId);
              if (matchedFromUrl) {
                try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(matchedFromUrl)); } catch(e) {}
                return matchedFromUrl;
              }
            }
            // 2. Priority: previously selected active course
            if (prev && userCourses.some((c: any) => c.id === prev.id)) {
              const updated = userCourses.find((c: any) => c.id === prev.id) || prev;
              try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(updated)); } catch(e) {}
              return updated;
            }
            // 3. Fallback: first course
            try { localStorage.setItem('tsehay_user_active_course', JSON.stringify(userCourses[0])); } catch(e) {}
            return userCourses[0];
          });
        } else {
          setActiveCourse(null);
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

            // Retain active lesson if matching URL or existing state, otherwise default to first
            if (fetchedModules.length > 0) {
              setActiveLesson((prev: any) => {
                // 1. Priority: URL lesson parameter
                if (urlLesson !== null && urlLesson !== undefined && urlLesson !== '') {
                  const lessonNum = parseInt(urlLesson, 10);
                  if (!isNaN(lessonNum)) {
                    let totalCount = 0;
                    for (let mIdx = 0; mIdx < fetchedModules.length; mIdx++) {
                      const mod = fetchedModules[mIdx];
                      if (mod.lessons) {
                        for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                          if (totalCount === lessonNum || lIdx === lessonNum) {
                            const found = { ...mod.lessons[lIdx], moduleIndex: mIdx, lessonIndex: lIdx };
                            try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(found)); } catch(e) {}
                            return found;
                          }
                          totalCount++;
                        }
                      }
                    }
                  } else {
                    for (let mIdx = 0; mIdx < fetchedModules.length; mIdx++) {
                      const mod = fetchedModules[mIdx];
                      if (mod.lessons) {
                        const foundIdx = mod.lessons.findIndex((l: any) => l.id === urlLesson || l.title === urlLesson);
                        if (foundIdx !== -1) {
                          const found = { ...mod.lessons[foundIdx], moduleIndex: mIdx, lessonIndex: foundIdx };
                          try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(found)); } catch(e) {}
                          return found;
                        }
                      }
                    }
                  }
                }

                // 2. Priority: previous active lesson
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

                // 3. Fallback: first lesson
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

    return newNote.id;
  };

  const handleViewSavedNote = (noteId?: string) => {
    setCurrentView('classroom');
    setActiveTab('notes');
    if (noteId) {
      setHighlightedNoteId(noteId);
      setTimeout(() => {
        const el = document.getElementById(`student-note-${noteId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      setTimeout(() => {
        setHighlightedNoteId(null);
      }, 7000);
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

  const handleGoToQa = () => {
    setCurrentView('classroom');
    setActiveTab('qa');
    setTimeout(() => {
      const qaInput = document.getElementById('classroom-qa-input');
      if (qaInput) {
        qaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        qaInput.focus();
      }
    }, 150);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    setTimeout(() => {
      setShowNotifications(false);
    }, 400);
  };


  // Persistent Tsehay AI Chat Sync & 15-Day Trash Auto-Purge across sessions & devices
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    // 1. Load cached chat from localStorage immediately
    try {
      const saved = localStorage.getItem(`tsehay-ai-chat_${user.uid}`) || localStorage.getItem('tsehay-ai-chat');
      if (saved && isMounted) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
        }
      }
    } catch (e) {}

    // 2. Load cached trash from localStorage & auto-purge expired (> 15 days)
    try {
      const savedTrash = localStorage.getItem(`tsehay_ai_chat_trash_${user.uid}`) || localStorage.getItem('tsehay_ai_chat_trash');
      if (savedTrash && isMounted) {
        const parsedTrash = JSON.parse(savedTrash);
        if (Array.isArray(parsedTrash)) {
          const now = Date.now();
          const clean = parsedTrash.filter((item: any) => new Date(item.expiresAt).getTime() > now);
          setAiTrashList(clean);
        }
      }
    } catch (e) {}

    // 3. Load permanent chat and trash from Firestore
    const fetchChatAndTrashHistory = async () => {
      try {
        // Chat History
        const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
        const snap = await getDoc(chatHistoryRef);
        if (isMounted && snap.exists() && Array.isArray(snap.data().messages) && snap.data().messages.length > 0) {
          setChatMessages(snap.data().messages);
          try { localStorage.setItem(`tsehay-ai-chat_${user.uid}`, JSON.stringify(snap.data().messages)); } catch (e) {}
        }

        // Trash History with 15-day Auto-Purge
        const trashDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'trash');
        const trashSnap = await getDoc(trashDocRef);
        if (isMounted && trashSnap.exists() && Array.isArray(trashSnap.data().items)) {
          const now = Date.now();
          const validItems = trashSnap.data().items.filter((item: any) => new Date(item.expiresAt).getTime() > now);
          setAiTrashList(validItems);
          try {
            localStorage.setItem(`tsehay_ai_chat_trash_${user.uid}`, JSON.stringify(validItems));
            localStorage.setItem('tsehay_ai_chat_trash', JSON.stringify(validItems));
          } catch (e) {}

          // If expired items were removed, sync back to Firestore
          if (validItems.length !== trashSnap.data().items.length) {
            setDoc(trashDocRef, { items: validItems, updatedAt: serverTimestamp() }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Could not load AI chat history or trash from Firestore:", err);
      }
    };
    fetchChatAndTrashHistory();

    return () => { isMounted = false; };
  }, [user]);

  const aiVoiceTranscriptRef = useRef<string>('');
  const aiMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const aiAudioChunksRef = useRef<Blob[]>([]);

  const startAiVoiceRecording = async () => {
    if (typeof window === "undefined") return;

    try {
      // 1. Capture microphone stream for direct multimodal audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aiAudioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
          else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
          else mimeType = '';
        }
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          aiAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsAiVoiceRecording(true);
        setAiRecordingSeconds(0);
        if (aiTimerRef.current) clearInterval(aiTimerRef.current);
        aiTimerRef.current = setInterval(() => {
          setAiRecordingSeconds(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.start(250);
      aiMediaRecorderRef.current = mediaRecorder;

      // Also trigger SpeechRecognition if available for live visual preview
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = "am-ET";
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let fullTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript + ' ';
            }
            if (fullTranscript.trim()) {
              aiVoiceTranscriptRef.current = fullTranscript.trim();
              setChatInput(fullTranscript.trim());
            }
          };
          recognition.start();
          aiRecognitionRef.current = recognition;
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Could not start AI voice media recorder:", err);
      alert('እባክዎ የማይክሮፎን ፈቃድ ይስጡ (Please allow microphone access in browser settings).');
      setIsAiVoiceRecording(false);
    }
  };

  const stopAiVoiceRecording = (shouldSend: boolean = true) => {
    const spoken = (aiVoiceTranscriptRef.current || chatInput).trim();
    
    if (aiMediaRecorderRef.current && aiMediaRecorderRef.current.state !== 'inactive') {
      const recorder = aiMediaRecorderRef.current;
      recorder.onstop = () => {
        try {
          recorder.stream.getTracks().forEach(t => t.stop());
          const audioBlob = new Blob(aiAudioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (shouldSend && audioBlob.size > 200) {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64Audio = reader.result as string;
              handleSendAiMessage(undefined, spoken, base64Audio);
            };
          } else if (shouldSend && spoken) {
            handleSendAiMessage(undefined, spoken);
          }
        } catch (e) {
          if (shouldSend && spoken) handleSendAiMessage(undefined, spoken);
        }
      };

      try {
        recorder.stop();
        recorder.stream.getTracks().forEach(t => t.stop());
      } catch (e) {}
      aiMediaRecorderRef.current = null;
    } else {
      if (shouldSend && spoken) {
        handleSendAiMessage(undefined, spoken);
      }
    }

    if (aiRecognitionRef.current) {
      try { aiRecognitionRef.current.stop(); } catch (e) {}
      aiRecognitionRef.current = null;
    }
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setIsAiVoiceRecording(false);
    setAiRecordingSeconds(0);
  };

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('እባክዎ ትክክለኛ የፎቶ ፋይል (PNG, JPG, JPEG, WebP) ይምረጡ።');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('የፎቶው መጠን ከ 8MB በታች መሆን አለበት።');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAiAttachedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSendAiMessage = async (e?: React.FormEvent, customPrompt?: string, customAudio?: string) => {
    if (e) e.preventDefault();
    const queryText = (customPrompt || chatInput).trim();
    const imageToSend = aiAttachedImage;
    const audioToSend = customAudio;
    if ((!queryText && !imageToSend && !audioToSend) || isChatLoading) return;

    let userMsg = queryText;
    if (!userMsg) {
      if (audioToSend) userMsg = "🎙️ የድምፅ መልዕክት (Voice Note)";
      else if (imageToSend) userMsg = "📸 ፎቶ ተያይዟል";
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgs = [...chatMessages, { role: 'user', text: userMsg, image: imageToSend || undefined, timestamp: nowTime }];
    setChatMessages(newMsgs);
    setChatInput('');
    aiVoiceTranscriptRef.current = '';
    setAiAttachedImage(null);
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

    const courseToUse = selectedAiCourse || activeCourse;
    const courseContext = courseToUse ? {
      courseTitle: courseToUse.title,
      courseId: courseToUse.id,
      category: courseToUse.category,
      lessonTitle: activeLesson?.title || 'Course Overview',
      lessonDesc: activeLesson?.desc || courseToUse.desc || '',
      courseAiPrompt: courseToUse.aiPrompt || '',
      whatYouWillLearn: Array.isArray(courseToUse.whatYouWillLearn) 
        ? courseToUse.whatYouWillLearn.join(', ') 
        : (courseToUse.whatYouWillLearn || '')
    } : undefined;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: queryText, 
          image: imageToSend, 
          audio: audioToSend, 
          courseContext,
          preferredLanguage: dashboardAiLang
        })
      });
      const data = await response.json();
      const reply = data.reply || data.error || (dashboardAiLang === 'en' ? "Sorry, I am unable to answer right now." : "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።");
      const finalMsgs = [
        ...newMsgs, 
        { role: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ];
      setChatMessages(finalMsgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

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
      const errorMsgs = [...newMsgs, { role: 'ai', text: "ይቅርታ፣ የሲስተም ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።", timestamp: nowTime }];
      setChatMessages(errorMsgs);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearAiChat = () => {
    setShowDashboardClearAiModal(true);
  };

  const saveTrashList = async (updatedList: any[]) => {
    const now = Date.now();
    const cleanList = updatedList.filter(item => new Date(item.expiresAt).getTime() > now);
    setAiTrashList(cleanList);
    try {
      localStorage.setItem('tsehay_ai_chat_trash', JSON.stringify(cleanList));
      if (user?.uid) {
        localStorage.setItem(`tsehay_ai_chat_trash_${user.uid}`, JSON.stringify(cleanList));
        const trashDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'trash');
        await setDoc(trashDocRef, { items: cleanList, updatedAt: serverTimestamp() });
      }
    } catch (e) {}
  };

  const performClearAiChat = async () => {
    // 1. Immediately dismiss modal so view returns to chat instantly
    setShowDashboardClearAiModal(false);

    // 2. If there are user messages in the current conversation, archive it into 15-Day Trash / Recycle Bin
    const hasUserMessages = chatMessages.some(m => m.role === 'user');
    if (hasUserMessages && chatMessages.length > 1) {
      const firstUserMsg = chatMessages.find(m => m.role === 'user')?.text || '';
      const previewText = firstUserMsg.length > 90 ? firstUserMsg.slice(0, 90) + '...' : firstUserMsg || 'የውይይት ታሪክ';
      const now = Date.now();
      const trashedItem = {
        id: `trash_${now}_${Math.random().toString(36).substring(2, 6)}`,
        deletedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 15 * 24 * 60 * 60 * 1000).toISOString(),
        courseTitle: selectedAiCourse?.title || 'አጠቃላይ (General)',
        preview: previewText,
        messages: [...chatMessages],
      };
      const updatedTrash = [trashedItem, ...aiTrashList.filter(item => new Date(item.expiresAt).getTime() > now)];
      saveTrashList(updatedTrash);
    }
    
    // 3. Reset chat states to fresh greeting
    const defaultGreeting = [{ role: 'ai', text: "ሰላም! እኔ Tsehay AI ነኝ። የትምህርት ጥያቄዎች ካሉዎት እባክዎ ይጠይቁኝ!" }];
    setChatMessages(defaultGreeting);
    setChatInput("");
    setAiAttachedImage(null);
    setIsChatLoading(false);
    setSavedAiNotes({});
    setSavedAiNoteIds({});

    // 4. Clear local storage and Firestore active chat history asynchronously
    if (user?.uid) {
      try { localStorage.removeItem(`tsehay-ai-chat_${user.uid}`); } catch (e) {}
      try { localStorage.removeItem('tsehay-ai-chat'); } catch (e) {}
      try {
        const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
        await setDoc(chatHistoryRef, { messages: defaultGreeting, updatedAt: serverTimestamp() });
      } catch (e) {}
    }
  };

  const handleRestoreTrashChat = (trashed: any) => {
    if (!trashed || !Array.isArray(trashed.messages)) return;
    setChatMessages(trashed.messages);
    if (user?.uid) {
      try { localStorage.setItem(`tsehay-ai-chat_${user.uid}`, JSON.stringify(trashed.messages)); } catch (e) {}
      try {
        const chatHistoryRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
        setDoc(chatHistoryRef, { messages: trashed.messages, updatedAt: serverTimestamp() }).catch(() => {});
      } catch (e) {}
    }
    // Remove from trash upon restore
    const updated = aiTrashList.filter(t => t.id !== trashed.id);
    saveTrashList(updated);
    setShowAiTrashModal(false);
  };

  const handleDeleteTrashItem = (id: string) => {
    const updated = aiTrashList.filter(t => t.id !== id);
    saveTrashList(updated);
  };

  const handleEmptyTrash = () => {
    saveTrashList([]);
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
      try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(nextLesson)); } catch(e) {}
      updateUrlState({ view: 'classroom', courseId: activeCourse?.id, lesson: nextLesson.lessonIndex });
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
      const prevLesson = allFlatLessons[currentIndex - 1];
      setActiveLesson(prevLesson);
      try { localStorage.setItem('tsehay_user_active_lesson', JSON.stringify(prevLesson)); } catch(e) {}
      updateUrlState({ view: 'classroom', courseId: activeCourse?.id, lesson: prevLesson.lessonIndex });
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

  const handleQuizPass = async (courseId?: string, score: number = 80) => {
    const targetCourseId = courseId || activeCourse?.id;
    if (!targetCourseId) return;

    const passedAt = new Date().toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' });
    
    setPassedQuizzes(prev => {
      const updated = { ...prev, [targetCourseId]: { score, passedAt } };
      try {
        localStorage.setItem('tsehay_passed_quizzes', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setHasTakenQuiz(true);
    setIsCourseCompleted(true);

    if (user?.uid) {
      try {
        const certDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'certificates', targetCourseId);
        await setDoc(certDocRef, {
          courseId: targetCourseId,
          courseTitle: activeCourse?.title || 'Tsehay Campus Course',
          score,
          passedAt,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Error saving certificate to firestore:", e);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      const finalName = settingsName.trim() || user.displayName || 'ተማሪ';
      const finalPhoto = settingsPhotoUrl || user.photoURL || '';

      try {
        await updateProfile(user, {
          displayName: finalName,
          photoURL: finalPhoto || undefined
        });
      } catch (authErr) {
        console.warn("Client auth update warning:", authErr);
      }
      
      const userDocRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid);
      await setDoc(userDocRef, {
         displayName: finalName,
         name: finalName,
         photoURL: finalPhoto,
         email: user.email || '',
         phone: settingsPhone,
         city: settingsCity,
         updatedAt: serverTimestamp()
      }, { merge: true });
      
      const profileRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'profile', 'info');
      await setDoc(profileRef, {
          name: finalName,
          displayName: finalName,
          photoURL: finalPhoto,
          phone: settingsPhone,
          city: settingsCity,
          email: user.email || '',
          updatedAt: serverTimestamp()
      }, { merge: true });

      try {
        const cachedAuth = localStorage.getItem('tsehay_auth_user_cache');
        const parsed = cachedAuth ? JSON.parse(cachedAuth) : {};
        parsed.displayName = finalName;
        parsed.photoURL = finalPhoto;
        localStorage.setItem('tsehay_auth_user_cache', JSON.stringify(parsed));
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tsehay_profile_updated', {
          detail: { displayName: finalName, photoURL: finalPhoto }
        }));
      }

      setProfileMessage({ type: 'success', text: 'የመገለጫ መረጃዎ እና ፎቶዎ በተሳካ ሁኔታ ተዘምኗል! (Profile and photo updated successfully)' });
      setTimeout(() => setProfileMessage(null), 5000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileMessage({ type: 'error', text: 'መረጃውን ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።' });
      setTimeout(() => setProfileMessage(null), 5000);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
      if (!user?.email) return;
      setPasswordResetMessage(null);
      try {
          const { getAuth, sendPasswordResetEmail } = await import('firebase/auth');
          const auth = getAuth();
          await sendPasswordResetEmail(auth, user.email);
          setPasswordResetMessage({ type: 'success', text: 'የይለፍ ቃል መቀየሪያ ሊንክ ወደ ኢሜልዎ ተልኳል! (Reset link sent to your email)' });
          setTimeout(() => setPasswordResetMessage(null), 5000);
      } catch (error: any) {
          console.error("Error sending reset email:", error);
          setPasswordResetMessage({ type: 'error', text: 'የይለፍ ቃል መቀየሪያ ኢሜል መላክ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' });
          setTimeout(() => setPasswordResetMessage(null), 5000);
      }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase/config');
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out auth error:", err);
    } finally {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tsehay_auth_user_cache');
          localStorage.removeItem('tsehay_auth_is_admin');
          localStorage.removeItem('tsehay_user_role');
          localStorage.removeItem('tsehay_user_active_course');
          localStorage.removeItem('tsehay_user_active_lesson');
          sessionStorage.clear();
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
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

  if ((authLoading && !user) || (!authInitialized && !user) || (loading && courses.length === 0 && !activeCourse)) {
    return <DashboardLoadingScreen message="የመማሪያ ክፍልዎን በማዘጋጀት ላይ... (Loading Classroom...)" />;
  }

  return (
    <div className="min-h-screen bg-[#030509] text-slate-200 flex flex-col md:flex-row font-body relative overflow-x-hidden selection:bg-[#f9b03c]/30">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-24 lg:w-72 bg-[#050811]/95 backdrop-blur-2xl border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col items-center lg:items-start shadow-2xl z-20 shrink-0">
        <div className="h-16 md:h-20 w-full flex items-center justify-between md:justify-center lg:justify-start px-4 lg:px-6 border-b border-white/[0.06]">
          <a href="/" className="flex items-center cursor-pointer group brand-entrance">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl mx-auto flex items-center justify-center shadow-lg p-0.5 border border-white/20 brand-logo-img">
              <img src="/tc-logo.jpg" alt="Tsehay Campus Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <span className="ml-3 font-heading font-black text-lg md:text-xl tracking-tight notranslate select-none">
              <span className="text-[#f9b03c]">Tsehay</span> <span className="text-[#3268ba]">Campus</span>
            </span>
          </a>
          
          <div className="md:hidden flex items-center gap-2">
             <button 
               onClick={() => setCurrentView('settings')}
               className="p-1 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 cursor-pointer"
               title="ማስተካከያ (Settings)"
             >
               <img 
                 src={studentPhotoUrl} 
                 className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/40" 
                 alt={studentDisplayName}
                 onError={(e) => {
                   (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentDisplayName)}&background=f9b03c&color=111827&bold=true`;
                 }}
               />
             </button>
             <button
               onClick={handleLogout}
               disabled={isLoggingOut}
               className="px-2.5 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black border border-red-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
               title="ውጣ (Logout)"
             >
               {isLoggingOut ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right-from-bracket"></i>}
               <span>{isLoggingOut ? '...' : (t('logout') || 'ውጣ')}</span>
             </button>
          </div>
        </div>

        <nav className="flex-1 overflow-x-auto md:overflow-y-auto py-2 md:py-3 px-3 space-y-1 font-body no-scrollbar w-full flex flex-row md:flex-col gap-2 md:gap-0 items-center md:items-stretch">
          
          {/* 🌟 ULTRA-PREMIUM UNIFIED MAIN MENU DOCK (ANIMATED SECONDARY TOGGLE BUTTON) */}
          <div className="hidden lg:block w-full mb-3">
            <button
              type="button"
              onClick={() => setIsNavDrawerExpanded(prev => !prev)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group cursor-pointer active:scale-[0.98] border ${
                isNavDrawerExpanded
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-[#f9b03c]/40 shadow-md'
                  : 'bg-gradient-to-r from-amber-500/15 via-[#f9b03c]/10 to-transparent border-[#f9b03c]/50 hover:border-[#f9b03c] shadow-[0_0_25px_rgba(249,176,60,0.2)] hover:shadow-[0_0_30px_rgba(249,176,60,0.35)]'
              }`}
              title={isNavDrawerExpanded ? "ማውጫውን እጠፍ (Collapse Menu)" : "ማውጫውን ዘርጋ (Expand Menu)"}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shadow-sm transition-all duration-300 ${
                  isNavDrawerExpanded
                    ? 'bg-gradient-to-tr from-[#f9b03c]/25 via-amber-400/15 to-transparent text-[#f9b03c] border border-[#f9b03c]/40 group-hover:scale-110'
                    : 'bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_15px_rgba(249,176,60,0.6)] animate-pulse'
                }`}>
                  <i className={`fa-solid ${isNavDrawerExpanded ? 'fa-compass' : 'fa-bars-staggered'}`}></i>
                </div>
                <div className="text-left">
                  <span className="font-heading font-black text-xs sm:text-[13px] text-white tracking-wide block leading-tight">
                    {t('main_menu') || 'ዋና ማውጫ'}
                  </span>
                  <span className="text-[10px] text-[#f9b03c] font-black block leading-tight mt-0.5">
                    {currentView === 'classroom' && '• መማሪያ ክፍል'}
                    {currentView === 'courses' && '• የእኔ ኮርሶች'}
                    {currentView === 'messages' && '• መልዕክቶች'}
                    {currentView === 'ai' && '• AI ረዳት'}
                    {currentView === 'certificates' && '• ሰርተፊኬት'}
                    {currentView === 'settings' && '• ማስተካከያ'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isNavDrawerExpanded ? (
                  <span className="text-[10px] font-black text-white bg-slate-800/90 border border-white/20 hover:border-[#f9b03c]/60 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 transition-all">
                    <i className="fa-solid fa-chevron-up text-[9px] transition-transform group-hover:-translate-y-0.5"></i>
                    <span>እጠፍ</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-slate-950 bg-gradient-to-r from-[#f9b03c] via-amber-300 to-yellow-200 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(249,176,60,0.6)] flex items-center gap-1.5 transition-all group-hover:scale-105 animate-pulse">
                    <i className="fa-solid fa-chevron-down text-[9px] transition-transform group-hover:translate-y-0.5"></i>
                    <span>✨ ዘርጋ</span>
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* 🌟 UNIFIED ACCORDION ITEMS CONTAINER (SMOOTH EXPAND / COLLAPSE) */}
          <div className={`space-y-1.5 w-full transition-all duration-300 flex flex-row md:flex-col gap-2 md:gap-1.5 items-center md:items-stretch overflow-hidden ${
            isNavDrawerExpanded 
              ? 'max-h-[600px] opacity-100 py-0.5' 
              : 'max-h-0 lg:max-h-0 opacity-0 pointer-events-none lg:pointer-events-none'
          }`}>

            {/* 1. Classroom (መማሪያ ክፍል) */}
            <button 
              onClick={() => setCurrentView('classroom')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'classroom' 
                  ? 'bg-gradient-to-r from-[#3268ba] via-[#3b75d6] to-[#254f8e] text-white shadow-lg shadow-[#3268ba]/35 font-black scale-[1.01] border border-white/20' 
                  : 'text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'classroom'
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-white/[0.08] text-white group-hover:bg-[#3268ba]/20 group-hover:text-[#5a93e8]'
                }`}>
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  {t('classroom')}
                </span>
              </div>
              {currentView === 'classroom' && (
                <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-white/80 animate-in fade-in slide-in-from-left-1 duration-200"></i>
              )}
            </button>
            
            {/* 2. My Courses (የእኔ ኮርሶች) */}
            <button 
              onClick={() => setCurrentView('courses')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'courses' 
                  ? 'bg-gradient-to-r from-[#3268ba] via-[#3b75d6] to-[#254f8e] text-white shadow-lg shadow-[#3268ba]/35 font-black scale-[1.01] border border-white/20' 
                  : 'text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'courses'
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-white/[0.08] text-white group-hover:bg-[#3268ba]/20 group-hover:text-[#5a93e8]'
                }`}>
                  <i className="fa-solid fa-book-bookmark text-xs"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  {t('my_courses')}
                </span>
              </div>
              {currentView === 'courses' ? (
                <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-white/80 animate-in fade-in slide-in-from-left-1 duration-200"></i>
              ) : (
                courses.length > 0 && (
                  <span className="hidden lg:inline-flex text-[10px] font-black px-2 py-0.5 rounded-full bg-white/15 text-white">
                    {courses.length}
                  </span>
                )
              )}
            </button>

            {/* 3. Messages & Support (መልዕክቶች እና ድጋፍ) */}
            <button 
              onClick={() => setCurrentView('messages')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'messages' 
                  ? 'bg-gradient-to-r from-[#3268ba] via-[#3b75d6] to-[#254f8e] text-white shadow-lg shadow-[#3268ba]/35 font-black scale-[1.01] border border-white/20' 
                  : 'text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'messages'
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-white/[0.08] text-white group-hover:bg-[#3268ba]/20 group-hover:text-[#5a93e8]'
                }`}>
                  <i className="fa-solid fa-headset text-xs"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  {t('messages')}
                </span>
              </div>
              {currentView === 'messages' ? (
                <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-white/80 animate-in fade-in slide-in-from-left-1 duration-200"></i>
              ) : (
                <span className="hidden lg:inline-flex text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3268ba]/20 text-[#5a93e8] border border-[#3268ba]/30">
                  Live
                </span>
              )}
            </button>

            {/* 3.5. Community & Social Feed */}
            <a 
              href="/community" 
              className="flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.08] text-white group-hover:bg-[#f9b03c]/20 group-hover:text-[#f9b03c] transition-all">
                  <i className="fa-solid fa-users text-xs"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight">
                  ማህበረሰብ (Community)
                </span>
              </div>
              <span className="hidden lg:inline-flex text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30">
                New
              </span>
            </a>

            {/* 4. Tsehay AI Tutor - Elevated Spotlight Gold Brand Item */}
            <button 
              onClick={() => setCurrentView('ai')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'ai' 
                  ? 'bg-gradient-to-r from-[#f9b03c] via-amber-400 to-[#e59b2b] text-slate-950 shadow-xl shadow-[#f9b03c]/40 font-black border border-white/30 scale-[1.02]' 
                  : 'text-white bg-[#f9b03c]/[0.09] hover:bg-[#f9b03c]/20 border border-[#f9b03c]/35 hover:border-[#f9b03c]/60 shadow-[0_0_18px_rgba(249,176,60,0.15)] font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                    currentView === 'ai'
                      ? 'bg-slate-950 text-[#f9b03c] shadow-inner'
                      : 'bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/40 group-hover:bg-[#f9b03c] group-hover:text-slate-950'
                  }`}>
                    <i className="fa-solid fa-robot text-sm"></i>
                  </span>
                  {/* Clean Steady Gold Glow Status Dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#f9b03c] border-2 border-white dark:border-slate-900 rounded-full shadow-[0_0_8px_#f9b03c]"></span>
                </div>
                <div className="flex flex-col">
                  <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-heading font-black text-sm tracking-tight drop-shadow-xs">
                    Tsehay AI
                  </span>
                </div>
              </div>
              <span className={`hidden lg:inline-flex text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full border transition-all ${
                currentView === 'ai'
                  ? 'bg-slate-950/80 text-[#f9b03c] border-slate-900/30'
                  : 'bg-[#f9b03c]/20 text-[#f9b03c] border-[#f9b03c]/40 group-hover:bg-[#f9b03c] group-hover:text-slate-950'
              }`}>
                24/7 AI
              </span>
            </button>
            
            {/* 5. Certificates (የብቃት ሰርተፊኬት) */}
            <button 
              onClick={() => setCurrentView('certificates')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'certificates' 
                  ? 'bg-gradient-to-r from-[#3268ba] via-[#3b75d6] to-[#254f8e] text-white shadow-lg shadow-[#3268ba]/35 font-black scale-[1.01] border border-white/20' 
                  : 'text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'certificates'
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-white/[0.08] text-white group-hover:bg-[#3268ba]/20 group-hover:text-[#5a93e8]'
                }`}>
                  <i className="fa-solid fa-award text-sm"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  {t('certificates')}
                </span>
              </div>
              {currentView === 'certificates' && (
                <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-white/80 animate-in fade-in slide-in-from-left-1 duration-200"></i>
              )}
            </button>

            {/* 6. Refer a Friend (ጓደኛዎን ይጋብዙ - ALX Growth Program) */}
            <button 
              onClick={() => setCurrentView('referrals')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'referrals' 
                  ? 'bg-gradient-to-r from-amber-500 via-[#f9b03c] to-yellow-400 text-slate-950 shadow-xl shadow-[#f9b03c]/40 font-black border border-white/30 scale-[1.02]' 
                  : 'text-white bg-white/[0.04] hover:bg-[#f9b03c]/15 hover:text-[#f9b03c] border border-amber-400/25 hover:border-[#f9b03c]/50 font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'referrals'
                    ? 'bg-slate-950 text-[#f9b03c] shadow-inner'
                    : 'bg-[#f9b03c]/20 text-[#f9b03c]'
                }`}>
                  <i className="fa-solid fa-gift text-sm animate-bounce"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  ጓደኛዎን ይጋብዙ
                </span>
              </div>
              <span className={`hidden lg:inline-flex text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full border transition-all ${
                currentView === 'referrals'
                  ? 'bg-slate-950/80 text-[#f9b03c] border-slate-900/30'
                  : 'bg-amber-400/20 text-[#f9b03c] border-amber-400/30'
              }`}>
                🎁 ነፃ ኮርስ
              </span>
            </button>
            
            {/* 7. Settings (መገለጫ እና ማስተካከያ) */}
            <button 
              onClick={() => setCurrentView('settings')} 
              className={`flex items-center justify-between gap-2.5 p-2.5 lg:p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm cursor-pointer ${
                currentView === 'settings' 
                  ? 'bg-gradient-to-r from-[#3268ba] via-[#3b75d6] to-[#254f8e] text-white shadow-lg shadow-[#3268ba]/35 font-black scale-[1.01] border border-white/20' 
                  : 'text-white hover:bg-white/[0.08] hover:text-[#f9b03c] border border-transparent font-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  currentView === 'settings'
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'bg-white/[0.08] text-white group-hover:bg-[#3268ba]/20 group-hover:text-[#5a93e8]'
                }`}>
                  <i className="fa-solid fa-sliders text-sm"></i>
                </span>
                <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-black text-sm tracking-tight drop-shadow-xs">
                  {t('settings')}
                </span>
              </div>
              {currentView === 'settings' && (
                <i className="hidden lg:block fa-solid fa-chevron-right text-xs text-white/80 animate-in fade-in slide-in-from-left-1 duration-200"></i>
              )}
            </button>
          </div>
        </nav>

        <div className="hidden md:block p-4 w-full border-t border-slate-100 dark:border-slate-700">
          <div 
            onClick={() => setCurrentView('settings')}
            className="flex items-center justify-center lg:justify-start gap-3 p-2 mb-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition cursor-pointer group"
            title="መገለጫዎን ለማስተካከል ይጫኑ"
          >
            <div className="relative shrink-0">
              <img 
                src={studentPhotoUrl} 
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-primary/40 group-hover:ring-primary transition" 
                alt={studentDisplayName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentDisplayName)}&background=f9b03c&color=111827&bold=true`;
                }}
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-800"></span>
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate group-hover:text-primary transition">
                {studentDisplayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {courses.some(c => {
                  const isFree = c.isFree === true || c.price === 'Free' || c.price === '0' || c.price === 0 || Number(c.price) === 0;
                  return !isFree;
                }) ? (
                  <span className="text-amber-600 dark:text-primary font-bold flex items-center gap-1">
                    <i className="fa-solid fa-crown text-[10px]"></i> {t('pro_member')}
                  </span>
                ) : 'Free Member'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center lg:justify-center gap-2 p-2.5 rounded-xl text-red-500 hover:text-white border border-red-500/20 hover:bg-red-500 font-bold transition duration-200 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-xs active:scale-95"
            title="ከአካውንትዎ ይውጡ (Sign Out)"
          >
             {isLoggingOut ? (
               <i className="fa-solid fa-spinner fa-spin"></i>
             ) : (
               <i className="fa-solid fa-arrow-right-from-bracket group-hover:-translate-x-0.5 transition-transform"></i>
             )}
             <span className="hidden lg:block">{isLoggingOut ? (t('logging_out') || 'በመውጣት ላይ...') : (t('logout') || 'ውጣ (Logout)')}</span>
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
                <button 
                  onClick={toggleTheme} 
                  title="Toggle Dark / Light Theme"
                  className="w-9 h-9 rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-500/20 dark:bg-slate-700/80 hover:bg-primary/40 dark:hover:bg-slate-600 flex items-center justify-center transition-all duration-300 shadow-md border-2 border-primary/50 dark:border-slate-600 text-dark dark:text-yellow-400 shrink-0 group"
                >
                    <i className={`fa-solid ${isDarkTheme ? 'fa-sun text-yellow-400' : 'fa-moon text-secondary'} text-sm group-hover:scale-110 transition-transform`}></i>
                </button>
                <div 
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20 border border-[#f9b03c]/40 px-3.5 py-1.5 rounded-full shadow-sm cursor-help hover:scale-105 transition" 
                  title="የተከማቹ ፖይንቶች ከመቶ (Earned Points out of 100)"
                >
                    <div className="w-5 h-5 rounded-full bg-[#f9b03c]/20 flex items-center justify-center text-[#f9b03c] text-xs">
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                    <span className="font-black text-dark dark:text-white text-sm font-heading">
                      {(() => {
                        const totalCoursesCount = courses && courses.length > 0 ? courses.length : 1;
                        const pointsPerCourse = 100 / totalCoursesCount;
                        
                        let currentLessonCount = 0;
                        modules.forEach((m: any) => { currentLessonCount += (m.lessons || []).length; });
                        if (currentLessonCount === 0) currentLessonCount = 1;
                        
                        const currentProgressRatio = Math.min(1, progress.length / currentLessonCount);
                        const currentCourseEarned = currentProgressRatio * pointsPerCourse;
                        
                        let otherCoursesEarned = 0;
                        if (courses && courses.length > 1) {
                          courses.forEach((c: any) => {
                            if (c.id !== activeCourse?.id) {
                              if (c.isCompleted) {
                                otherCoursesEarned += pointsPerCourse;
                              } else if (c.progress) {
                                otherCoursesEarned += (Math.min(100, Number(c.progress)) / 100) * pointsPerCourse;
                              }
                            }
                          });
                        }
                        
                        const totalPoints = Math.min(100, Math.round(currentCourseEarned + otherCoursesEarned));
                        return totalPoints;
                      })()} Pts
                    </span>
                </div>

                {/* Notifications Bell & Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className="relative text-gray-500 dark:text-gray-300 hover:text-[#f9b03c] dark:hover:text-[#f9b03c] transition text-xl shrink-0 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
                    title="ማሳወቂያዎች"
                  >
                      <i className="fa-regular fa-bell"></i>
                      {notificationsList.filter(n => !n.read).length > 0 && (
                        <span className="absolute 0 top-0.5 right-0.5 w-2.5 h-2.5 bg-[#f9b03c] rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                      )}
                  </button>

                  {showNotifications && (
                    <>
                      {/* Backdrop for outside click */}
                      <div 
                        onClick={() => setShowNotifications(false)} 
                        className="fixed inset-0 z-40 bg-transparent" 
                      />

                      {/* Clean Modern Notification Card */}
                      <div className="absolute top-12 right-0 w-80 sm:w-88 bg-white dark:bg-[#0c121e] border border-gray-100 dark:border-slate-800 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                         {/* Header */}
                         <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-3">
                           <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-lg bg-[#f9b03c]/15 text-[#f9b03c] flex items-center justify-center text-xs">
                               <i className="fa-solid fa-bell"></i>
                             </div>
                             <h4 className="text-sm font-black text-dark dark:text-white font-heading">ማሳወቂያዎች</h4>
                             {notificationsList.filter(n => !n.read).length > 0 && (
                               <span className="text-[10px] font-bold bg-[#f9b03c]/20 text-[#f9b03c] px-2 py-0.5 rounded-full">
                                 {notificationsList.filter(n => !n.read).length} አዲስ
                               </span>
                             )}
                           </div>
                           <button 
                             onClick={handleMarkAllNotificationsRead} 
                             className="text-xs font-bold text-gray-400 hover:text-[#f9b03c] dark:hover:text-[#f9b03c] transition cursor-pointer"
                           >
                             ሁሉንም አንብብ
                           </button>
                         </div>

                         {/* Notifications List */}
                         <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {notificationsList.length === 0 ? (
                              <div className="text-center py-6 text-gray-400 text-xs">
                                <i className="fa-regular fa-bell-slash text-2xl mb-2 block opacity-40"></i>
                                ምንም ማሳወቂያ የለም
                              </div>
                            ) : (
                              notificationsList.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                                    n.read 
                                      ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-slate-800/50 opacity-70' 
                                      : 'bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20'
                                  }`}
                                >
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f9b03c] to-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs">
                                      <i className="fa-solid fa-bullhorn"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="text-xs font-bold text-dark dark:text-white truncate">{n.title}</p>
                                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{n.createdAt}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-body leading-relaxed mt-0.5">{n.message}</p>
                                    </div>
                                </div>
                              ))
                            )}
                         </div>
                      </div>
                    </>
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
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black font-heading text-dark dark:text-white mb-2">{activeCourse?.title || t('course_loading')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-body text-sm">{activeCourse?.category || 'Tsehay Campus Course'}</p>
                </div>

                {/* 🌟 Dedicated Cinema Mode / Syllabus Toggle with Animated Secondary Color */}
                <div className="hidden lg:flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsSyllabusCollapsed(prev => !prev)}
                        className={`px-4 py-2.5 rounded-2xl font-heading text-xs font-black transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-95 border shadow-lg ${
                          isSyllabusCollapsed
                            ? 'bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 text-slate-950 border-amber-300/80 shadow-[0_0_20px_rgba(249,176,60,0.45)] animate-pulse'
                            : 'bg-white/[0.06] hover:bg-[#f9b03c]/15 text-white hover:text-[#f9b03c] border-white/10 hover:border-[#f9b03c]/50'
                        }`}
                        title={isSyllabusCollapsed ? "የኮርስ ይዘት ዝርዝርን ዘርጋ (Expand Playlist)" : "ሲኒማ እይታ / ይዘቱን እጠፍ (Focus Mode)"}
                    >
                        <i className={`fa-solid ${isSyllabusCollapsed ? 'fa-list-check text-slate-950' : 'fa-expand text-[#f9b03c]'} text-sm`}></i>
                        <span>{isSyllabusCollapsed ? '📚 የኮርስ ይዘት ዘርጋ (Show Playlist)' : '🎬 ሲኒማ እይታ / ይዘት እጠፍ (Focus Mode)'}</span>
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 lg:gap-8 transition-all duration-500 ${
              isSyllabusCollapsed 
                ? 'grid-cols-1' 
                : 'lg:grid-cols-3 xl:grid-cols-4'
            }`}>
                
                {/* Left Side: Video & Tabs */}
                <div className={`flex flex-col gap-6 transition-all duration-500 ${
                  isSyllabusCollapsed 
                    ? 'w-full col-span-1' 
                    : 'lg:col-span-2 xl:col-span-3'
                }`}>
                    
                    {/* Cinematic Video Player */}
                    <div className="bg-dark rounded-2xl overflow-hidden shadow-2xl relative border border-gray-800 aspect-video flex items-center justify-center group/player">
                        
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
                                let embedUrl = cleanUrl.replace('/play/', '/embed/').replace('video.mediadelivery.net', 'iframe.mediadelivery.net');
                                if (!embedUrl.includes('autoplay=')) {
                                    embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=true';
                                }
                                return (
                                    <iframe
                                        src={embedUrl}
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
                    <div id="classroom-tabs-section" className="bg-white dark:bg-[#070b14]/95 backdrop-blur-3xl rounded-3xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden min-h-[300px] scroll-mt-6">
                        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-white/10 no-scrollbar bg-gray-50/80 dark:bg-[#0b1222]/90 px-3 pt-3 gap-1.5 sm:gap-2">
                            <button 
                                onClick={() => setActiveTab("syllabus")} 
                                className={`lg:hidden px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "syllabus" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-list-ol text-amber-400 text-sm group-hover:scale-110 transition-transform"></i> 
                                <span>ትምህርቶች (Syllabus)</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("overview")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "overview" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-compass text-sky-400 text-sm group-hover:scale-110 transition-transform"></i>
                                <span>{t("overview")}</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("resources")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "resources" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-folder-open text-amber-500 text-sm group-hover:scale-110 transition-transform"></i> 
                                <span>ፋይሎች (Resources)</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("notes")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "notes" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-feather-pointed text-emerald-400 text-sm group-hover:scale-110 transition-transform"></i> 
                                <span>{t("notes")}</span>
                                {studentNotes.length > 0 && (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-full font-black">
                                        {studentNotes.length}
                                    </span>
                                )}
                            </button>

                            <button 
                                onClick={() => setActiveTab("qa")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "qa" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-comments text-violet-400 text-sm group-hover:scale-110 transition-transform"></i>
                                <span>{t("qa")}</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("community")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "community" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-brands fa-telegram text-[#26A5E4] text-base group-hover:scale-110 transition-transform"></i> 
                                <span>VIP ማህበረሰብ</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("quiz")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "quiz" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-clipboard-question text-rose-400 text-sm group-hover:scale-110 transition-transform"></i>
                                <span>{t("quiz")}</span>
                            </button>

                            <button 
                                onClick={() => setActiveTab("certificate")} 
                                className={`px-4 sm:px-5 py-3 rounded-t-2xl font-heading text-xs sm:text-[14px] font-black whitespace-nowrap flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group ${
                                    activeTab === "certificate" 
                                        ? "bg-gradient-to-b from-[#f9b03c]/20 via-[#f9b03c]/10 to-transparent text-amber-900 dark:text-[#f9b03c] border-b-[3px] border-[#f9b03c] shadow-[inset_0_-2px_8px_rgba(249,176,60,0.35)]" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-b-[3px] border-transparent font-bold"
                                }`}
                            >
                                <i className="fa-solid fa-award text-[#f9b03c] text-sm group-hover:scale-110 transition-transform"></i>
                                <span>{t("certificate")}</span>
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
                                                                        updateUrlState({ view: 'classroom', courseId: activeCourse?.id, lesson: lidx });
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
                                                {studentNotes.map((note) => {
                                                    const isHighlighted = highlightedNoteId === note.id || (highlightedNoteId && note.id.includes(highlightedNoteId));
                                                    return (
                                                        <div 
                                                            key={note.id} 
                                                            id={`student-note-${note.id}`}
                                                            className={`p-5 rounded-2xl border transition-all duration-500 relative group ${
                                                                isHighlighted
                                                                    ? 'anim-blink-gold border-[#f9b03c] bg-amber-400/15 dark:bg-amber-500/20'
                                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm hover:border-primary/50'
                                                            }`}
                                                        >
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

                                                                    {isHighlighted && (
                                                                        <span className="text-[10px] bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-md animate-bounce flex items-center gap-1">
                                                                            ✨ አዲስ የተጨመረ ማስታወሻ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-gray-400 font-bold">{note.createdAt}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(note.text);
                                                                            setCopiedNoteId(note.id);
                                                                            setTimeout(() => setCopiedNoteId(null), 2000);
                                                                        }}
                                                                        className="h-7 px-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 transition flex items-center gap-1 text-xs cursor-pointer"
                                                                        title="ኮፒ አድርግ (Copy)"
                                                                    >
                                                                        <i className={`fa-solid ${copiedNoteId === note.id ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                                                                        {copiedNoteId === note.id && <span className="text-[10px] font-bold text-emerald-500">ተገልብጧል</span>}
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
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "qa" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col min-h-[460px] bg-white dark:bg-[#070b14]/95 backdrop-blur-3xl rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden relative shadow-2xl">
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-[#0b1329] via-[#0f1b38] to-[#0b1329] text-white p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shadow-md z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-lg font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]">
                                                    <i className="fa-solid fa-chalkboard-user"></i>
                                                </div>
                                                <div>
                                                    <h3 className="font-heading font-black text-sm sm:text-base text-white">ከመምህሩ ጋር ጥያቄና መልስ (Ask Instructor)</h3>
                                                    <p className="text-[11px] text-gray-300 font-normal">ለዚህ ኮርስ ያሎትን ጥያቄ፣ ፎቶ አሊያም ድምፅ ለአስተማሪው ያስገቡ</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                                    <i className="fa-solid fa-circle-check text-slate-950 text-[10px]"></i>
                                                    <span>{activeCourse?.instructor || "Eyoub Sahle"}</span>
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Messages Body */}
                                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[400px]">
                                            {studentTickets.filter((t: any) => !activeCourse || t.courseId === activeCourse.id).length === 0 ? (
                                                <div className="text-center py-16 bg-gray-50/60 dark:bg-[#0c1428]/60 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 my-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#f9b03c]/15 text-[#f9b03c] text-2xl flex items-center justify-center mx-auto mb-3 border border-[#f9b03c]/25 shadow-inner">
                                                        <i className="fa-solid fa-comments"></i>
                                                    </div>
                                                    <p className="text-sm font-black text-dark dark:text-white">ለዚህ ኮርስ እስካሁን ምንም ጥያቄ አልላኩም።</p>
                                                    <p className="text-xs text-gray-400 mt-1">ያልገባዎትን ነገር ፅፈው ወይም በፎቶ/በድምፅ ለአስተማሪው መላክ ይችላሉ።</p>
                                                </div>
                                            ) : (
                                                studentTickets.filter((t: any) => !activeCourse || t.courseId === activeCourse.id).map((ticket: any) => (
                                                    <div key={ticket.id} className="bg-white dark:bg-[#0c1428] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-[#f9b03c] animate-pulse"></span>
                                                                <span className="text-xs font-bold text-dark dark:text-white">እርስዎ የጠየቁት ጥያቄ፦</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${ticket.status === "replied" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"}`}>
                                                                {ticket.status === "replied" ? "✓ መልስ ተሰጥቷል" : "⏳ በመጠባበቅ ላይ"}
                                                            </span>
                                                        </div>

                                                        {ticket.message && (
                                                            <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-black/30 p-3 rounded-xl border border-gray-100 dark:border-white/5 font-body leading-relaxed">
                                                                {ticket.message}
                                                            </p>
                                                        )}

                                                        {ticket.attachment && (
                                                            <div className="mt-2">
                                                                {ticket.attachment.type === "image" && (
                                                                    <img src={ticket.attachment.url} alt={ticket.attachment.name} className="max-w-[280px] max-h-[220px] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm cursor-pointer hover:scale-[1.02] transition" />
                                                                )}
                                                                {ticket.attachment.type === "document" && (
                                                                    <a href={ticket.attachment.url} download={ticket.attachment.name} className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs font-bold hover:underline">
                                                                        <i className="fa-solid fa-file-pdf text-red-500 text-base"></i>
                                                                        <span>{ticket.attachment.name}</span>
                                                                    </a>
                                                                )}
                                                                {ticket.attachment.type === "audio" && (
                                                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 inline-flex items-center gap-2">
                                                                        <i className="fa-solid fa-microphone text-amber-500 text-sm"></i>
                                                                        <audio controls src={ticket.attachment.url} className="h-8 max-w-[260px]"></audio>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {ticket.replies && ticket.replies.length > 0 ? (
                                                            <div className="mt-3 pl-3 border-l-2 border-[#f9b03c] space-y-2">
                                                                {ticket.replies.map((reply: any, rIdx: number) => (
                                                                    <div key={rIdx} className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <i className="fa-solid fa-user-tie text-emerald-500 text-xs"></i>
                                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">የመምህሩ መልስ፦</span>
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

                                        {/* Input Box Footer */}
                                        <div className="p-3.5 bg-gray-50 dark:bg-[#0b1222] border-t border-gray-200 dark:border-white/10">
                                            {questionSentMessage && (
                                                <div className="mb-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-bounce">
                                                    <i className="fa-solid fa-circle-check"></i>
                                                    <span>{questionSentMessage}</span>
                                                </div>
                                            )}
                                            
                                            {qaAttachment && (
                                                <div className="mb-2 p-2 bg-[#f9b03c]/10 border border-[#f9b03c]/30 rounded-xl flex items-center justify-between text-xs font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fa-solid ${qaAttachment.type === "image" ? "fa-image text-emerald-500" : qaAttachment.type === "audio" ? "fa-microphone text-amber-500" : "fa-file-pdf text-red-500"}`}></i>
                                                        <span className="truncate max-w-[220px] text-dark dark:text-white">{qaAttachment.name}</span>
                                                    </div>
                                                    <button onClick={() => setQaAttachment(null)} className="text-gray-400 hover:text-red-500 p-1 cursor-pointer">
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 bg-white dark:bg-[#070b14] border border-gray-200 dark:border-white/15 rounded-2xl p-1.5 pl-2.5 focus-within:border-[#f9b03c] shadow-inner transition">
                                                <div className="relative">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowAttachmentMenu(prev => !prev)} 
                                                        className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-[#f9b03c] hover:text-slate-950 flex items-center justify-center font-bold text-base transition cursor-pointer active:scale-95"
                                                        title="ፋይል/ፎቶ/ድምፅ አያይዝ (Attach File)"
                                                    >
                                                        <i className="fa-solid fa-paperclip"></i>
                                                    </button>

                                                    {showAttachmentMenu && (
                                                        <div className="absolute bottom-12 left-0 bg-white dark:bg-[#0c1428] border border-gray-200 dark:border-white/15 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 w-52 animate-in slide-in-from-bottom-2">
                                                            <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-xs font-bold text-dark dark:text-white transition">
                                                                <i className="fa-solid fa-image text-emerald-400 text-sm"></i> ፎቶ / ስክሪንሾት
                                                                <input type="file" accept="image/*" onChange={(e) => handleQaFileUpload(e, "image")} className="hidden" />
                                                            </label>
                                                            <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-xs font-bold text-dark dark:text-white transition">
                                                                <i className="fa-solid fa-file-pdf text-red-400 text-sm"></i> ሰነድ / PDF / ፋይል
                                                                <input type="file" accept=".pdf,.doc,.docx,.txt,.zip" onChange={(e) => handleQaFileUpload(e, "document")} className="hidden" />
                                                            </label>
                                                            {isRecordingVoice ? (
                                                                <button onClick={handleStopVoiceRecord} className="flex items-center gap-2.5 p-2 rounded-xl bg-red-500 text-white text-xs font-bold w-full transition">
                                                                    <i className="fa-solid fa-stop animate-pulse"></i> ቅዳ አቁም (Stop Voice)
                                                                </button>
                                                            ) : (
                                                                <button onClick={handleStartVoiceRecord} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-dark dark:text-white w-full transition">
                                                                    <i className="fa-solid fa-microphone text-[#f9b03c] text-sm"></i> ድምፅ መቅጃ (Voice)
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <input 
                                                    id="classroom-qa-input"
                                                    type="text" 
                                                    value={questionInput}
                                                    onChange={e => setQuestionInput(e.target.value)}
                                                    onKeyDown={e => e.key === "Enter" && handleAskAdmin()}
                                                    placeholder="ለኮርሱ መምህር የሚያስተላልፉትን ጥያቄ እዚህ ይፃፉ..." 
                                                    className="flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm outline-none text-dark dark:text-white"
                                                />
                                                <button 
                                                    onClick={handleAskAdmin} 
                                                    className="px-5 py-2.5 bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 transition shadow-md shrink-0 text-xs cursor-pointer active:scale-95"
                                                >
                                                    <i className="fa-solid fa-paper-plane text-xs"></i>
                                                    <span>ለአስተማሪ ላክ</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="p-3 sm:p-6">
                                    <CourseQuiz
                                        course={activeCourse}
                                        user={user}
                                        onPass={(score) => handleQuizPass(activeCourse?.id, score)}
                                        onViewCertificate={() => setActiveTab('certificate')}
                                    />
                                </div>
                            )}

                            {activeTab === 'certificate' && (
                                <div className="p-3 sm:p-6">
                                    {passedQuizzes[activeCourse?.id] || hasTakenQuiz ? (
                                        <CourseCertificate
                                            course={activeCourse}
                                            user={user}
                                            score={passedQuizzes[activeCourse?.id]?.score || 90}
                                            issueDate={passedQuizzes[activeCourse?.id]?.passedAt}
                                        />
                                    ) : (
                                        <div className="text-center py-12 px-4 bg-slate-900/60 border border-slate-800 rounded-3xl max-w-xl mx-auto space-y-4">
                                            <div className="w-16 h-16 rounded-3xl bg-amber-400/10 text-amber-400 mx-auto flex items-center justify-center text-3xl border border-amber-400/20 shadow-md">
                                                <i className="fa-solid fa-lock"></i>
                                            </div>
                                            <h3 className="text-xl font-black text-white font-heading">ሰርተፍኬት ዝግ ነው (Certificate Locked)</h3>
                                            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                                                እውቅና ያለው ይፋዊ የዲጂታል ሰርተፍኬትዎን ለመውሰድ የኮርስ ማጠቃለያ ፈተናውን ወስደው ቢያንስ <span className="text-amber-400 font-bold">80%</span> ማምጣት ይኖርብዎታል።
                                            </p>
                                            <div className="pt-2">
                                                <button
                                                    onClick={() => setActiveTab('quiz')}
                                                    className="px-7 py-3.5 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-400/25 hover:scale-105 transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                                                >
                                                    <i className="fa-solid fa-list-check"></i>
                                                    <span>🎯 ወደ ፈተናው ይሂዱ (Take Exam)</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Curriculum/Course Content (Desktop Only, Collapsible Focus Mode) */}
                {!isSyllabusCollapsed && (
                  <div className="hidden lg:block lg:col-span-1 xl:col-span-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col h-full lg:h-[calc(100vh-160px)] lg:sticky lg:top-4 overflow-hidden transition-colors duration-300">
                        
                        <div className="p-5 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shadow-sm flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
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

                            <button
                              type="button"
                              onClick={() => setIsSyllabusCollapsed(true)}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-[#f9b03c] text-[#f9b03c] hover:text-slate-950 border border-[#f9b03c]/30 text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0 mt-0.5"
                              title="ይዘቱን እጠፍ / ወደ ሲኒማ እይታ ሂድ"
                            >
                              <i className="fa-solid fa-chevron-right text-[9px]"></i>
                              <span>እጠፍ</span>
                            </button>
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
                                                            updateUrlState({ view: 'classroom', courseId: activeCourse?.id, lesson: lidx });
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
                )}

            </div>
          </div>
        )}
        </>
      )}

        {currentView === 'courses' && (
          <div className="max-w-7xl mx-auto py-10">
            {/* 🌟 Referral Incentive Banner in My Courses */}
            <div 
              onClick={() => setCurrentView('referrals')}
              className="mb-8 p-5 sm:p-6 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-[#f9b03c]/10 to-blue-500/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:border-[#f9b03c] transition-all group shadow-lg shadow-black/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#f9b03c] text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-md group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-gift"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#f9b03c] px-2.5 py-0.5 rounded-full bg-[#f9b03c]/20 border border-[#f9b03c]/30">
                    ልዩ እድል • Refer & Earn
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-dark dark:text-white font-heading mt-1">
                    5 ጓደኞችዎን በመጋበዝ የሚቀጥለውን ኮርስ በነፃ ይውሰዱ!
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    የግል ሊንክዎን ያጋሩ፤ 5 ተማሪ ሲመዘገብ 1 ነፃ ኮርስ፣ 10 ሲመዘገብ 1-on-1 Mentorship ያገኛሉ።
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentView('referrals'); }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-black text-xs transition shadow-md group-hover:brightness-110 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <span>ጓደኛ ይጋብዙ</span>
                <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>

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
                      updateUrlState({ view: 'classroom', courseId: course.id, lesson: 0 });
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
                     <button onClick={handleGoToQa} className="text-xs bg-primary text-dark font-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition shadow-xs cursor-pointer">
                         <i className="fa-solid fa-plus mr-1"></i> አዲስ ጥያቄ ጠይቅ
                     </button>
                 </div>

                 <div className="space-y-4">
                     {studentTickets.length === 0 ? (
                         <div className="text-center py-16 bg-gray-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                             <i className="fa-solid fa-envelope-open-text text-5xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
                             <h3 className="text-base font-bold text-dark dark:text-white mb-1">ምንም የተላከ መልዕክት የለም</h3>
                             <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">በመማሪያ ክፍሉ (Classroom) ሆነው ለኮርሱ አስተማሪ የላኳቸው ጥያቄዎች እና የተሰጡ ምላሾች እዚህ ይገኛሉ።</p>
                             <button onClick={handleGoToQa} className="bg-primary text-dark font-black px-5 py-2.5 rounded-xl hover:bg-yellow-400 text-xs transition cursor-pointer">
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
             {/* Hidden File Input for Image Attachment */}
             <input 
               ref={aiFileInputRef}
               type="file"
               accept="image/*"
               onChange={handleAiImageUpload}
               className="hidden"
             />

             <div className="relative bg-white dark:bg-[#070b14]/95 backdrop-blur-3xl rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col h-[calc(100vh-170px)] min-h-[560px] overflow-hidden">
                 
                 {/* Subtle Glowing Background Mesh & Luxury Wallpaper Pattern */}
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,176,60,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(50,104,186,0.12),transparent_50%)] pointer-events-none" />
                 <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                 {/* 🛡️ Custom Sleek Branded Confirmation Modal */}
                 {showDashboardClearAiModal && (
                   <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                     <div className="relative bg-white dark:bg-[#0b1222] border border-gray-200 dark:border-white/20 rounded-3xl p-6 w-full max-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center space-y-4 animate-in zoom-in-95 duration-200">
                       <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 text-2xl flex items-center justify-center mx-auto border border-red-500/30 shadow-inner">
                         <i className="fa-solid fa-trash-can"></i>
                       </div>
                       <div>
                         <h4 className="font-heading font-black text-dark dark:text-white text-base">ታሪክ ማጽዳት ይፈልጋሉ?</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            የአሁኑ የውይይት ታሪክ ወደ <span className="text-[#f9b03c] font-bold">የ 15 ቀናት ቆሻሻ መጣያ (Trash)</span> ይዛወራል።
                          </p>
                       </div>
                       <div className="flex items-center gap-2.5 pt-1">
                         <button
                           type="button"
                           onClick={() => setShowDashboardClearAiModal(false)}
                           className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 font-bold text-xs transition cursor-pointer active:scale-95"
                         >
                           ተመለስ
                         </button>
                         <button
                           type="button"
                           onClick={performClearAiChat}
                           className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-black text-xs transition shadow-lg shadow-red-500/30 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                         >
                           <i className="fa-solid fa-trash-can text-xs"></i>
                           <span>አጥፋ</span>
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

                  {/* 🗑️ 15-Day Recycle Bin Modal (Restore & Auto-Purge Manager) */}
                  {showAiTrashModal && (
                    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                      <div className="relative bg-white dark:bg-[#0b1222] border border-gray-200 dark:border-white/20 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#f9b03c]/15 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center text-lg">
                              <i className="fa-solid fa-recycle"></i>
                            </div>
                            <div>
                              <h4 className="font-heading font-black text-dark dark:text-white text-base">የቆሻሻ መጣያ (የ 15 ቀናት ማቆያ)</h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">የተሰረዙ ውይይቶች ለ 15 ቀናት ተቀምጠው በራሳቸው ይጠፋሉ።</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAiTrashModal(false)}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-dark dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                          >
                            <i className="fa-solid fa-xmark text-sm"></i>
                          </button>
                        </div>

                        {/* Trash Items List */}
                        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
                          {aiTrashList.length === 0 ? (
                            <div className="text-center py-12 px-4 space-y-2">
                              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center mx-auto text-xl">
                                <i className="fa-solid fa-folder-open"></i>
                              </div>
                              <p className="text-sm font-bold text-dark dark:text-white">በቆሻሻ መጣያው ውስጥ ምንም ውይይት የለም</p>
                              <p className="text-xs text-gray-400">የሚያጸዷቸው ውይይቶች እዚህ ለ 15 ቀናት ተቀምጠው ይቆያሉ።</p>
                            </div>
                          ) : (
                            aiTrashList.map((item) => {
                              const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                              return (
                                <div key={item.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 hover:border-[#f9b03c]/40 transition-all space-y-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#3268ba]/15 text-[#5a93e8] border border-[#3268ba]/30">
                                        {item.courseTitle || 'አጠቃላይ'}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-medium">
                                        {new Date(item.deletedAt).toLocaleDateString('am-ET')}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-black text-[#f9b03c] bg-[#f9b03c]/10 border border-[#f9b03c]/25 px-2 py-0.5 rounded-full">
                                      ⏳ ከ {daysLeft} ቀን በኋላ ይጠፋል
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                                    "{item.preview}"
                                  </p>

                                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-white/5">
                                    <span className="text-[10px] text-gray-400 font-medium">
                                      {item.messages.length} መልዕክቶች
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTrashItem(item.id)}
                                        className="text-[11px] text-red-500 hover:text-red-600 dark:hover:text-red-400 font-bold px-2 py-1 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                                      >
                                        በቋሚነት አጥፋ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreTrashChat(item)}
                                        className="text-[11px] bg-[#f9b03c] hover:bg-[#e59b2b] text-slate-950 font-black px-3 py-1 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                                      >
                                        <i className="fa-solid fa-rotate-left text-[10px]"></i>
                                        <span>ወደ ቻት መልስ</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Modal Footer Toolbar */}
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-3 mt-2">
                          {aiTrashList.length > 0 ? (
                            <button
                              type="button"
                              onClick={handleEmptyTrash}
                              className="text-xs text-red-500 hover:text-red-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                              <span>ሁሉንም ባዶ አድርግ</span>
                            </button>
                          ) : <div />}
                          <button
                            type="button"
                            onClick={() => setShowAiTrashModal(false)}
                            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-xs font-bold text-dark dark:text-white transition cursor-pointer"
                          >
                            ዝጋ
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                 {/* Top Header with Course Specialization Indicator */}
                 <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-4 mb-3">
                     <div className="flex items-center gap-3">
                         <div className="relative">
                           <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(249,176,60,0.4)] border border-white/20">
                               <i className="fa-solid fa-robot"></i>
                           </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#f9b03c] border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-[0_0_8px_#f9b03c]"></span>
                         </div>
                         <div>
                             <div className="flex items-center gap-2">
                               <h2 className="text-base sm:text-lg font-black font-heading text-dark dark:text-white">Tsehay AI Tutor</h2>
                               <span className="bg-[#f9b03c]/20 text-amber-800 dark:text-[#f9b03c] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-[#f9b03c]/30 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#f9b03c] animate-ping"></span>
                                 <span>24/7 LIVE</span>
                               </span>
                             </div>
                             <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                               {selectedAiCourse ? `የትኩረት መስክ: ${selectedAiCourse.title}` : 'አጠቃላይ የትምህርት AI ረዳት (General Campus AI)'}
                             </p>
                         </div>
                     </div>

                     {/* Course Selector Dropdown & Clear Chat Action */}
                     <div className="flex items-center gap-2">
                       <select
                         value={selectedAiCourse?.id || ''}
                         onChange={(e) => {
                           const cId = e.target.value;
                           const match = courses.find(c => c.id === cId);
                           setSelectedAiCourse(match || null);
                         }}
                         className="bg-gray-100 dark:bg-slate-800 text-xs font-bold text-dark dark:text-[#f9b03c] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 outline-none focus:border-[#f9b03c] transition max-w-[200px] truncate cursor-pointer"
                       >
                         <option value="" className="bg-white dark:bg-slate-900 text-dark dark:text-white">🌐 አጠቃላይ (General Campus AI)</option>
                         {courses.map(c => (
                           <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-dark dark:text-white">
                             📚 {c.title}
                           </option>
                         ))}
                       </select>

                        {/* Subtle 15-Day Trash / Recycle Bin Icon Button */}
                        <button 
                          type="button"
                          onClick={() => setShowAiTrashModal(true)} 
                          className="relative text-xs bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold px-2.5 sm:px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-white/10"
                          title="የቆሻሻ መጣያ (የ 15 ቀናት ማቆያ)"
                        >
                          <i className="fa-solid fa-recycle text-[#f9b03c] text-xs"></i>
                          <span className="hidden md:inline">ቆሻሻ መጣያ</span>
                          {aiTrashList.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-[#f9b03c] text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs">
                              {aiTrashList.length}
                            </span>
                          )}
                        </button>
                       <button 
                         onClick={handleClearAiChat} 
                         className="text-xs bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold px-3 py-1.5 rounded-xl hover:bg-red-100 transition shrink-0 cursor-pointer flex items-center gap-1"
                         title="ታሪክ አፅዳ"
                       >
                         <i className="fa-solid fa-trash-can text-xs"></i>
                         <span className="hidden sm:inline">አፅዳ</span>
                       </button>
                     </div>
                 </div>

                 {/* Chat Messages Body */}
                 <div className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-50/80 dark:bg-slate-950/60 rounded-2xl border border-gray-100 dark:border-white/5">
                     {chatMessages.map((m: any, i: number) => {
                       const isUser = m.role === 'user';
                       return (
                         <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                             <div className="flex items-end gap-2 max-w-[92%] sm:max-w-[84%]">
                               {!isUser && (
                                 <div className="w-7 h-7 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0 mb-1 text-xs">
                                   <i className="fa-solid fa-robot"></i>
                                 </div>
                               )}

                               <div className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm break-words ${
                                 isUser 
                                   ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-bold rounded-br-none shadow-[0_4px_20px_rgba(249,176,60,0.2)]' 
                                   : 'bg-white dark:bg-[#0c1222] dark:text-slate-100 text-slate-900 shadow-sm rounded-bl-none border border-gray-200 dark:border-white/10 font-normal'
                               }`}>
                                   {/* Render attached image inside bubble if present */}
                                   {m.image && (
                                     <div className="mb-2.5 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
                                       <img src={m.image} alt="User Upload" className="w-full max-h-56 object-cover cursor-pointer hover:scale-105 transition-transform" />
                                     </div>
                                   )}

                                   {/* Rich Formatted AI / User Message */}
                                   {isUser ? (
                                     <div className="whitespace-pre-wrap font-body">
                                       {m.text}
                                     </div>
                                   ) : (
                                     <FormattedAiText text={m.text} isUser={false} />
                                   )}

                                   <div className={`flex items-center justify-end gap-1 mt-2 text-[10px] ${isUser ? 'text-slate-900/80 font-bold' : 'text-gray-400'}`}>
                                     <span>{m.timestamp || 'አሁን'}</span>
                                     {isUser && <i className="fa-solid fa-check-double text-[10px] text-slate-900"></i>}
                                   </div>
                               </div>
                             </div>

                             {/* Action buttons under AI response */}
                             {!isUser && i > 0 && (
                                 <div className="flex items-center gap-2 mt-1.5 ml-9 flex-wrap">
                                     <button
                                         onClick={() => {
                                             navigator.clipboard.writeText(m.text);
                                             setCopiedMsgIdx(i);
                                             setTimeout(() => setCopiedMsgIdx(null), 2000);
                                         }}
                                         className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 flex items-center gap-1 transition cursor-pointer"
                                     >
                                         <i className={`fa-solid ${copiedMsgIdx === i ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                                         <span>{copiedMsgIdx === i ? '✓ ተገልብጧል' : 'ኮፒ'}</span>
                                     </button>

                                      <button 
                                          onClick={async () => {
                                              const noteId = await handleSaveNote(m.text);
                                              setSavedAiNotes(prev => ({ ...prev, [i]: true }));
                                              if (noteId) {
                                                  setSavedAiNoteIds(prev => ({ ...prev, [i]: noteId }));
                                              }
                                          }} 
                                          className={`text-[11px] font-black px-3 py-1 rounded-lg border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                                              savedAiNotes[i]
                                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                                                  : "bg-amber-400/20 hover:bg-amber-400 dark:bg-amber-500/20 dark:hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-dark border-amber-400/40"
                                          }`}
                                      >
                                          <i className={`fa-solid ${savedAiNotes[i] ? "fa-circle-check text-emerald-600 dark:text-emerald-400" : "fa-bookmark text-[10px]"}`}></i> 
                                          <span>{savedAiNotes[i] ? "✓ ወደ ማስታወሻ ተመዝግቧል" : "ወደ ማስታወሻ አድ አድርግ"}</span>
                                      </button>

                                      {savedAiNotes[i] && (
                                          <button
                                              onClick={() => handleViewSavedNote(savedAiNoteIds[i])}
                                              className="text-[11px] font-bold text-secondary dark:text-primary hover:underline flex items-center gap-1.5 cursor-pointer bg-primary/15 hover:bg-primary/25 px-2.5 py-1 rounded-lg border border-primary/30 transition-all duration-150 active:scale-95 shadow-xs"
                                          >
                                              <span>ማስታወሻዎችን እይ</span>
                                              <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                          </button>
                                      )}
                                 </div>
                             )}
                         </div>
                       );
                     })}

                     {isChatLoading && (
                         <div className="flex items-center gap-2 ml-2 text-xs">
                             <div className="w-7 h-7 rounded-xl bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0">
                               <i className="fa-solid fa-robot text-xs animate-spin"></i>
                             </div>
                             <div className="bg-white dark:bg-[#0c1222] border border-gray-200 dark:border-white/10 rounded-2xl p-3.5 shadow-sm flex items-center gap-2 rounded-bl-none">
                                 <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce"></div>
                                 <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                 <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                 <span className="text-[11px] font-bold text-[#f9b03c] ml-1">Tsehay AI እየጻፈ ነው...</span>
                             </div>
                         </div>
                     )}
                     <div ref={chatEndRef} />
                 </div>

                 {/* Live Attached Image Thumbnail Preview */}
                 {aiAttachedImage && (
                   <div className="relative z-10 px-4 py-2 bg-gray-100 dark:bg-[#0c1326] border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-1 my-1">
                     <div className="flex items-center gap-2.5">
                       <img src={aiAttachedImage} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-[#f9b03c]/50 shadow-sm" />
                       <div className="text-xs">
                         <span className="font-bold text-dark dark:text-white block">ፎቶ ተያይዟል (Attached Photo)</span>
                         <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ ለ AIው ትንታኔ ተዘጋጅቷል</span>
                       </div>
                     </div>
                     <button 
                       onClick={() => setAiAttachedImage(null)}
                       className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                       title="ፎቶውን አስወግድ"
                     >
                       <i className="fa-solid fa-xmark"></i>
                     </button>
                   </div>
                 )}

                 {/* Quick Action Suggestion Chips (Hidden when recording voice) */}
                 {!isAiVoiceRecording && (
                   <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                       {[
                         { label: '💡 የኮርስ ማጠቃለያ', prompt: selectedAiCourse ? `የ"${selectedAiCourse.title}" ኮርስ ዋና ዋና ነጥቦችን አጠቃልልልኝ` : 'የኮርሶቹን ዋና ዋና ጥቅሞች አጠቃልልልኝ' },
                         { label: '🚀 የተግባር እርምጃዎች', prompt: selectedAiCourse ? `በ"${selectedAiCourse.title}" የተማርነውን በኢትዮጵያ ውስጥ በተግባር እንዴት ልተግብረው?` : 'የተማርኩትን ወደ ተግባራዊ ገቢ እንዴት እቀይረዋለሁ?' },
                         { label: '❓ ለጀማሪ አብራራልኝ', prompt: 'ያልገባኝን ነገር በቀላል እና ግልጽ በሆነ አማርኛ ደረጃ በደረጃ አብራራልኝ' },
                         { label: '📝 የፈተና ጥያቄ አዘጋጅልኝ', prompt: 'እውቀቴን ለመፈተሽ 3 ተግባራዊ ጥያቄዎችን አዘጋጅተህ ጠይቀኝ' }
                       ].map((item, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => handleSendAiMessage(undefined, item.prompt)}
                           className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-[#f9b03c] dark:hover:bg-[#f9b03c] hover:text-slate-950 dark:hover:text-slate-950 px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                         >
                           {item.label}
                         </button>
                       ))}
                   </div>
                 )}

                 {/* 🌟 UNIFIED SINGLE BOTTOM CONTROLS DOCK (No duplicates) */}
                 {isAiVoiceRecording ? (
                   /* 🎙️ Single Sleek Voice Recording Capsule */
                   <div className="relative z-10 px-4 py-3 bg-gradient-to-r from-red-950/90 via-[#180a22] to-amber-950/90 border border-red-500/40 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                     <div className="flex items-center gap-2.5 min-w-0 flex-1">
                       <span className="relative flex h-3.5 w-3.5 shrink-0">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
                       </span>
                       <div className="flex flex-col min-w-0">
                         <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                           <span>ድምፅዎን እያዳመጥኩ ነው...</span>
                           <span className="text-[11px] bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full border border-red-500/40 font-mono">
                             {aiRecordingSeconds}s
                           </span>
                         </span>
                         <span className="text-[11px] text-gray-300 truncate">
                           {chatInput || aiVoiceTranscriptRef.current || 'እየተናገሩ... ሲጨርሱ "ላክ" የሚለውን ይጫኑ'}
                         </span>
                       </div>
                     </div>

                     <div className="flex items-center gap-2 shrink-0">
                       <button 
                         type="button"
                         onClick={() => stopAiVoiceRecording(false)}
                         className="h-10 px-3.5 rounded-2xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 text-xs font-bold transition active:scale-95 cursor-pointer border border-white/10"
                         title="ድምፁን ሰርዝ"
                       >
                         <i className="fa-solid fa-xmark mr-1"></i>
                         <span>ሰርዝ</span>
                       </button>
                       
                       <button 
                         type="button"
                         onClick={() => stopAiVoiceRecording(true)}
                         className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#f9b03c] via-amber-400 to-yellow-300 hover:brightness-110 text-slate-950 text-xs font-black transition cursor-pointer shadow-[0_0_20px_rgba(249,176,60,0.6)] flex items-center gap-1.5 active:scale-95"
                         title="ድምፁን ላክ"
                       >
                         <i className="fa-solid fa-paper-plane text-xs"></i>
                         <span>ላክ</span>
                       </button>
                     </div>
                   </div>
                 ) : (
                   /* ✍️ Clean Single Input Bar (Photo, Text Input, Microphone / Send) */
                   <form onSubmit={(e) => handleSendAiMessage(e)} className="relative z-10 flex items-center gap-2">
                       {/* Photo Upload Button */}
                       <button
                         type="button"
                         onClick={() => aiFileInputRef.current?.click()}
                         className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 hover:text-[#f9b03c] border border-gray-200 dark:border-white/15 flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0"
                         title="ፎቶ / ስክሪንሾት አያይዝ"
                       >
                         <i className="fa-solid fa-paperclip text-sm"></i>
                       </button>

                       <input 
                           type="text" 
                           value={chatInput}
                           onChange={e => setChatInput(e.target.value)}
                           placeholder={selectedAiCourse ? `ስለ ${selectedAiCourse.title} ለ Tsehay AI ጥያቄዎን እዚህ ይጻፉ...` : "ለ Tsehay AI ማንኛውንም ጥያቄ እዚህ ይጻፉ..."}
                           className="flex-1 bg-gray-50 dark:bg-slate-950/80 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3 text-xs sm:text-sm outline-none focus:border-[#f9b03c] text-dark dark:text-white placeholder-gray-400 transition"
                       />

                       {/* Dynamic Action: Send button if text/image exists, else Microphone Voice button */}
                       {chatInput.trim() || aiAttachedImage ? (
                         <button 
                             type="submit" 
                             disabled={isChatLoading}
                             className="px-5 sm:px-6 h-11 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md active:scale-90 bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(249,176,60,0.4)] hover:brightness-110"
                             title="መልዕክት ላክ"
                         >
                             {isChatLoading ? (
                               <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                             ) : (
                               <>
                                 <i className="fa-solid fa-paper-plane text-xs"></i>
                                 <span>ላክ</span>
                               </>
                             )}
                         </button>
                       ) : (
                         <button
                           type="button"
                           onClick={() => startAiVoiceRecording()}
                           className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#f9b03c]/20 to-amber-500/30 hover:from-[#f9b03c] hover:to-amber-400 text-[#f9b03c] hover:text-slate-950 border border-[#f9b03c]/40 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(249,176,60,0.2)]"
                           title="በድምፅ ተናገር (Speak via Voice)"
                         >
                           <i className="fa-solid fa-microphone text-sm"></i>
                         </button>
                       )}
                   </form>
                 )}
             </div>
          </div>
        )}

        {currentView === 'certificates' && (
          <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black font-heading text-dark dark:text-white">
                  የምስክር ወረቀቶች (Earned Certificates)
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
                  በፀሐይ ካምፓስ ያጠናቀቋቸው እና ያገኟቸው ይፋዊ ሰርተፍኬቶች
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-500 px-4 py-2 rounded-2xl text-xs font-black">
                <i className="fa-solid fa-award text-base"></i>
                <span>{Object.keys(passedQuizzes).length} ሰርተፍኬት ተገኝቷል</span>
              </div>
            </div>

            {Object.keys(passedQuizzes).length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto">
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-primary text-3xl">
                  <i className="fa-solid fa-award"></i>
                </div>
                <h3 className="text-xl font-black font-heading text-dark dark:text-white">እስካሁን ያጠናቀቁት ኮርስ የለም</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                  የምስክር ወረቀት ለማግኘት የተመዘገቡባቸውን ኮርሶች አጠናቀው የኮርስ ማጠቃለያ ፈተናዎችን በ 80%+ ውጤት ይለፉ።
                </p>
                <button
                  onClick={() => {
                    setCurrentView('classroom');
                    setActiveTab('quiz');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-dark font-black text-xs sm:text-sm rounded-xl shadow-md hover:scale-105 transition cursor-pointer"
                >
                  🚀 ወደ መማሪያ ክፍል ይሂዱ
                </button>
              </div>
            ) : (
              <div className="space-y-10">
                {courses
                  .filter(c => passedQuizzes[c.id])
                  .map(course => (
                    <div key={course.id} className="space-y-4">
                      <h3 className="font-heading font-black text-lg text-dark dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-circle-check text-emerald-500"></i>
                        <span>{course.title}</span>
                      </h3>
                      <CourseCertificate
                        course={course}
                        user={user}
                        score={passedQuizzes[course.id]?.score || 90}
                        issueDate={passedQuizzes[course.id]?.passedAt}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 🌟 Refer a Friend (ALX Growth Program View) */}
        {currentView === 'referrals' && (
          <div className="py-6">
            <StudentReferralSection 
              courses={courses} 
              onCourseUnlocked={(unlockedId) => {
                try {
                  const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user?.uid || '', 'purchased_courses', unlockedId);
                  getDoc(userRef).then(snap => {
                    if (snap.exists()) {
                      setCourses(prev => [...prev.filter(c => c.id !== unlockedId), { id: unlockedId, ...snap.data() }]);
                    }
                  }).catch(() => {});
                } catch (e) {}
              }}
            />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="max-w-2xl mx-auto py-8 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/80 pb-4">
              <div>
                <h2 className="text-2xl font-black text-dark dark:text-white font-heading">የመገለጫ ማስተካከያ (Profile Settings)</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">የግል መረጃዎን፣ የመገለጫ ፎቶዎን እና የይለፍ ቃልዎን እዚህ ያስተካክሉ</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-lg shadow-sm">
                <i className="fa-solid fa-user-gear"></i>
              </div>
            </div>

            {profileMessage && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in duration-200 ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
              }`}>
                <i className={`fa-solid ${profileMessage.type === 'success' ? 'fa-circle-check text-emerald-500 text-base' : 'fa-circle-exclamation text-red-500 text-base'}`}></i>
                <span>{profileMessage.text}</span>
              </div>
            )}

            {/* Profile Photo Management Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/70 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <i className="fa-solid fa-camera text-primary"></i>
                  <span>የመገለጫ ፎቶ (Profile Photo)</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">JPG, PNG ወይም አቫታር</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Interactive Avatar Preview */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-md bg-white dark:bg-slate-800">
                    <img 
                      src={studentPhotoUrl} 
                      alt={studentDisplayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentDisplayName)}&background=f9b03c&color=111827&bold=true`;
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-xs font-bold"
                  >
                    <i className="fa-solid fa-camera text-base mb-1"></i>
                    <span>ቀይር</span>
                  </button>
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                </div>

                {/* Upload & Action Buttons */}
                <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <input 
                      type="file" 
                      ref={profileFileInputRef}
                      onChange={handleProfilePhotoUpload}
                      accept="image/png, image/jpeg, image/webp, image/gif" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => profileFileInputRef.current?.click()}
                      className="px-4 py-2 bg-primary hover:bg-yellow-400 text-dark font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      <span>ፎቶ ይጫኑ (Upload Photo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPresets(prev => !prev)}
                      className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-300 dark:border-slate-700"
                    >
                      <i className="fa-solid fa-masks-theater text-primary"></i>
                      <span>አቫታር ይምረጡ</span>
                    </button>
                    {settingsPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsPhotoUrl('');
                          setProfileMessage({ type: 'success', text: 'ፎቶው ተሰርዟል! ወደ ነባሪው አቫታር ተመልሷል። "አዘምን" የሚለውን ይጫኑ።' });
                        }}
                        className="px-3 py-2 text-red-500 hover:bg-red-500/10 text-xs font-bold rounded-xl transition cursor-pointer"
                        title="ፎቶውን አስወግድ"
                      >
                        <i className="fa-solid fa-trash-can mr-1"></i>
                        <span>አስወግድ</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    የተማሪዎን መለያ ይበልጥ ፕሮፌሽናል ለማድረግ ፎቶዎን ወይም ከታች ካሉት አቫታሮች አንዱን ይምረጡ።
                  </p>
                </div>
              </div>

              {/* Avatar Presets Grid */}
              {showAvatarPresets && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2.5">
                    የሚፈልጉትን አቫታር ይንኩ፦
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setSettingsPhotoUrl(av.url);
                          setProfileMessage({ type: 'success', text: `"${av.label}" አቫታር ተመርጧል! "አዘምን (Save Changes)" የሚለውን ይጫኑ።` });
                        }}
                        className={`group relative p-1 rounded-2xl border-2 transition-all duration-200 hover:scale-105 flex flex-col items-center cursor-pointer ${
                          settingsPhotoUrl === av.url 
                            ? 'border-primary bg-primary/10 shadow-sm' 
                            : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-10 h-10 rounded-full object-cover" />
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mt-1 truncate max-w-full">
                          {av.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-user text-primary text-xs"></i>
                  <span>ሙሉ ስም (Full Name)</span>
                </label>
                <input 
                  type="text" 
                  value={settingsName} 
                  onChange={(e) => setSettingsName(e.target.value)} 
                  placeholder="ሙሉ ስምዎን ያስገቡ (ለምሳሌ፦ ኢዮብ ሳህሌ)"
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-dark dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-phone text-primary text-xs"></i>
                  <span>ስልክ ቁጥር (Phone Number)</span>
                </label>
                <input 
                  type="tel" 
                  value={settingsPhone} 
                  onChange={(e) => setSettingsPhone(e.target.value)} 
                  placeholder="ስልክ ቁጥርዎን ያስገቡ"
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-dark dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-location-dot text-primary text-xs"></i>
                  <span>ከተማ / አድራሻ (City / Location)</span>
                </label>
                <input 
                  type="text" 
                  value={settingsCity} 
                  onChange={(e) => setSettingsCity(e.target.value)} 
                  placeholder="ከተማ ወይም ሀገር ያስገቡ (ለምሳሌ፦ አዲስ አበባ)"
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-dark dark:text-white text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-primary text-xs"></i>
                  <span>ኢሜይል (Email Address)</span>
                </label>
                <input 
                  type="email" 
                  readOnly 
                  className="w-full p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed font-medium select-none" 
                  value={settingsEmail || user?.email || ''} 
                />
              </div>
              <button 
                onClick={handleUpdateProfile} 
                disabled={isUpdatingProfile} 
                className="w-full px-6 py-3.5 bg-gradient-to-r from-amber-400 via-primary to-yellow-400 text-dark font-black rounded-xl hover:brightness-105 active:scale-[0.99] transition shadow-md flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                  {isUpdatingProfile ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>} 
                  <span>{isUpdatingProfile ? 'በማዘመን ላይ...' : 'አዘምን (Save Changes)'}</span>
              </button>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/80 space-y-3">
                  <h3 className="font-bold text-base text-dark dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-key text-primary"></i>
                    <span>የይለፍ ቃል ቀይር (Reset Password)</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">የይለፍ ቃልዎን ለመቀየር ከታች ያለውን ቁልፍ ሲጫኑ የማስተካከያ ሊንክ ወደ ኢሜልዎ ይላካል።</p>
                  
                  {passwordResetMessage && (
                    <div className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in duration-200 ${
                      passwordResetMessage.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                    }`}>
                      <i className={`fa-solid ${passwordResetMessage.type === 'success' ? 'fa-circle-check text-emerald-500' : 'fa-circle-exclamation text-red-500'}`}></i>
                      <span>{passwordResetMessage.text}</span>
                    </div>
                  )}

                  <button 
                    onClick={handlePasswordReset} 
                    className="w-full px-6 py-3 bg-white dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 text-dark dark:text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                      <i className="fa-solid fa-paper-plane text-xs text-primary"></i>
                      <span>የይለፍ ቃል መቀየሪያ ኢሜይል ላክ (Send Reset Link)</span>
                  </button>
              </div>

              {/* Account Security & Sign Out Section */}
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/80 space-y-3">
                  <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>ከአካውንት መውጫ (Sign Out)</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">የካምፓስ መማሪያ ክፍሉን አጠናቀው ለመውጣት ይህንን ይጫኑ።</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full sm:w-auto px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {isLoggingOut ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right-from-bracket"></i>}
                      <span>{isLoggingOut ? 'በመውጣት ላይ...' : 'ከአካውንቴ ውጣ (Log Out)'}</span>
                    </button>
                  </div>
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
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
              {/* Hidden File Input for Lesson AI Image Attachment */}
              <input 
                ref={lessonFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLessonImageUpload}
                className="hidden"
              />

              <div className="relative bg-[#070b14]/95 backdrop-blur-3xl border border-white/15 text-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                  {/* Subtle Wallpaper Pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,176,60,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(50,104,186,0.12),transparent_50%)] pointer-events-none" />
                  <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Header */}
                  <div className="relative z-10 p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-[#0b1329] via-[#0f1b38] to-[#0b1329] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f9b03c] via-amber-400 to-yellow-200 text-slate-950 flex items-center justify-center text-lg font-black shadow-[0_0_15px_rgba(249,176,60,0.4)]">
                              <i className="fa-solid fa-robot"></i>
                          </div>
                          <div>
                              <h4 className="font-black text-sm sm:text-base flex items-center gap-2">
                                <span>ስለዚህ ትምህርት Tsehay AI ን ይጠይቁ</span>
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-black">ACTIVE</span>
                              </h4>
                              <p className="text-[11px] text-[#f9b03c] font-bold truncate max-w-xs sm:max-w-sm">
                                  📚 {activeLesson?.title || activeCourse?.title}
                              </p>
                          </div>
                      </div>
                      <button
                          onClick={() => setShowLessonAiModal(false)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500 text-gray-400 hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
                          title="ዝጋ (Close)"
                      >
                          ✕
                      </button>
                  </div>

                  {/* Chat Body */}
                  <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3 min-h-[260px] max-h-[420px] bg-[#050811]/60">
                      {lessonAiMessages.length === 0 ? (
                          <div className="text-center py-8 text-gray-300 space-y-3">
                              <div className="w-14 h-14 rounded-3xl bg-[#f9b03c]/10 text-[#f9b03c] mx-auto flex items-center justify-center text-2xl border border-[#f9b03c]/20 shadow-inner">
                                <i className="fa-solid fa-wand-magic-sparkles animate-pulse"></i>
                              </div>
                              <p className="text-xs sm:text-sm font-bold">ስለዚህ ሌሰን ያልገባዎትን ነገር ወይም ጥያቄ ፀሐይን ይጠይቁ!</p>
                              <div className="flex flex-wrap gap-2 justify-center pt-2">
                                  <button
                                      onClick={() => handleAskLessonAi(`ይህንን ትምህርት ("${activeLesson?.title || activeCourse?.title}") በምሳሌ በአጭሩ አስረዳኝ።`)}
                                      className="text-[11px] font-bold bg-white/5 hover:bg-[#f9b03c] text-gray-200 hover:text-slate-950 border border-white/10 px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 cursor-pointer"
                                  >
                                      💡 በምሳሌ አስረዳኝ
                                  </button>
                                  <button
                                      onClick={() => handleAskLessonAi(`በዚህ ሌሰን ላይ የተማርነውን በገቢ ለመቀየር ምን ምን እርምጃዎችን መውሰድ አለብኝ?`)}
                                      className="text-[11px] font-bold bg-white/5 hover:bg-[#f9b03c] text-gray-200 hover:text-slate-950 border border-white/10 px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 cursor-pointer"
                                  >
                                      🚀 ተግባራዊ እርምጃዎች
                                  </button>
                              </div>
                          </div>
                      ) : (
                          lessonAiMessages.map((msg, idx) => {
                              const isUser = msg.role === 'user';
                              return (
                                <div
                                    key={idx}
                                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                >
                                    <div className="flex items-end gap-2 max-w-[88%]">
                                        {!isUser && (
                                          <div className="w-6 h-6 rounded-lg bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0 mb-1 text-[10px]">
                                            <i className="fa-solid fa-robot"></i>
                                          </div>
                                        )}
                                        <div
                                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm break-words ${
                                                isUser
                                                    ? 'bg-gradient-to-r from-[#f9b03c] to-amber-400 text-slate-950 font-bold rounded-br-none shadow-[0_4px_20px_rgba(249,176,60,0.2)]'
                                                    : 'bg-[#0f1629] text-gray-100 border border-white/10 rounded-bl-none font-body whitespace-pre-wrap'
                                            }`}
                                        >
                                            {/* Render attached image inside bubble if present */}
                                            {msg.image && (
                                              <div className="mb-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm">
                                                <img src={msg.image} alt="User Upload" className="w-full max-h-48 object-cover cursor-pointer" />
                                              </div>
                                            )}

                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                              );
                          })
                      )}
                      {isLessonAiLoading && (
                          <div className="flex items-center gap-2 ml-2 text-xs">
                              <div className="w-6 h-6 rounded-lg bg-[#f9b03c]/20 text-[#f9b03c] border border-[#f9b03c]/30 flex items-center justify-center shrink-0 text-[10px]">
                                <i className="fa-solid fa-robot animate-spin"></i>
                              </div>
                              <div className="bg-[#0f1629] p-3 rounded-2xl border border-white/10 rounded-bl-none flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce"></div>
                                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                  <div className="w-2 h-2 rounded-full bg-[#f9b03c] animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                  <span className="text-[11px] font-bold text-[#f9b03c] ml-1">Tsehay AI እያሰላሰለ ነው...</span>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Attached Image Preview inside Modal */}
                  {lessonAiAttachedImage && (
                    <div className="relative z-10 px-4 py-2 bg-[#0c1326] border-t border-white/10 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <img src={lessonAiAttachedImage} alt="Preview" className="w-10 h-10 object-cover rounded-xl border border-[#f9b03c]/50" />
                        <span className="text-xs font-bold text-white">📸 ፎቶ ተያይዟል</span>
                      </div>
                      <button 
                        onClick={() => setLessonAiAttachedImage(null)}
                        className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs cursor-pointer hover:bg-red-500 hover:text-white transition"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Voice Recording Waveform inside Modal */}
                  {isLessonVoiceRecording && (
                    <div className="relative z-10 px-4 py-2.5 bg-red-950/90 border-t border-red-500/30 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2 text-xs text-red-400 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        <span>ድምፅዎን እያዳመጥኩ ነው...</span>
                      </div>
                      <button 
                        onClick={stopLessonVoiceRecording}
                        className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        አቁም
                      </button>
                    </div>
                  )}

                  {/* Input Bar */}
                  <div className="relative z-10 p-3 bg-gradient-to-t from-[#060a14] to-[#0c1222] border-t border-white/10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => lessonFileInputRef.current?.click()}
                        className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-[#f9b03c] border border-white/15 flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0"
                        title="ፎቶ / ስክሪንሾት አያይዝ"
                      >
                        <i className="fa-solid fa-paperclip text-sm"></i>
                      </button>

                      <button
                        type="button"
                        onClick={isLessonVoiceRecording ? stopLessonVoiceRecording : startLessonVoiceRecording}
                        className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition active:scale-90 cursor-pointer shrink-0 ${
                          isLessonVoiceRecording 
                            ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                            : 'bg-white/5 hover:bg-white/15 text-gray-300 hover:text-[#f9b03c] border-white/15'
                        }`}
                        title={isLessonVoiceRecording ? "መቅዳት አቁም" : "በድምፅ ተናገር"}
                      >
                        <i className={`fa-solid ${isLessonVoiceRecording ? 'fa-stop' : 'fa-microphone'} text-sm`}></i>
                      </button>

                      <input
                          type="text"
                          value={lessonAiQuery}
                          onChange={(e) => setLessonAiQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAskLessonAi(); }}
                          placeholder="ስለዚህ ትምህርት ጥያቄዎን እዚህ ይፃፉ..."
                          className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 outline-none focus:border-[#f9b03c] transition"
                      />
                      <button
                          onClick={() => handleAskLessonAi()}
                          disabled={isLessonAiLoading || (!lessonAiQuery.trim() && !lessonAiAttachedImage)}
                          className="h-10 px-5 bg-gradient-to-r from-[#f9b03c] to-amber-400 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs transition disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-90 shrink-0"
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

export default function StudentDashboard() {
  return (
    <Suspense fallback={<DashboardLoadingScreen />}>
      <StudentDashboardContent />
    </Suspense>
  );
}
