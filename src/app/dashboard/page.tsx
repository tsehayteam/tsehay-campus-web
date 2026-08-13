'use client';
import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, setDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';
import FloatingAIButton from '@/components/FloatingAIButton';
import AssessmentModal from '@/components/AssessmentModal';

const ReactPlayer: any = dynamic(() => import('react-player'), { ssr: false });

import CourseRatingModal from '@/components/CourseRatingModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('classroom');
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [hasTakenQuiz, setHasTakenQuiz] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
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
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Notes State
  const [studentNotes, setStudentNotes] = useState<Array<{ id: string; text: string; createdAt: string; lessonTitle?: string }>>([]);
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
  
  const { t } = useLanguage();

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

  useEffect(() => {
    // Fetch courses for the student
    const fetchPurchasedCourses = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if returning from successful payment (LakiPay / PayPal)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const isSuccess = urlParams.get('success') === 'true';
          const targetCourseId = urlParams.get('course');
          const txRef = urlParams.get('reference') || urlParams.get('tx_ref') || '';
          if (isSuccess && targetCourseId) {
            try {
              await fetch('/api/confirm-enrollment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  courseId: targetCourseId,
                  userId: user.uid,
                  paymentMethod: 'lakipay',
                  tx_ref: txRef
                })
              });
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (confErr) {
              console.warn("Auto enrollment notice:", confErr);
            }
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
          if (data.notes && Array.isArray(data.notes)) {
            setStudentNotes(data.notes);
          } else {
            setStudentNotes([]);
          }
        }
      } catch (e) {
        console.error("Error loading user progress & notes:", e);
      }
    };
    fetchUserData();
  }, [activeCourse, user]);

  const handleSaveNote = async (textToSave?: string) => {
    const text = textToSave || noteInput;
    if (!text || !text.trim() || !user) return;

    const targetCourse = activeCourse || (courses && courses.length > 0 ? courses[0] : { id: 'general', title: 'ፀሐይ ካምፓስ' });

    const newNote = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: new Date().toLocaleString('am-ET', { dateStyle: 'medium', timeStyle: 'short' }),
      lessonTitle: activeLesson?.title || targetCourse?.title || 'Tsehay AI Note'
    };

    const updatedNotes = [newNote, ...studentNotes];
    setStudentNotes(updatedNotes);
    if (!textToSave) setNoteInput('');

    try {
      if (targetCourse?.id && targetCourse.id !== 'general') {
        const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', targetCourse.id);
        await setDoc(userRef, { notes: updatedNotes }, { merge: true });
      }
      const globalNotesRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'notes', 'all_notes');
      await setDoc(globalNotesRef, { list: updatedNotes }, { merge: true });

      setNoteSavedMessage("ማስታወሻዎ በተሳካ ሁኔታ ተመዝግቧል!");
      setTimeout(() => setNoteSavedMessage(""), 3000);
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeCourse || !user) return;
    const updatedNotes = studentNotes.filter(n => n.id !== noteId);
    setStudentNotes(updatedNotes);
    try {
      const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', activeCourse.id);
      await setDoc(userRef, { notes: updatedNotes }, { merge: true });
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  useEffect(() => {
    const handleGlobalAddToNotes = (e: any) => {
      if (e.detail?.text) {
        handleSaveNote(e.detail.text);
      }
    };
    window.addEventListener('add-to-notes', handleGlobalAddToNotes);
    return () => window.removeEventListener('add-to-notes', handleGlobalAddToNotes);
  }, [activeCourse, user, studentNotes, activeLesson]);

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

  useEffect(() => {
      const saved = localStorage.getItem('tsehay-ai-chat');
      if (saved) {
          try {
              setChatMessages(JSON.parse(saved));
          } catch (e) {}
      }
  }, []);

  useEffect(() => {
      if (chatMessages.length > 0) {
          localStorage.setItem('tsehay-ai-chat', JSON.stringify(chatMessages));
      }
  }, [chatMessages]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      const userMsg = chatInput.trim();
      const newMsgs = [...chatMessages, { role: 'user', text: userMsg }];
      setChatMessages(newMsgs);
      setChatInput('');
      setIsChatLoading(true);

      try {
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: userMsg })
          });
          const data = await response.json();
          const reply = data.reply || data.error || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።";
          setChatMessages([...newMsgs, { role: 'system', text: reply }]);
      } catch (error: any) {
          setChatMessages([...newMsgs, { role: 'system', text: "ይቅርታ፣ የሲስተም ችግር አጋጥሟል!" }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  useEffect(() => {
    if (!activeLesson || !activeCourse) return;
    setCurrentVideoPlayedFraction(0);
  }, [activeLesson?.title, activeCourse?.id]);

  const handleVideoProgress50 = async () => {
    if (!activeLesson || !activeCourse || !user) return;
    if (progress.includes(activeLesson.title)) return;

    const pointsToAward = activeLesson.points || 100;
    try {
        const userRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'purchased_courses', activeCourse.id);
        const userDoc = await getDoc(userRef);

        let newCompletedLessons = [...progress, activeLesson.title];
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
        console.error("Error updating points on 50% watch:", e);
    }
  };

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
                if (activeCourse?.id && !localStorage.getItem(`rated_course_${activeCourse.id}`)) {
                    setShowRatingModal(true);
                }
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
   - YouTube Secrets Masterclass / Book (600 ETB) for content creation, channel growth.
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

        <nav className="flex-1 overflow-x-auto md:overflow-y-auto py-3 md:py-6 px-3 space-y-0 md:space-y-1.5 font-body no-scrollbar w-full flex flex-row md:flex-col gap-2 md:gap-0 items-center md:items-stretch">
          <p className="hidden lg:block px-4 text-sm font-black text-secondary dark:text-primary uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-700/60 pb-1.5 font-heading">
            {t('main_menu')}
          </p>

          <button onClick={() => setCurrentView('classroom')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left text-sm ${currentView === 'classroom' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-play-circle text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('classroom')}</span>
          </button>
          
          <button onClick={() => setCurrentView('courses')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left text-sm ${currentView === 'courses' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-layer-group text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('my_courses')}</span>
          </button>

          <button onClick={() => setCurrentView('messages')} className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl font-bold transition flex-shrink-0 group w-auto md:w-full text-left text-sm ${currentView === 'messages' ? 'bg-blue-50 dark:bg-primary/10 text-secondary dark:text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-dark dark:hover:text-white'}`}>
            <i className="fa-solid fa-comments text-lg w-5 text-center group-hover:scale-110 transition-transform"></i>
            <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block">{t('messages')}</span>
          </button>

          <p className="hidden lg:block px-4 text-sm font-black text-secondary dark:text-primary uppercase tracking-widest mb-3 mt-6 border-b border-slate-100 dark:border-slate-700/60 pb-1.5 font-heading">
            {t('tools')}
          </p>

          <button 
            onClick={() => setCurrentView('ai')} 
            className={`relative flex items-center justify-between gap-2 md:gap-3 p-3 rounded-2xl font-black transition-all duration-300 flex-shrink-0 group w-auto md:w-full text-left text-sm border ${
              currentView === 'ai' 
                ? 'bg-secondary text-white border-secondary scale-[1.03] shadow-lg' 
                : 'bg-secondary/10 hover:bg-secondary/20 text-secondary dark:text-primary border-secondary/30 hover:scale-[1.03] shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <i className={`fa-solid fa-user-astronaut text-lg ${currentView === 'ai' ? 'text-primary' : 'text-secondary dark:text-primary'}`}></i>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full animate-ping"></span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
              </div>
              <span className="whitespace-nowrap md:whitespace-normal md:hidden lg:block font-heading font-black">Tsehay AI</span>
            </div>
            <span className="hidden lg:flex items-center gap-1 text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              ● Online
            </span>
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
                    <div className="bg-dark rounded-2xl overflow-hidden shadow-2xl relative border border-gray-800 aspect-video flex items-center justify-center">
                        {/* Video End Course Rating Overlay */}
                        {isCourseCompleted && activeCourse?.id && !localStorage.getItem(`rated_course_${activeCourse.id}`) && (
                          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                             <div className="w-16 h-16 bg-amber-400/20 text-primary rounded-full flex items-center justify-center text-3xl mb-4 border-2 border-primary animate-bounce">
                                 <i className="fa-solid fa-star"></i>
                             </div>
                             <h3 className="text-xl md:text-2xl font-black text-white font-heading mb-2">እንኳን ደስ አሎት! ኮርሱን አጠናቀዋል።</h3>
                             <p className="text-xs md:text-sm text-gray-300 mb-6 max-w-md">እባክዎ ለኮርሱ እና ለአስተማሪው ያለዎትን ሬቲንግ እና አስተያየት ይስጡ።</p>
                             <button 
                               onClick={() => setShowRatingModal(true)}
                               className="bg-primary text-dark font-black px-6 py-3 rounded-xl hover:bg-yellow-400 transition shadow-lg text-sm transform hover:scale-105"
                             >
                               ⭐ ሬቲንግ/ሪቪው ስጥ (Rate Course)
                             </button>
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
                                        key={cleanUrl}
                                        url={cleanUrl}
                                        width="100%"
                                        height="100%"
                                        controls={true}
                                        playing={true}
                                        onProgress={({ played }: { played: number }) => {
                                            setCurrentVideoPlayedFraction(played);
                                            if (played >= 0.5) {
                                                handleVideoProgress50();
                                            }
                                        }}
                                        onEnded={handleVideoEnd}
                                        className="absolute inset-0"
                                    />
                                );
                            }
                        })() || (
                            <>
                                <img src={(() => {
                                    const url = activeCourse?.image;
                                    if (!url) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200';
                                    const match = url.match(/(?:file\/d\/|id=|thumbnail\?id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
                                    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
                                    return url;
                                })()} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video cover" onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200';
                                }} />
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
                                        <div className="flex gap-4">
                                            <a 
                                                href={(() => {
                                                    const username = (activeCourse?.instructorTelegram || 'EyoubSahle').replace('@', '').trim();
                                                    return `https://t.me/${username}`;
                                                })()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="የመምህሩ ቴሌግራም (Instructor Telegram)"
                                                className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-[#26A5E4] flex items-center justify-center hover:bg-[#26A5E4] hover:text-white transition-all shadow-md transform hover:-translate-y-1"
                                            >
                                                <i className="fa-brands fa-telegram text-2xl"></i>
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
                                    
                                    <div className="mt-6 border-t border-gray-100 dark:border-slate-700 pt-6">
                                        <h3 className="font-black text-lg text-dark dark:text-white mb-4 font-heading">ዳውንሎድ የሚደረጉ ማቴሪያሎች</h3>
                                        <div className="flex flex-wrap gap-4">
                                            {activeCourse?.pdfUrl || activeLesson?.pdf ? (
                                                <a 
                                                    href={(() => {
                                                        const url = activeCourse?.pdfUrl || activeLesson?.pdf;
                                                        if (!url) return '#';
                                                        const match = url.match(/(?:file\/d\/|id=|\/d\/)([a-zA-Z0-9_-]{20,})/);
                                                        if (match && match[1]) {
                                                          return `https://drive.google.com/file/d/${match[1]}/view?usp=sharing`;
                                                        }
                                                        return url;
                                                    })()} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-3.5 rounded-xl border border-red-200 dark:border-red-800 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm group"
                                                >
                                                    <i className="fa-solid fa-file-pdf text-xl group-hover:scale-110 transition-transform"></i>
                                                    <div>
                                                        <p className="font-bold">{activeCourse?.pdfTitle || 'የኮርስ ማቴሪያል (Course PDF)'}</p>
                                                        <p className="text-xs opacity-75 font-normal">ለማየት / ለማውረድ እዚህ ይጫኑ (Click to View / Download)</p>
                                                    </div>
                                                    <i className="fa-solid fa-download ml-2 text-xs opacity-60"></i>
                                                </a>
                                            ) : (
                                                <div className="text-sm text-gray-500 italic bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700 w-full">
                                                    <i className="fa-solid fa-folder-open mr-2 text-gray-400"></i>
                                                    ለዚህ ኮርስ እስካሁን የተጫነ PDF ማቴሪያል የለም (No PDF materials uploaded for this course yet).
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
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
                                                    <div key={note.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm relative group hover:border-primary/50 transition">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-[11px] font-bold bg-primary/20 text-dark dark:text-primary px-2.5 py-0.5 rounded-full">
                                                                <i className="fa-solid fa-bookmark mr-1 text-[10px]"></i> {note.lessonTitle || activeCourse?.title}
                                                            </span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] text-gray-400">{note.createdAt}</span>
                                                                <button 
                                                                    onClick={() => handleDeleteNote(note.id)} 
                                                                    className="text-gray-400 hover:text-red-500 transition text-xs" 
                                                                    title="ሰርዝ (Delete Note)"
                                                                >
                                                                    <i className="fa-solid fa-trash-can"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-200 font-body leading-relaxed whitespace-pre-wrap">
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
                            {(() => {
                                let totalCount = 0;
                                modules.forEach((m: any) => { totalCount += (m.lessons || []).length; });
                                if (totalCount === 0) totalCount = 1;
                                
                                const lessonWeight = 100 / totalCount;
                                const completedBasePercent = (progress.length / totalCount) * 100;
                                const livePlayedAdded = currentVideoPlayedFraction * lessonWeight;
                                const percent = Math.min(100, Math.round(completedBasePercent + livePlayedAdded));

                                return (
                                    <>
                                        <div className="flex justify-between items-end mt-3 mb-1">
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">የኮርሱ ሂደት</p>
                                            <p className="text-sm text-secondary dark:text-primary font-black">{percent}%</p>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-success h-2 rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
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
                                                            if (isUnlocked) {
                                                                setActiveLesson({...lesson, moduleIndex: idx, lessonIndex: lidx});
                                                            } else {
                                                                alert("እባክዎ በመጀመሪያ ቀደሞ ያሉትን ትምህርቶች አጠናቅቁ (Please complete previous lessons first)");
                                                            }
                                                        }}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                                                            isActive 
                                                                ? 'bg-white dark:bg-slate-700 border-l-4 border-primary shadow-sm' 
                                                                : isUnlocked 
                                                                    ? 'hover:bg-white dark:hover:bg-slate-700/80 cursor-pointer' 
                                                                    : 'opacity-60 cursor-not-allowed bg-gray-100/50 dark:bg-slate-900/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isActive ? (
                                                                <i className="fa-solid fa-circle-play text-primary text-sm animate-pulse"></i>
                                                            ) : isCompleted ? (
                                                                <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                                                            ) : isUnlocked ? (
                                                                <i className="fa-solid fa-circle-play text-gray-400 text-xs"></i>
                                                            ) : (
                                                                <i className="fa-solid fa-lock text-gray-400 text-xs"></i>
                                                            )}
                                                            <div>
                                                                <p className={`text-xs font-bold ${isActive ? 'text-primary' : isUnlocked ? 'text-dark dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                    {lesson.title}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                                                                    <span><i className="fa-solid fa-video"></i> {lesson.duration || '00:00'}</span>
                                                                    <span className="text-primary font-bold">+{lesson.points || 100} ነጥብ</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!isUnlocked && (
                                                            <span className="text-[10px] bg-gray-200 dark:bg-slate-800 text-gray-500 px-2 py-0.5 rounded-md font-bold">
                                                                Locked
                                                            </span>
                                                        )}
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
                     <button onClick={() => setCurrentView('classroom')} className="text-xs bg-primary text-dark font-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition shadow-xs">
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
                     <button onClick={() => { if(confirm('የ AI ቻት ታሪክዎን ማጥፋት እርግጠኛ ነዎት?')) { localStorage.removeItem('tsehay-ai-chat'); setChatMessages([{ role: 'system', text: 'ሰላም! እኔ Tsehay AI ነኝ። ምን ልርዳዎት?' }]); } }} className="text-xs bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-bold px-3 py-2 rounded-xl hover:bg-red-100 transition shrink-0">
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
                                 <button 
                                     onClick={() => {
                                         document.dispatchEvent(new CustomEvent('add-to-notes', { detail: { text: m.text } }));
                                         setSavedAiNotes(prev => ({ ...prev, [i]: true }));
                                     }} 
                                     className={`mt-2 text-[11px] font-black px-3 py-1 rounded-lg border flex items-center gap-1.5 transition-all shadow-xs ${
                                         savedAiNotes[i]
                                             ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                             : 'bg-amber-400/20 hover:bg-amber-400 dark:bg-amber-500/20 dark:hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-dark border-amber-400/40'
                                     }`}
                                 >
                                     <i className={`fa-solid ${savedAiNotes[i] ? 'fa-circle-check text-emerald-600 dark:text-emerald-400' : 'fa-bookmark text-[10px]'}`}></i> 
                                     <span>{savedAiNotes[i] ? '✓ ወደ ማስታወሻ ተመዝግቧል' : 'ወደ ማስታወሻ አድ አድርግ'}</span>
                                 </button>
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
      <CourseRatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        courseId={activeCourse?.id || ''}
        courseTitle={activeCourse?.title || ''}
        user={user}
      />
    </div>
  );
}
